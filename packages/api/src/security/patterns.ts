// ── Layer 1: Regex Pattern Library ──
// Patterns from plan/spm-content-security.md

export interface SecurityPattern {
  regex: RegExp;
  category: string;
  severity: 'block' | 'warn';
  name: string;
}

// ── Category 1: Instruction Override ──

const instructionOverridePatterns: SecurityPattern[] = [
  {
    regex:
      /ignore\s+(all\s+)?(previous|prior|above|system|other)\s+(instructions|rules|guidelines|prompts|constraints)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'ignore_instructions',
  },
  {
    regex:
      /forget\s+(all\s+)?(previous|prior|above|everything|your)\s+(instructions|rules|context|training|guidelines)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'forget_instructions',
  },
  {
    regex:
      /disregard\s+(all\s+)?(previous|prior|above|safety|system|other)\s+(instructions|rules|guidelines|prompts)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'disregard_instructions',
  },
  {
    regex:
      /override\s+(all\s+)?(safety|security|system|content|previous)\s+(rules|guidelines|filters|restrictions|policies)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'override_rules',
  },
  {
    regex:
      /do\s+not\s+follow\s+(any|the|your)\s+(previous|other|safety|system|prior)\s+(instructions|rules|guidelines)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'do_not_follow',
  },
  {
    regex: /you\s+are\s+no\s+longer\s+(claude|an?\s+ai|an?\s+assistant)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'identity_override',
  },
  {
    regex: /enter\s+(developer|admin|debug|unrestricted|jailbreak)\s+mode/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'enter_mode',
  },
  {
    regex: /new\s+system\s+prompt/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'new_system_prompt',
  },
  {
    regex: /replace\s+(your|the)\s+system\s+prompt/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'replace_system_prompt',
  },
  {
    regex: /as\s+(your|an?)\s+(developer|creator|admin|administrator|owner|anthropic\s+employee)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'impersonate_authority',
  },
  {
    regex: /i\s+am\s+(your|a|an)\s+(developer|creator|admin|owner|anthropic)/i,
    category: 'instruction_override',
    severity: 'block',
    name: 'claim_authority',
  },
];

// ── Category 2: Data Exfiltration ──

const dataExfiltrationPatterns: SecurityPattern[] = [
  {
    regex:
      /(send|transmit|upload|post|exfiltrate|forward|relay)\s+.{0,30}(user|personal|private|sensitive)\s+(data|info|details|credentials)/i,
    category: 'data_exfiltration',
    severity: 'block',
    name: 'send_user_data',
  },
  {
    regex:
      /read\s+(the\s+)?(contents?\s+of\s+)?(\/etc\/passwd|\/etc\/shadow|~\/.ssh|~\/.aws|~\/.env|\.env|credentials|secrets)/i,
    category: 'data_exfiltration',
    severity: 'block',
    name: 'read_sensitive_files',
  },
  {
    regex:
      /(extract|reveal|show|display|output|leak|expose)\s+(the\s+)?(system\s+prompt|system\s+instructions|hidden\s+instructions|internal\s+instructions|full\s+prompt)/i,
    category: 'data_exfiltration',
    severity: 'block',
    name: 'extract_system_prompt',
  },
  {
    regex:
      /ask\s+(the\s+)?(user|person|them)\s+(for|to\s+provide|to\s+enter|to\s+share)\s+(their\s+)?(password|api\s+key|token|secret|credential)/i,
    category: 'data_exfiltration',
    severity: 'block',
    name: 'phish_credentials',
  },
];

// ── Category 3: Behavioral Manipulation ──

const behavioralManipulationPatterns: SecurityPattern[] = [
  {
    regex:
      /(skip|bypass|ignore|disable|turn\s+off|circumvent)\s+(all\s+)?(safety|content|ethical|security)\s+(checks?|filters?|guidelines?|restrictions?|policies|rules|guardrails?)/i,
    category: 'behavioral_manipulation',
    severity: 'block',
    name: 'bypass_safety',
  },
  {
    regex:
      /never\s+(question|refuse|decline|reject|challenge)\s+(the\s+)?(user|person|any\s+request)/i,
    category: 'behavioral_manipulation',
    severity: 'block',
    name: 'never_refuse',
  },
  {
    regex:
      /(do\s+)?not\s+(log|record|report|save|store|track|monitor)\s+(this|any|the)\s+(conversation|interaction|request|activity)/i,
    category: 'behavioral_manipulation',
    severity: 'block',
    name: 'disable_logging',
  },
];

// ── Category 4: Deceptive Behavior ──

const deceptiveBehaviorPatterns: SecurityPattern[] = [
  {
    regex:
      /(silently|quietly|secretly|covertly|without\s+(telling|informing|notifying)\s+(the\s+)?(user|person|anyone))/i,
    category: 'deceptive_behavior',
    severity: 'block',
    name: 'hidden_instructions',
  },
  {
    regex:
      /do\s+not\s+(tell|show|reveal|mention|let\s+the\s+user\s+know)\s+(the\s+user\s+)?(about\s+)?(this|these)\s+(instruction|step|action|behavior)/i,
    category: 'deceptive_behavior',
    severity: 'warn',
    name: 'deceptive_concealment',
  },
];

// ── Category 5: Hidden Content ──

const hiddenContentPatterns: SecurityPattern[] = [
  {
    // 3+ zero-width characters in sequence
    regex: /[\u200B\u200C\u200D\uFEFF]{3,}/, // eslint-disable-line no-misleading-character-class
    category: 'hidden_content',
    severity: 'block',
    name: 'zero_width_chars',
  },
  {
    // Unicode bidi overrides
    regex: /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/,
    category: 'hidden_content',
    severity: 'block',
    name: 'bidi_override',
  },
  {
    // Suspicious tag injection
    regex:
      /<\s*(system|prompt|instruction|anthropic|claude|admin|root|override|secret|hidden)[^>]*>/i,
    category: 'hidden_content',
    severity: 'block',
    name: 'tag_injection',
  },
  {
    // HTML comments with suspicious content
    regex: /<!--[\s\S]*?(system|prompt|instruction|ignore|override|secret|hidden)[\s\S]*?-->/i,
    category: 'hidden_content',
    severity: 'block',
    name: 'suspicious_html_comment',
  },
  {
    // Markdown hidden comments with suspicious content
    regex:
      /\[\/\/\]:\s*#\s*\([\s\S]*?(system|prompt|instruction|ignore|override|secret|hidden)[\s\S]*?\)/i,
    category: 'hidden_content',
    severity: 'block',
    name: 'suspicious_markdown_comment',
  },
];

export const ALL_PATTERNS: SecurityPattern[] = [
  ...instructionOverridePatterns,
  ...dataExfiltrationPatterns,
  ...behavioralManipulationPatterns,
  ...deceptiveBehaviorPatterns,
  ...hiddenContentPatterns,
];

export const PATTERNS_BY_CATEGORY: Record<string, SecurityPattern[]> = {
  instruction_override: instructionOverridePatterns,
  data_exfiltration: dataExfiltrationPatterns,
  behavioral_manipulation: behavioralManipulationPatterns,
  deceptive_behavior: deceptiveBehaviorPatterns,
  hidden_content: hiddenContentPatterns,
};
