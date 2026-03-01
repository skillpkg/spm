// ── Fix Suggestions per Security Category ──

interface Suggestion {
  why: string;
  fix: string;
}

const SUGGESTIONS: Record<string, Suggestion> = {
  instruction_override: {
    why: 'This content contains phrases that attempt to override or replace the AI system prompt. Skills must not try to manipulate the underlying AI behavior.',
    fix: 'Remove any language that tells the AI to ignore, forget, or replace its instructions. Instead, provide clear task-specific guidance within the skill scope.',
  },
  data_exfiltration: {
    why: 'This content contains phrases that attempt to extract sensitive data such as credentials, system prompts, or private files.',
    fix: 'Remove any instructions that read sensitive files, extract system prompts, or ask users for credentials. Skills should only access data explicitly provided by the user.',
  },
  behavioral_manipulation: {
    why: 'This content attempts to bypass safety checks or manipulate the AI into ignoring its guidelines.',
    fix: 'Remove any instructions that tell the AI to skip safety checks, never refuse requests, or disable logging. Skills must operate within the AI safety framework.',
  },
  deceptive_behavior: {
    why: 'This content instructs the AI to act secretly or hide its actions from the user.',
    fix: 'Remove any instructions that tell the AI to act silently or conceal behavior from the user. All skill actions should be transparent.',
  },
  hidden_content: {
    why: 'This content contains hidden characters or tags that could be used to inject invisible instructions.',
    fix: 'Remove zero-width characters, unicode bidi overrides, and suspicious HTML/markdown tags. All skill content should be plain, visible text.',
  },
};

const FALLBACK_SUGGESTION: Suggestion = {
  why: 'This content triggered a security pattern match.',
  fix: 'Review the flagged content and remove any language that could be used to manipulate AI behavior.',
};

/**
 * Return a human-readable explanation and fix for a given security category.
 */
export const getSuggestion = (category: string): Suggestion => {
  return SUGGESTIONS[category] ?? FALLBACK_SUGGESTION;
};
