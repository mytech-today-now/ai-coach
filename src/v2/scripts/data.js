/**
 * Core site copy and demo data.
 */

export const siteConfig = {
  brand: 'Kyle Rode',
  role: 'AI Coding Coach / Programming Mentor',
  monthlyPrice: 1000,
  entryPrice: 500,
  responseWindowHours: 24,
  liveSessionsPerMonth: 2,
  liveSessionMinutes: 60,
  setupMinutes: 30,
  emailRecipient: 'hello@mytech.today',
  blogUrl: 'https://mytech.today',
  githubOrgUrl: 'https://github.com/mytech-today-now',
  filmbuffUrl: 'https://github.com/mytech-today-now/filmbuff',
  aiTokenGuardianUrl: 'https://github.com/mytech-today-now/ai-powered',
  npmSearchUrl: 'https://www.npmjs.com/search?q=%40mytechtoday',
  preferredTools: ['Cursor', 'Claude', 'Ollama', 'PowerShell'],
  tagline: 'Guidance that makes you more self-reliant, not more dependent.',
};

export const navigationPages = [
  { id: 'home', label: 'Home', href: './index.html', description: 'Hero, proof, and CTA.' },
  { id: 'services', label: 'Services', href: './services.html', description: 'How the mentorship works.' },
  { id: 'about', label: 'About Kyle', href: './about.html', description: 'Background and credibility.' },
  { id: 'pricing', label: 'Pricing', href: './pricing.html', description: 'Monthly tiers and fit.' },
  { id: 'signup', label: 'Signup', href: './signup.html', description: 'Stripe checkout and onboarding.' },
  { id: 'contact', label: 'Contact', href: './contact.html', description: 'Lead form and summary.' },
];

export const quickLinks = [
  { label: 'FilmBuff', href: siteConfig.filmbuffUrl, description: 'Film and screenplay tooling.' },
  { label: 'AI Token Guardian', href: siteConfig.aiTokenGuardianUrl, description: 'AI-first token and workflow tooling.' },
  { label: 'GitHub', href: siteConfig.githubOrgUrl, description: 'Public repos and experiments.' },
];

export const proofPoints = [
  { label: 'Consulting since', value: '2016' },
  { label: 'AI/ML focus since', value: '~2022' },
  { label: 'Async response target', value: '24 hours' },
  { label: 'Setup session', value: '30 minutes' },
  { label: 'Live cadence', value: '2 x 60 min / month' },
  { label: 'Background', value: 'NYU Tisch' },
];

export const heroHighlights = [
  {
    title: 'Two live sessions, every month',
    description: 'Two 60-minute live screen-share sessions each month keep the work grounded in your real codebase instead of hypothetical examples.',
  },
  {
    title: 'Unlimited async messaging',
    description: 'Between calls, you can send questions through your preferred tool and expect a response within 24 hours on business days.',
  },
  {
    title: 'Complimentary setup session',
    description: 'A 30-minute setup session gets your editor, model, repo access, and first goals aligned before the monthly rhythm starts.',
  },
  {
    title: 'Empowerment first',
    description: 'I guide, coach, and debug with you. I do not code for clients or create dependency loops, so you stay in control of the craft.',
  },
  {
    title: 'Session recaps and next steps',
    description: 'Every live call ends with a written summary, clear action items, and the next checkpoint so momentum carries forward.',
  },
  {
    title: 'Tooling aligned to your stack',
    description: 'We work with Cursor, Claude, Ollama, PowerShell, and the exact tools you already use so the coaching fits your environment.',
  },
];

export const careerSnapshots = [
  {
    title: '25+ years across software and IT',
    description:
      'Kyle has worked through enterprise software, testing, systems administration, and consulting long enough to know what actually holds up in production.',
  },
  {
    title: 'myTech.Today since 2016',
    description:
      'He has run myTech.Today as an MSP and consulting practice in Chicagoland, delivering AI apps, automation, security, and custom development for real clients.',
  },
  {
    title: 'Enterprise systems background',
    description:
      'Earlier work touched ERP, EDI, SQL Server, C#, Active Directory, backup and recovery, and acquisition data migrations.',
  },
  {
    title: 'Creative production roots',
    description:
      'Sony Computer Entertainment, Three Space Imagery, and game production work shaped the product judgment and communication side of the coaching.',
  },
  {
    title: 'Public trail on LinkedIn, GitHub, and npm',
    description:
      'The resume links point to a public footprint that includes senior IT history, open-source tools, and reusable packages for AI workflows.',
  },
  {
    title: 'AI-first work since around 2022',
    description:
      'Recent work focuses on Claude, MCP servers, agentic frameworks, local workflows, and tooling that makes AI useful instead of theatrical.',
  },
];

export const processSteps = [
  {
    title: 'Intake and goal gate',
    description: 'We define the exact outcome, success criteria, and the smallest useful next step before touching code.',
  },
  {
    title: 'Setup and baseline',
    description: 'We tune Cursor, Claude, Ollama, or your preferred stack so the workflow is reliable and repeatable.',
  },
  {
    title: 'Live screen-share coaching',
    description: 'We work through your real codebase together while I guide debugging, decisions, and tool use.',
  },
  {
    title: 'Summary and follow-through',
    description: 'Each call ends with a recap, action items, and a crisp handoff so the next 24 hours stay focused.',
  },
  {
    title: 'Between-session execution',
    description: 'You apply the plan while I answer questions asynchronously and keep the momentum from stalling out.',
  },
  {
    title: 'Review and refine',
    description: 'We revisit the pattern, trim what felt noisy, and adjust the workflow so the next session starts stronger.',
  },
];

export const differentiators = [
  {
    title: 'Fixed monthly rhythm',
    description: 'A subscription keeps momentum stable and avoids the stop-start feel of marketplace mentoring.',
  },
  {
    title: 'Teach the tooling, not dependency',
    description: 'You learn how to steer AI assistants instead of outsourcing your engineering judgment.',
  },
  {
    title: 'Real-world AI-first practice',
    description: 'The coaching is grounded in local setups, prompt strategy, cost reduction, and shipping actual work.',
  },
  {
    title: 'Structured outcomes',
    description: 'Every session uses agreed goals, success gates, and a clean summary so progress is visible and repeatable.',
  },
  {
    title: 'Built for remote collaboration',
    description: 'Screen-sharing, timezone awareness, and async notes make it easy to work together without overlap or drift.',
  },
  {
    title: 'Stack-aware coaching',
    description: 'The guidance adapts to your editor, model provider, repo rules, and security constraints instead of forcing one workflow.',
  },
];

export const comparisonRows = [
  {
    label: 'Pricing model',
    kyle: 'Fixed monthly mentorship with clear tiers',
    marketplaces: 'Variable per-call pricing',
    cruise: 'Subscription, often lighter touch',
  },
  {
    label: 'Live session depth',
    kyle: '60-minute screen-share sessions built around your actual codebase',
    marketplaces: 'Short, on-demand calls are common',
    cruise: 'Often lighter cadence or broader advice',
  },
  {
    label: 'Async support',
    kyle: 'Unlimited messaging with a 24-hour response target',
    marketplaces: 'Depends on the provider',
    cruise: 'Usually bounded or less central',
  },
  {
    label: 'AI tooling focus',
    kyle: 'Cursor, Claude, Ollama, PowerShell, local workflows',
    marketplaces: 'Broad but inconsistent',
    cruise: 'Broader mentoring, less tool-specific',
  },
  {
    label: 'Outcome philosophy',
    kyle: 'Empowerment and self-reliance',
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
      'The async notes and live cadence kept me moving. I can now use Cursor and Claude without feeling dependent on anyone.',
  },
  {
    name: 'Senior dev upskilling',
    headline: 'My code review loop got dramatically better.',
    quote:
      'We tightened my feedback process with summaries and success gates. My prompts are cleaner and my decisions are sharper.',
  },
  {
    name: 'Automation tinkerer',
    headline: 'The PowerShell tooling finally clicked.',
    quote:
      'I came in wanting a quick fix. I left with a system I could actually own, plus a better grasp of how to troubleshoot locally.',
  },
  {
    name: 'Solo founder',
    headline: 'My first month felt organized instead of chaotic.',
    quote:
      'The combination of a setup session, async support, and concrete summaries made it easier to move fast without losing the thread.',
  },
  {
    name: 'Engineering manager',
    headline: 'A better way to coach the team through AI adoption.',
    quote:
      'We used the sessions to build a shared workflow rather than just chasing one-off answers. That changed the whole tone of the rollout.',
  },
];

export const faqItems = [
  {
    question: 'Do you write code for clients?',
    answer:
      'No. The coaching is intentionally empowerment-first, so you keep ownership of the work.\n\nI help you frame the task, inspect the code, reason through tradeoffs, and decide what happens next. If you want someone to disappear and ship the feature for you, this is not the right fit.',
  },
  {
    question: 'What tools do you use?',
    answer:
      'Usually the workflow includes Cursor, Claude, Ollama, and PowerShell, but the stack is flexible.\n\nIf you already have a preferred editor, model provider, or internal workflow, we can build around that instead of forcing a reset.',
  },
  {
    question: 'How fast do async replies happen?',
    answer:
      'The target is within 24 hours on business days.\n\nThat keeps momentum moving without turning the mentorship into a constant interruption stream, and it gives you a predictable window for follow-up questions.',
  },
  {
    question: 'Is this only for beginners?',
    answer:
      'No. A lot of the best fits are experienced developers, solo founders, or builders who already ship but want a sharper AI workflow.\n\nThe value is in making your existing process faster and more reliable, not starting from zero.',
  },
  {
    question: 'What happens after the setup session?',
    answer:
      'We align the tools, confirm access, define success gates, and choose the first live-session target.\n\nBy the end of the setup call you should know exactly what to do next and what evidence will tell us the approach is working.',
  },
  {
    question: 'Can I record the session?',
    answer:
      'Yes, if you want a recording or notes for your own reference.\n\nThe important part is that you leave with a clear summary and action list, whether you capture it yourself or not.',
  },
  {
    question: 'How do I choose between the two tiers?',
    answer:
      'Pick Momentum if you want a steady monthly cadence and one focused live session.\n\nChoose Deep Mentorship if you have a larger project, multiple moving parts, or you want more room for iterative debugging and review.',
  },
  {
    question: 'What kinds of problems are a good fit?',
    answer:
      'Prompt strategy, local model setup, debugging, automation, code review loops, and tooling decisions are all strong fits.\n\nIf the problem is about improving how you build rather than outsourcing the build, it is probably a fit.',
  },
  {
    question: 'What is not included?',
    answer:
      'Done-for-you development, open-ended agency-style delivery, and hands-off project management are not the offer.\n\nThe work is collaborative, practical, and aimed at making you more capable rather than more dependent.',
  },
  {
    question: 'How do scheduling and billing work?',
    answer:
      'It is a monthly mentorship cadence, so we pick a rhythm that matches your timezone and project pressure.\n\nIf the shape of the work changes, we can revisit the tier before the next cycle so the model stays aligned.',
  },
];

export const resources = [
  {
    title: 'myTech.Today blog',
    description: 'Practical AI coding guides, local setup notes, and cost-conscious workflow ideas.',
    href: siteConfig.blogUrl,
    meta: 'Publishing hub',
  },
  {
    title: 'GitHub: mytech-today-now',
    description: 'Public repos, PowerShell tools, augment-extensions, and real-world automation work.',
    href: siteConfig.githubOrgUrl,
    meta: 'Code and tooling',
  },
  {
    title: 'npm profile',
    description: 'Reusable packages and utilities that support fast, opinionated developer workflows.',
    href: siteConfig.npmSearchUrl,
    meta: 'Library publishing',
  },
  {
    title: 'FilmBuff',
    description: 'A neighboring project focused on creative tooling and structured production workflows.',
    href: siteConfig.filmbuffUrl,
    meta: 'Adjacent product',
  },
  {
    title: 'AI Token Guardian',
    description: 'A companion repo for token tracking, AI workflow discipline, and practical automation experiments.',
    href: siteConfig.aiTokenGuardianUrl,
    meta: 'Workflow tooling',
  },
];

export const credibilityCards = [
  {
    title: 'Owner of myTech.Today',
    description: 'Providing IT consulting since 2016, with a strong AI/ML focus since around 2022.',
    meta: 'Track record',
  },
  {
    title: 'GitHub: mytech-today-now',
    description: 'Home to augment-extensions, PowerShell helpers, and practical automation experiments.',
    meta: 'Public code',
  },
  {
    title: 'Practical AI blog',
    description: 'Writing about local setups, prompt strategy, cost reduction, and shipping with AI tools.',
    meta: 'Public writing',
  },
  {
    title: 'npm packages',
    description: 'Packaging reusable tools from real workflows instead of shipping AI theater.',
    meta: 'Distribution',
  },
  {
    title: 'NYU Tisch background',
    description: 'A creative and technical foundation that helps me coach both product taste and engineering craft.',
    meta: 'Perspective',
  },
  {
    title: 'AI-first development',
    description: 'Hands-on practice with local models, structured prompts, and real codebases.',
    meta: 'Execution',
  },
  {
    title: 'Session summaries',
    description: 'Every call ends with a recap so the next step is concrete instead of fuzzy.',
    meta: 'Momentum',
  },
  {
    title: 'Fit boundaries',
    description: 'The model is explicit about what it includes and what it does not, so expectations stay healthy.',
    meta: 'Clarity',
  },
];

export const pricingTiers = [
  {
    name: 'Momentum',
    price: 500,
    eyebrow: 'Lower-touch entry tier',
    description:
      'For builders who want a stable monthly rhythm, one live screen-share session, a 30-minute setup call, async help, and a written recap that keeps the next step concrete.',
    features: [
      '1 x 60-minute live screen-share session each month',
      'Unlimited async messaging with a 24-hour response target',
      'Complimentary 30-minute environment setup session',
      'Session recap and next-step summary',
      'Best for focused projects with a smaller support surface',
    ],
  },
  {
    name: 'Deep Mentorship',
    price: 1000,
    eyebrow: 'Flagship tier',
    description:
      'The full coaching cadence with two live sessions, a setup call, async support, and more room for iterative debugging, decision-making, and workflow mastery.',
    features: [
      '2 x 60-minute live screen-share sessions each month',
      'Unlimited async messaging with a 24-hour response target',
      'Complimentary 30-minute environment setup session',
      'Agreed goals, success gates, and structured summaries',
      'Best for larger projects, ongoing debugging, and AI workflow mastery',
    ],
  },
];

export const pricingNotes = [
  'I do not code for clients. You get coaching, debugging help, decision support, and a workflow that keeps you in control.',
  'Additional sessions can be added at discretion when the project needs more live time or more iterative review.',
  'The complimentary setup session covers access, environment, and the first workflow alignment pass.',
  'You will know what happens in the live calls, what belongs in async messages, and how the next action gets documented.',
  'If the project grows or shrinks, we can revisit the tier before the next monthly cycle.',
  'Clients handle their own notes and recordings if they want a permanent record.',
];

export const contactPrompts = [
  'What are you building right now?',
  'Where does the workflow feel stuck?',
  'Which AI tools do you want to use more effectively?',
  'What would success look like in 30 days?',
  'Which repo, app, or workflow should we look at first?',
  'Do you need help with prompts, local models, automation, or code review?',
];
