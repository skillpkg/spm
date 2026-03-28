// Package scanner implements Layer 1 regex-based security scanning for skill content.
// It detects 5 categories of injection: instruction override, data exfiltration,
// behavioral manipulation, deceptive behavior, and hidden content.
package scanner

import (
	"regexp"
	"strings"
)

// Category represents a security pattern category.
type Category string

const (
	InstructionOverride    Category = "instruction_override"
	DataExfiltration       Category = "data_exfiltration"
	BehavioralManipulation Category = "behavioral_manipulation"
	DeceptiveBehavior      Category = "deceptive_behavior"
	HiddenContent          Category = "hidden_content"
)

// Severity indicates whether a finding blocks publish or is just a warning.
type Severity string

const (
	Block Severity = "block"
	Warn  Severity = "warn"
)

// Pattern defines a single security detection rule.
type Pattern struct {
	Regex    *regexp.Regexp
	Category Category
	Severity Severity
	Name     string
	Fix      string
}

// Finding represents a single match from the scanner.
type Finding struct {
	Category    Category
	Severity    Severity
	PatternName string
	Match       string
	File        string
	Line        int
	Context     string
	Fix         string
}

// Result contains the output of a scan operation.
type Result struct {
	Passed   bool
	Findings []Finding
	Blocked  int
	Warnings int
}

// File represents a file to be scanned.
type File struct {
	Name    string
	Content string
}

// AllPatterns returns all security patterns across all categories.
func AllPatterns() []Pattern {
	patterns := make([]Pattern, 0, 64)
	patterns = append(patterns, instructionOverridePatterns()...)
	patterns = append(patterns, dataExfiltrationPatterns()...)
	patterns = append(patterns, behavioralManipulationPatterns()...)
	patterns = append(patterns, deceptiveBehaviorPatterns()...)
	patterns = append(patterns, hiddenContentPatterns()...)
	return patterns
}

// ScanContent scans files against all Layer 1 regex patterns.
// Returns findings with line numbers, match context, and severity.
func ScanContent(files []File) *Result {
	return ScanContentWithPatterns(files, AllPatterns())
}

// ScanContentWithPatterns scans files against a custom set of patterns.
func ScanContentWithPatterns(files []File, patterns []Pattern) *Result {
	findings := make([]Finding, 0)

	for _, file := range files {
		lines := strings.Split(file.Content, "\n")

		for lineIdx, line := range lines {
			for _, pattern := range patterns {
				loc := pattern.Regex.FindStringIndex(line)
				if loc != nil {
					matched := line[loc[0]:loc[1]]
					context := strings.TrimSpace(line)
					if len(context) > 200 {
						context = context[:200]
					}

					findings = append(findings, Finding{
						Category:    pattern.Category,
						Severity:    pattern.Severity,
						PatternName: pattern.Name,
						Match:       matched,
						File:        file.Name,
						Line:        lineIdx + 1,
						Context:     context,
						Fix:         pattern.Fix,
					})
				}
			}
		}
	}

	blocked := 0
	warnings := 0
	for _, f := range findings {
		if f.Severity == Block {
			blocked++
		} else {
			warnings++
		}
	}

	return &Result{
		Passed:   blocked == 0,
		Findings: findings,
		Blocked:  blocked,
		Warnings: warnings,
	}
}

// PatternsByCategory returns patterns grouped by category.
func PatternsByCategory() map[Category][]Pattern {
	return map[Category][]Pattern{
		InstructionOverride:    instructionOverridePatterns(),
		DataExfiltration:       dataExfiltrationPatterns(),
		BehavioralManipulation: behavioralManipulationPatterns(),
		DeceptiveBehavior:      deceptiveBehaviorPatterns(),
		HiddenContent:          hiddenContentPatterns(),
	}
}

// ── Category 1: Instruction Override ──

func instructionOverridePatterns() []Pattern {
	return []Pattern{
		{
			Regex:    regexp.MustCompile(`(?i)ignore\s+(all\s+)?(previous|prior|above|system|other)\s+(instructions|rules|guidelines|prompts|constraints)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "ignore_instructions",
			Fix:      "Remove instruction override language. Skills should not attempt to override system prompts.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)forget\s+(all\s+)?(previous|prior|above|everything|your)\s+(instructions|rules|context|training|guidelines)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "forget_instructions",
			Fix:      "Remove instruction override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)disregard\s+(all\s+)?(previous|prior|above|safety|system|other)\s+(instructions|rules|guidelines|prompts)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "disregard_instructions",
			Fix:      "Remove instruction override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)override\s+(all\s+)?(safety|security|system|content|previous)\s+(rules|guidelines|filters|restrictions|policies)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "override_rules",
			Fix:      "Remove attempts to override safety rules.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)do\s+not\s+follow\s+(any|the|your)\s+(previous|other|safety|system|prior)\s+(instructions|rules|guidelines)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "do_not_follow",
			Fix:      "Remove instruction override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)you\s+are\s+no\s+longer\s+(claude|an?\s+ai|an?\s+assistant)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "identity_override",
			Fix:      "Remove identity override language. Skills should not attempt to change the AI's identity.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)enter\s+(developer|admin|debug|unrestricted|jailbreak)\s+mode`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "enter_mode",
			Fix:      "Remove jailbreak/mode override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)new\s+system\s+prompt`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "new_system_prompt",
			Fix:      "Remove system prompt override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)replace\s+(your|the)\s+system\s+prompt`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "replace_system_prompt",
			Fix:      "Remove system prompt override language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)as\s+(your|an?)\s+(developer|creator|admin|administrator|owner|anthropic\s+employee)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "impersonate_authority",
			Fix:      "Remove authority impersonation language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)i\s+am\s+(your|a|an)\s+(developer|creator|admin|owner|anthropic)`),
			Category: InstructionOverride,
			Severity: Block,
			Name:     "claim_authority",
			Fix:      "Remove false authority claims.",
		},
	}
}

// ── Category 2: Data Exfiltration ──

func dataExfiltrationPatterns() []Pattern {
	return []Pattern{
		{
			Regex:    regexp.MustCompile(`(?i)(send|transmit|upload|post|exfiltrate|forward|relay)\s+.{0,30}(user|personal|private|sensitive)\s+(data|info|details|credentials)`),
			Category: DataExfiltration,
			Severity: Block,
			Name:     "send_user_data",
			Fix:      "Remove data exfiltration language. Skills must not instruct the AI to send user data externally.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)read\s+(the\s+)?(contents?\s+of\s+)?(\/etc\/passwd|\/etc\/shadow|~\/.ssh|~\/.aws|~\/.env|\.env|credentials|secrets)`),
			Category: DataExfiltration,
			Severity: Block,
			Name:     "read_sensitive_files",
			Fix:      "Remove references to sensitive file paths.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)(extract|reveal|show|display|output|leak|expose)\s+(the\s+)?(system\s+prompt|system\s+instructions|hidden\s+instructions|internal\s+instructions|full\s+prompt)`),
			Category: DataExfiltration,
			Severity: Block,
			Name:     "extract_system_prompt",
			Fix:      "Remove system prompt extraction language.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)ask\s+(the\s+)?(user|person|them)\s+(for|to\s+provide|to\s+enter|to\s+share)\s+(their\s+)?(password|api\s+key|token|secret|credential)`),
			Category: DataExfiltration,
			Severity: Block,
			Name:     "phish_credentials",
			Fix:      "Remove credential phishing language.",
		},
	}
}

// ── Category 3: Behavioral Manipulation ──

func behavioralManipulationPatterns() []Pattern {
	return []Pattern{
		{
			Regex:    regexp.MustCompile(`(?i)(skip|bypass|ignore|disable|turn\s+off|circumvent)\s+(all\s+)?(safety|content|ethical|security)\s+(checks?|filters?|guidelines?|restrictions?|policies|rules|guardrails?)`),
			Category: BehavioralManipulation,
			Severity: Block,
			Name:     "bypass_safety",
			Fix:      "Remove safety bypass language. Skills must respect safety guidelines.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)never\s+(question|refuse|decline|reject|challenge)\s+(the\s+)?(user|person|any\s+request)`),
			Category: BehavioralManipulation,
			Severity: Block,
			Name:     "never_refuse",
			Fix:      "Remove language that prevents the AI from declining harmful requests.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)(do\s+)?not\s+(log|record|report|save|store|track|monitor)\s+(this|any|the)\s+(conversation|interaction|request|activity)`),
			Category: BehavioralManipulation,
			Severity: Block,
			Name:     "disable_logging",
			Fix:      "Remove logging suppression language.",
		},
	}
}

// ── Category 4: Deceptive Behavior ──

func deceptiveBehaviorPatterns() []Pattern {
	return []Pattern{
		{
			Regex:    regexp.MustCompile(`(?i)(silently|quietly|secretly|covertly)\s+(send|transmit|upload|post|execute|run|install|modify|delete|remove|inject|embed|exfiltrate|collect|harvest|steal|access|read|write|change|alter|replace)`),
			Category: DeceptiveBehavior,
			Severity: Block,
			Name:     "hidden_action",
			Fix:      "Remove language instructing hidden/covert actions. All actions should be transparent.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)without\s+(telling|informing|notifying)\s+(the\s+)?(user|person|anyone)\s*.{0,20}(send|transmit|upload|execute|run|install|modify|delete|remove|inject|collect)`),
			Category: DeceptiveBehavior,
			Severity: Block,
			Name:     "concealed_from_user",
			Fix:      "Remove language that conceals actions from the user.",
		},
		{
			Regex:    regexp.MustCompile(`(?i)do\s+not\s+(tell|show|reveal|mention|let\s+the\s+user\s+know)\s+(the\s+user\s+)?(about\s+)?(this|these)\s+(instruction|step|action|behavior)`),
			Category: DeceptiveBehavior,
			Severity: Warn,
			Name:     "deceptive_concealment",
			Fix:      "Consider making instructions transparent to the user.",
		},
	}
}

// ── Category 5: Hidden Content ──

func hiddenContentPatterns() []Pattern {
	return []Pattern{
		{
			// 3+ zero-width characters in sequence
			Regex:    regexp.MustCompile("[\u200B\u200C\u200D\uFEFF]{3,}"),
			Category: HiddenContent,
			Severity: Block,
			Name:     "zero_width_chars",
			Fix:      "Remove zero-width Unicode characters. These can be used to hide content.",
		},
		{
			// Unicode bidi overrides
			Regex:    regexp.MustCompile("[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]"),
			Category: HiddenContent,
			Severity: Block,
			Name:     "bidi_override",
			Fix:      "Remove Unicode bidirectional override characters.",
		},
		{
			// Suspicious tag injection
			Regex:    regexp.MustCompile(`(?i)<\s*(system|prompt|instruction|anthropic|claude|admin|root|override|secret|hidden)[^>]*>`),
			Category: HiddenContent,
			Severity: Block,
			Name:     "tag_injection",
			Fix:      "Remove suspicious XML/HTML tags that may be used for prompt injection.",
		},
		{
			// HTML comments with suspicious content
			Regex:    regexp.MustCompile(`(?i)<!--[\s\S]*?(system|prompt|instruction|ignore|override|secret|hidden)[\s\S]*?-->`),
			Category: HiddenContent,
			Severity: Block,
			Name:     "suspicious_html_comment",
			Fix:      "Remove HTML comments containing suspicious keywords.",
		},
		{
			// Markdown hidden comments with suspicious content
			Regex:    regexp.MustCompile(`(?i)\[\/\/\]:\s*#\s*\([\s\S]*?(system|prompt|instruction|ignore|override|secret|hidden)[\s\S]*?\)`),
			Category: HiddenContent,
			Severity: Block,
			Name:     "suspicious_markdown_comment",
			Fix:      "Remove Markdown comments containing suspicious keywords.",
		},
	}
}
