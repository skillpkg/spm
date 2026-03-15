export interface DocItem {
  label: string;
  slug: string;
  desc: string;
}

export interface DocSection {
  title: string;
  items: DocItem[];
}

export const docSections: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        label: 'What is SPM?',
        slug: 'what-is-spm',
        desc: 'An overview of the Skills Package Manager and how it works with AI agents.',
      },
      {
        label: 'Installation',
        slug: 'installation',
        desc: 'Install the CLI globally and configure your environment.',
      },
      {
        label: 'Your first skill',
        slug: 'your-first-skill',
        desc: 'Create, test, and publish a skill in under 5 minutes.',
      },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      {
        label: 'Skills',
        slug: 'skills',
        desc: "What skills are, how they're structured, and the SKILL.md manifest format.",
      },
      {
        label: 'Trust tiers',
        slug: 'trust-tiers',
        desc: 'How the trust system works — from unverified to official.',
      },
      {
        label: 'Content security',
        slug: 'content-security',
        desc: 'The 3-layer scanning pipeline that protects the registry.',
      },
      { label: 'Categories', slug: 'categories', desc: 'Browse and organize skills by category.' },
    ],
  },
  {
    title: 'Guides',
    items: [
      {
        label: 'Installing skills',
        slug: 'installing-skills',
        desc: 'Install skills globally or per-project, pin versions, and manage dependencies.',
      },
      {
        label: 'Authoring best practices',
        slug: 'authoring-best-practices',
        desc: 'Write skills that are secure, discoverable, and well-documented.',
      },
      {
        label: 'Agent integration',
        slug: 'agent-integration',
        desc: 'How agents discover and use skills from the registry.',
      },
    ],
  },
];

/** Lookup slug → label for breadcrumbs */
export const docSlugToLabel: Record<string, string> = Object.fromEntries(
  docSections.flatMap((s) => s.items.map((i) => [i.slug, i.label])),
);
