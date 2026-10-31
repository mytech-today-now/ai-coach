import { buildPosterSvg } from './utils.js';

/**
 * Core site data, messaging, and demo media assets.
 * Keeping the copy in a separate module makes future edits,
 * localization, and content experiments much easier.
 */

export const siteConfig = {
  brand: 'Kyle Rode',
  role: 'AI Coding Coach',
  monthlyPrice: 1000,
  responseWindowHours: 24,
  liveSessionsPerMonth: 2,
  liveSessionMinutes: 60,
  setupMinutes: 30,
  emailRecipient: 'hello@mytech.today',
  preferredTools: ['Cursor', 'Claude', 'Ollama', 'PowerShell'],
};

export const navigationPages = [
  { id: 'home', label: 'Home', shortLabel: 'Home', description: 'Hero, proof, and primary CTA.' },
  { id: 'services', label: 'Services', shortLabel: 'Services', description: 'How the mentorship works.' },
  { id: 'studio', label: 'Studio', shortLabel: 'Studio', description: 'Media library, playlists, slideshows.' },
  { id: 'pricing', label: 'Pricing', shortLabel: 'Pricing', description: 'Monthly offer and value stack.' },
  { id: 'apply', label: 'Apply', shortLabel: 'Apply', description: 'Form, resources, and FAQ.' },
];

export const heroBullets = [
  'Twice-monthly 1-hour live screen-share sessions',
  'Unlimited async messaging with a 24h turnaround',
  'Complimentary 30-minute setup session',
  'AI-tool mastery for self-reliant developers',
];

export const proofPoints = [
  { label: 'Owner', value: 'myTech.Today' },
  { label: 'GitHub', value: 'mytech-today-now' },
  { label: 'Blog', value: 'mytech.today' },
  { label: 'Background', value: 'NYU Tisch' },
];

export const processSteps = [
  {
    title: 'Goal Gate',
    description:
      'We define the outcome first, then set success gates so every session ends with a concrete next move.',
  },
  {
    title: 'Environment Setup',
    description:
      'We tune the workflow in Cursor, Claude, Ollama, or your preferred stack so the toolchain feels trustworthy.',
  },
  {
    title: 'Live Screen-Share',
    description:
      'We work through your real codebase together while I coach, unblock, and teach the decision-making process.',
  },
  {
    title: 'Async Follow-Through',
    description:
      'You leave with a summary, checkpoints, and a clear path for the next 24 hours of focused progress.',
  },
];

export const differentiators = [
  {
    title: 'Monthly rhythm, not random tickets',
    description:
      'A fixed subscription keeps momentum high and reduces the stop-start churn of ad hoc mentoring marketplaces.',
  },
  {
    title: 'Teach the tooling, not dependency',
    description:
      'The goal is self-sufficiency: you learn how to use AI assistants, not how to outsource your craft.',
  },
  {
    title: 'Deep AI workflow literacy',
    description:
      'We cover prompts, context management, code review, local models, automation, and human-in-the-loop judgment.',
  },
  {
    title: 'Session summaries that stick',
    description:
      'Every live session ends with recap notes, action items, and success gates so progress survives the calendar.',
  },
];

export const comparisonRows = [
  {
    label: 'Pricing model',
    kyle: 'Flat $1,000/month subscription',
    marketplaces: 'Variable per-call pricing',
    cruise: 'Subscription, often lighter touch',
  },
  {
    label: 'Live format',
    kyle: 'Two 60-minute deep sessions',
    marketplaces: 'Often shorter, on-demand calls',
    cruise: 'Usually one-off calls or lighter cadence',
  },
  {
    label: 'Async support',
    kyle: 'Unlimited messaging with 24h turnaround',
    marketplaces: 'Depends on the provider',
    cruise: 'Usually bounded by the mentor',
  },
  {
    label: 'AI mastery focus',
    kyle: 'Cursor, Claude, Ollama, PowerShell, local workflows',
    marketplaces: 'Broad but uneven',
    cruise: 'Broader mentoring, less AI-tool specific',
  },
  {
    label: 'Outcome philosophy',
    kyle: 'Empower you to work independently',
    marketplaces: 'Solve the immediate issue',
    cruise: 'Guide and advise',
  },
];

export const testimonials = [
  {
    name: 'Remote product engineer',
    headline: 'Went from confused to shipping confidently.',
    quote:
      'Kyle helped me turn AI from a novelty into a repeatable workflow. The goal gates made every session feel immediately useful.',
  },
  {
    name: 'Indie hacker',
    headline: 'I stopped guessing and started iterating.',
    quote:
      'The async notes and the live screen-share cadence kept me moving. I can now use Cursor and Claude without feeling dependent on anyone.',
  },
  {
    name: 'Senior dev upskilling',
    headline: 'My code review loop got dramatically better.',
    quote:
      'We used the session summaries and review gates to tighten my feedback process. My AI prompts are cleaner and my decisions are sharper.',
  },
  {
    name: 'Automation tinkerer',
    headline: 'The PowerShell tooling finally clicked.',
    quote:
      'I came in wanting a quick fix. I left with a system I could actually own, plus a better grasp of how to troubleshoot locally.',
  },
];

export const faqItems = [
  {
    question: 'Do you write code for clients?',
    answer:
      'No. The coaching model is intentionally empowerment-first. I guide, teach, and review so you become more self-reliant with AI tools.',
  },
  {
    question: 'What tools do you use?',
    answer:
      'The usual workflow includes Cursor, Claude, Ollama, PowerShell, and whatever else best fits your environment and goals.',
  },
  {
    question: 'How fast do async replies happen?',
    answer:
      'The expectation is within 24 hours on business days, so the mentorship stays responsive without becoming a full-time support channel.',
  },
  {
    question: 'Is this only for beginners?',
    answer:
      'No. The sweet spot is developers and builders who already ship, but want a better AI workflow, better structure, and better habits.',
  },
  {
    question: 'What happens after the setup session?',
    answer:
      'We use the setup call to align on goals, access, tooling, and success gates so the live sessions are focused and practical.',
  },
];

export const resources = [
  {
    title: 'myTech.Today blog',
    description: 'Build notes, experiments, and coaching ideas from the broader ecosystem.',
    href: 'https://mytech.today',
    meta: 'Publishing hub',
  },
  {
    title: 'GitHub: mytech-today-now',
    description: 'The repo home for augment-extensions, PowerShell tools, and related workflows.',
    href: 'https://github.com/mytech-today-now',
    meta: 'Code and tooling',
  },
  {
    title: 'npm packages',
    description: 'Reusable utilities and packages that support fast, opinionated developer workflows.',
    href: 'https://www.npmjs.com',
    meta: 'Library publishing',
  },
];

export const pricingFeatures = [
  '2 x 60-minute live screen-share sessions each month',
  'Unlimited async messaging with a 24-hour response window',
  'A 30-minute setup session at no extra cost',
  'Post-session summary notes and next-step gates',
  'AI workflow coaching focused on self-reliance',
];

export const studioModes = [
  { id: 'sequence', label: 'Sequence' },
  { id: 'loop', label: 'Loop' },
  { id: 'shuffle', label: 'Shuffle' },
  { id: 'story', label: 'Story' },
];

export const blendModes = [
  { id: 'normal', label: 'Normal' },
  { id: 'soft-light', label: 'Soft light' },
  { id: 'screen', label: 'Screen' },
  { id: 'multiply', label: 'Multiply' },
];

export const themeModes = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Build the default demo media library.
 * Every item uses an SVG poster so the demo remains fast,
 * offline-friendly, and visually polished without extra assets.
 * @returns {Array<object>}
 */
export function buildDemoLibrary() {
  const items = [
    {
      title: 'Goal Gate',
      subtitle: 'Define success before you write code.',
      accent: '#16a34a',
      accent2: '#0ea5e9',
      category: 'Mentorship',
      description: 'A visual reminder that clarity is the fastest productivity multiplier.',
      tags: ['goal-setting', 'planning', 'focus'],
      chapters: [
        { label: 'Intake', note: 'What are we trying to change?' },
        { label: 'Success gate', note: 'How will we know it worked?' },
        { label: 'Next action', note: 'What is the smallest useful step?' },
      ],
    },
    {
      title: 'Cursor Workflow',
      subtitle: 'Use AI as a partner, not a crutch.',
      accent: '#0ea5e9',
      accent2: '#14b8a6',
      category: 'Tools',
      description: 'A focused workflow for prompts, context, and code edits in Cursor.',
      tags: ['cursor', 'prompts', 'iterations'],
      chapters: [
        { label: 'Prompt', note: 'Shape the task with precision.' },
        { label: 'Inspect', note: 'Review suggestions before merging.' },
        { label: 'Refine', note: 'Close the loop with human judgment.' },
      ],
    },
    {
      title: 'Claude Review Loop',
      subtitle: 'Review like a senior engineer with better feedback.',
      accent: '#14b8a6',
      accent2: '#6366f1',
      category: 'Review',
      description: 'Structured review gates to help you critique output before it lands.',
      tags: ['review', 'quality', 'feedback'],
      chapters: [
        { label: 'Scan', note: 'Read for intent and fit.' },
        { label: 'Question', note: 'Ask what the model may have missed.' },
        { label: 'Ship', note: 'Merge only after the gate is satisfied.' },
      ],
    },
    {
      title: 'Ollama Lab',
      subtitle: 'Experiment locally without giving up control.',
      accent: '#22c55e',
      accent2: '#0284c7',
      category: 'Local models',
      description: 'A privacy-conscious setup for offline experimentation and model comparison.',
      tags: ['ollama', 'offline', 'privacy'],
      chapters: [
        { label: 'Model', note: 'Choose the right model for the job.' },
        { label: 'Hardware', note: 'Keep the loop lightweight and reliable.' },
        { label: 'Fallback', note: 'Know how to degrade gracefully.' },
      ],
    },
    {
      title: 'PowerShell Automation',
      subtitle: 'Small scripts that save big chunks of time.',
      accent: '#0891b2',
      accent2: '#0f766e',
      category: 'Automation',
      description: 'Repeatable tooling for daily chores, checks, and workspace orchestration.',
      tags: ['powershell', 'automation', 'scripts'],
      chapters: [
        { label: 'Task', note: 'What should happen automatically?' },
        { label: 'Pipeline', note: 'Compose reliable steps.' },
        { label: 'Audit', note: 'Make the output easy to inspect.' },
      ],
    },
    {
      title: 'Session Summary',
      subtitle: 'Every call ends with a next step.',
      accent: '#8b5cf6',
      accent2: '#0ea5e9',
      category: 'Process',
      description: 'A recap card that keeps momentum alive between live sessions.',
      tags: ['summary', 'accountability', 'follow-up'],
      chapters: [
        { label: 'Recap', note: 'What changed this session?' },
        { label: 'Gates', note: 'What must be true next?' },
        { label: 'Follow-up', note: 'What happens in the next 24 hours?' },
      ],
    },
  ];

  return items.map((item, index) => {
    const poster = buildPosterSvg({
      title: item.title,
      subtitle: item.subtitle,
      accent: item.accent,
      accent2: item.accent2,
      badge: item.category.toUpperCase(),
      seed: `${index}-${item.title}`,
    });

    return {
      id: `demo_${index + 1}_${item.title.toLowerCase().replaceAll(/\s+/g, '_')}`,
      kind: 'image',
      title: item.title,
      subtitle: item.subtitle,
      category: item.category,
      description: item.description,
      tags: item.tags,
      chapters: item.chapters.map((chapter, chapterIndex) => ({
        id: `chapter_${index}_${chapterIndex}`,
        label: chapter.label,
        note: chapter.note,
        start: chapterIndex * 12,
      })),
      duration: 9 + index,
      sourceUrl: poster,
      thumbnailUrl: poster,
      posterUrl: poster,
      accent: item.accent,
      accent2: item.accent2,
      createdAt: new Date(Date.now() - (items.length - index) * 86400000).toISOString(),
      demo: true,
      playbackHint: 'slideshow',
    };
  });
}

