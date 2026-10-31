import { clamp, loadImage, prefersReducedMotion } from './utils.js';

/**
 * Lightweight Ken Burns renderer with WebGL and Canvas 2D paths.
 * The renderer only concerns itself with image presentation and
 * transition blending. Playback timing lives in the studio controller.
 */

function hashToUnit(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || 'Shader compilation failed');
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WebGL program');
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || 'Program link failed');
  }
  return program;
}

/**
 * @typedef {object} RendererSlide
 * @property {string} id
 * @property {string} title
 * @property {string} sourceUrl
 * @property {HTMLImageElement} [image]
 * @property {number} [duration]
 */

export class KenBurnsRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [options]
   * @param {ReturnType<import('./logger.js').createLogger>} [options.logger]
   * @param {boolean} [options.reducedMotion]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.logger = options.logger ?? null;
    this.reducedMotion = options.reducedMotion ?? prefersReducedMotion();
    this.mode = '2d';
    this.currentSlide = null;
    this.nextSlide = null;
    this.transitionStart = 0;
    this.transitionDuration = 900;
    this.loopId = 0;
    this.running = false;
    this.devicePixelRatio = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.manualMotion = {
      zoom: 1,
      panX: 0,
      panY: 0,
    };

    this.ctx2d = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    });
    this.gl = null;
    this.glInfo = null;

    if (!this.reducedMotion) {
      this.gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      }) || canvas.getContext('webgl', {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
    }

    if (this.gl) {
      try {
        this.#initWebGl();
        this.mode = 'webgl';
      } catch (error) {
        this.logger?.warn?.('WebGL renderer unavailable, falling back to canvas', error);
        this.gl = null;
      }
    }

    if (!this.gl && !this.ctx2d) {
      this.ctx2d = canvas.getContext('2d');
    }
  }

  /**
   * Resize the output surface.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.devicePixelRatio = dpr;
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    if (this.gl) {
      this.gl.viewport(0, 0, pixelWidth, pixelHeight);
    } else if (this.ctx2d) {
      this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.width = width;
    this.height = height;
  }

  /**
   * Set the active slide without a transition.
   * @param {RendererSlide} slide
   * @returns {Promise<void>}
   */
  async setSlide(slide) {
    this.currentSlide = await this.#prepareSlide(slide);
    this.nextSlide = null;
    this.transitionStart = 0;
    this.#start();
  }

  /**
   * Transition to a new slide with a crossfade.
   * @param {RendererSlide} slide
   * @param {number} [duration=900]
   * @returns {Promise<void>}
   */
  async transitionTo(slide, duration = 900) {
    const nextSlide = await this.#prepareSlide(slide);
    if (!this.currentSlide) {
      this.currentSlide = nextSlide;
      this.nextSlide = null;
      this.transitionStart = 0;
      this.#start();
      return;
    }

    this.nextSlide = nextSlide;
    this.transitionDuration = duration;
    this.transitionStart = performance.now();
    this.#start();
  }

  /**
   * Pause the animation loop.
   */
  pause() {
    this.running = false;
    if (this.loopId) {
      cancelAnimationFrame(this.loopId);
      this.loopId = 0;
    }
  }

  /**
   * Resume rendering.
   */
  resume() {
    if (!this.running) {
      this.running = true;
      this.#start();
    }
  }

  /**
   * Destroy textures and stop the loop.
   */
  destroy() {
    this.pause();
    if (this.gl && this.currentSlide?.texture) {
      this.gl.deleteTexture(this.currentSlide.texture);
    }
    if (this.gl && this.nextSlide?.texture) {
      this.gl.deleteTexture(this.nextSlide.texture);
    }
    this.currentSlide = null;
    this.nextSlide = null;
  }

  /**
   * Override the automatic motion with a user-driven transform.
   * This is used for touch pinch/pan interactions in the studio.
   * @param {{ zoom?: number, panX?: number, panY?: number }} motion
   */
  setManualMotion(motion) {
    this.manualMotion = {
      zoom: clamp(motion.zoom ?? 1, 1, 2.6),
      panX: clamp(motion.panX ?? 0, -0.8, 0.8),
      panY: clamp(motion.panY ?? 0, -0.8, 0.8),
    };
  }

  async #prepareSlide(slide) {
    if (slide.image) {
      return slide;
    }

    const image = await loadImage(slide.sourceUrl);
    const prepared = {
      ...slide,
      image,
      aspect: image.naturalWidth / image.naturalHeight,
    };

    if (this.gl) {
      prepared.texture = this.#createTexture(image);
    }

    return prepared;
  }

  #createTexture(image) {
    if (!this.gl) return null;
    const texture = this.gl.createTexture();
    if (!texture) return null;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    return texture;
  }

  #start() {
    if (this.running) return;
    this.running = true;
    const tick = (now) => {
      if (!this.running) return;
      this.#render(now);
      this.loopId = requestAnimationFrame(tick);
    };
    this.loopId = requestAnimationFrame(tick);
  }

  #render(now) {
    if (!this.currentSlide) return;
    if (this.gl) {
      this.#renderWebGl(now);
    } else if (this.ctx2d) {
      this.#render2d(now);
    }
  }

  #motionFor(slide, now) {
    const seed = `${slide.id}:${slide.title}`;
    const phase = (hashToUnit(seed) * Math.PI * 2) % (Math.PI * 2);
    const speed = 0.00003 + hashToUnit(`${seed}:speed`) * 0.00004;
    const progress = this.reducedMotion ? 0 : (now * speed + phase) % 1;
    const eased = easeInOutCubic(progress);
    const zoom = this.reducedMotion ? 1 : 1.06 + hashToUnit(`${seed}:zoom`) * 0.08;
    const panX = Math.sin(progress * Math.PI * 2) * (0.06 + hashToUnit(`${seed}:panX`) * 0.03);
    const panY = Math.cos(progress * Math.PI * 2 + phase) * (0.06 + hashToUnit(`${seed}:panY`) * 0.03);
    return {
      zoom: (1 + (zoom - 1) * eased) * this.manualMotion.zoom,
      panX: panX + this.manualMotion.panX,
      panY: panY + this.manualMotion.panY,
    };
  }

  #coverCrop(slide, motion = { zoom: 1, panX: 0, panY: 0 }) {
    const canvasAspect = (this.width || 1) / (this.height || 1);
    const imageAspect = slide.aspect || 1;
    let cropW = 1;
    let cropH = 1;

    if (imageAspect > canvasAspect) {
      cropW = canvasAspect / imageAspect;
    } else {
      cropH = imageAspect / canvasAspect;
    }

    cropW /= motion.zoom;
    cropH /= motion.zoom;

    const maxX = 1 - cropW;
    const maxY = 1 - cropH;
    const cropX = clamp(maxX / 2 + motion.panX * maxX / 2, 0, Math.max(0, maxX));
    const cropY = clamp(maxY / 2 + motion.panY * maxY / 2, 0, Math.max(0, maxY));
    return { cropX, cropY, cropW, cropH };
  }

  #render2d(now) {
    const ctx = this.ctx2d;
    if (!ctx || !this.currentSlide?.image) return;
    const width = this.width || this.canvas.clientWidth || 1;
    const height = this.height || this.canvas.clientHeight || 1;
    const currentMotion = this.#motionFor(this.currentSlide, now);
    const currentCrop = this.#coverCrop(this.currentSlide, currentMotion);

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#020817';
    ctx.fillRect(0, 0, width, height);
    this.#drawImageCrop(ctx, this.currentSlide.image, currentCrop, 1);

    if (this.nextSlide?.image) {
      const elapsed = now - this.transitionStart;
      const fade = clamp(elapsed / this.transitionDuration, 0, 1);
      const nextMotion = this.#motionFor(this.nextSlide, now);
      const nextCrop = this.#coverCrop(this.nextSlide, nextMotion);

      ctx.globalAlpha = fade;
      this.#drawImageCrop(ctx, this.nextSlide.image, nextCrop, 1);
      ctx.globalAlpha = 1;

      if (fade >= 1) {
        this.currentSlide = this.nextSlide;
        this.nextSlide = null;
        this.transitionStart = 0;
      }
    }
    ctx.restore();
  }

  #drawImageCrop(ctx, image, crop, alpha = 1) {
    const width = this.width || this.canvas.clientWidth || 1;
    const height = this.height || this.canvas.clientHeight || 1;
    const sx = image.naturalWidth * crop.cropX;
    const sy = image.naturalHeight * crop.cropY;
    const sw = image.naturalWidth * crop.cropW;
    const sh = image.naturalHeight * crop.cropH;

    ctx.globalAlpha = alpha;
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  }

  #renderWebGl(now) {
    const gl = this.gl;
    if (!gl || !this.currentSlide?.image || !this.glInfo) return;
    const width = this.width || this.canvas.clientWidth || 1;
    const height = this.height || this.canvas.clientHeight || 1;
    gl.clearColor(0.02, 0.05, 0.11, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.glInfo.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.glInfo.buffer);
    gl.enableVertexAttribArray(this.glInfo.positionLocation);
    gl.enableVertexAttribArray(this.glInfo.uvLocation);
    gl.vertexAttribPointer(this.glInfo.positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this.glInfo.uvLocation, 2, gl.FLOAT, false, 16, 8);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const drawSlide = (slide, alpha) => {
      if (!slide?.texture) return;
      const motion = this.#motionFor(slide, now);
      const crop = this.#coverCrop(slide, motion);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, slide.texture);
      gl.uniform1i(this.glInfo.textureLocation, 0);
      gl.uniform4f(this.glInfo.cropLocation, crop.cropX, crop.cropY, crop.cropW, crop.cropH);
      gl.uniform1f(this.glInfo.alphaLocation, alpha);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    drawSlide(this.currentSlide, this.nextSlide ? clamp(1 - (now - this.transitionStart) / this.transitionDuration, 0, 1) : 1);
    if (this.nextSlide) {
      const fade = clamp((now - this.transitionStart) / this.transitionDuration, 0, 1);
      drawSlide(this.nextSlide, fade);
      if (fade >= 1) {
        this.currentSlide = this.nextSlide;
        this.nextSlide = null;
        this.transitionStart = 0;
      }
    }
  }

  #initWebGl() {
    const gl = this.gl;
    if (!gl) return;
    const vertexSource = `
      attribute vec2 a_position;
      attribute vec2 a_uv;
      varying vec2 v_uv;
      void main() {
        v_uv = a_uv;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;
    const fragmentSource = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_texture;
      uniform vec4 u_crop;
      uniform float u_alpha;
      void main() {
        vec2 uv = u_crop.xy + v_uv * u_crop.zw;
        vec4 color = texture2D(u_texture, uv);
        gl_FragColor = vec4(color.rgb, color.a * u_alpha);
      }
    `;

    const program = createProgram(gl, vertexSource, fragmentSource);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Unable to create buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    const vertices = new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      -1, 1, 0, 1,
      1, -1, 1, 0,
      1, 1, 1, 1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const uvLocation = gl.getAttribLocation(program, 'a_uv');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const cropLocation = gl.getUniformLocation(program, 'u_crop');
    const alphaLocation = gl.getUniformLocation(program, 'u_alpha');
    if (
      positionLocation < 0 ||
      uvLocation < 0 ||
      !textureLocation ||
      !cropLocation ||
      !alphaLocation
    ) {
      throw new Error('Missing WebGL attribute or uniform locations');
    }

    this.glInfo = {
      program,
      buffer,
      positionLocation,
      uvLocation,
      textureLocation,
      cropLocation,
      alphaLocation,
    };
  }
}
