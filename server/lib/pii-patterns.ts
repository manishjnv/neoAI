// ═══════════════════════════════════════════════════
// neoAI — PII Detection Patterns
// ═══════════════════════════════════════════════════
// Scans text for personally identifiable information
// before it reaches AI model providers.

import type { PiiDetection, PiiScanResult } from '../types';

interface PiiPattern {
  type: string;
  label: string;
  regex: RegExp;
  maskFn: (match: string) => string;
}

const patterns: PiiPattern[] = [
  // ── Email addresses ──
  {
    type: 'email',
    label: 'Email Address',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    maskFn: (m) => {
      const [local, domain] = m.split('@');
      return `${local[0]}***@${domain[0]}***.${domain.split('.').pop()}`;
    },
  },

  // ── Phone numbers (international) ──
  {
    type: 'phone',
    label: 'Phone Number',
    regex: /(?:\+\d{1,3}[-.]\s?)\(?\d{2,4}\)?[-.]?\d{3,4}[-.]?\d{3,4}/g,
    maskFn: (m) => m.replace(/\d(?=\d{4})/g, '*'),
  },

  // ── Credit card numbers (with Luhn-like length check) ──
  {
    type: 'credit_card',
    label: 'Credit Card Number',
    regex: /\b(?:\d[ \-]*?){13,19}\b/g,
    maskFn: (m) => {
      const digits = m.replace(/\D/g, '');
      if (digits.length < 13 || digits.length > 19) return m;
      // Basic Luhn check to avoid false positives
      let sum = 0;
      let alt = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) { n *= 2; if (n > 9) n -= 9; }
        sum += n;
        alt = !alt;
      }
      if (sum % 10 !== 0) return m; // Not a valid card number, skip
      return `****-****-****-${digits.slice(-4)}`;
    },
  },

  // ── US Social Security Numbers ──
  {
    type: 'ssn',
    label: 'Social Security Number',
    regex: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
    maskFn: () => '***-**-****',
  },

  // ── API keys and tokens ──
  {
    type: 'api_key',
    label: 'API Key / Token',
    regex: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36,}|gho_[a-zA-Z0-9]{36,}|glpat-[a-zA-Z0-9\-]{20,}|xox[bpras]-[a-zA-Z0-9\-]{10,}|AIza[a-zA-Z0-9_\-]{35}|ya29\.[a-zA-Z0-9_\-.]{50,}|AKIA[A-Z0-9]{16})\b/g,
    maskFn: (m) => `${m.slice(0, 6)}${'*'.repeat(Math.min(m.length - 6, 20))}`,
  },

  // ── Passwords (common patterns in text) ──
  {
    type: 'password',
    label: 'Password',
    regex: /(?:password|passwd|pwd|pass)\s*[=:]\s*["']?[^\s"',;]{4,}/gi,
    maskFn: (m) => {
      const sep = m.match(/[=:]/);
      if (sep) {
        const idx = m.indexOf(sep[0]);
        return `${m.slice(0, idx + 1)} [REDACTED]`;
      }
      return '[REDACTED_PASSWORD]';
    },
  },

  // ── US Addresses (basic detection) ──
  {
    type: 'address',
    label: 'Street Address',
    regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:St|Street|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Rd|Road|Ct|Court|Way|Pl|Place)\.?\b/gi,
    maskFn: () => '[REDACTED_ADDRESS]',
  },

  // ── Indian Aadhaar numbers ──
  {
    type: 'aadhaar',
    label: 'Aadhaar Number',
    regex: /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    maskFn: (m) => {
      const digits = m.replace(/\D/g, '');
      return `****-****-${digits.slice(-4)}`;
    },
  },

  // ── Indian PAN numbers ──
  {
    type: 'pan',
    label: 'PAN Number',
    regex: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    maskFn: (m) => `${m.slice(0, 2)}****${m.slice(-2)}`,
  },
];

/**
 * Scans text for PII and returns detections + sanitized text.
 * Does NOT throw — caller decides whether to block or warn.
 */
export function scanForPii(text: string): PiiScanResult {
  const detections: PiiDetection[] = [];
  let sanitized = text;

  for (const pattern of patterns) {
    // Reset regex state for global patterns
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const value = match[0];
      const masked = pattern.maskFn(value);

      // Avoid duplicate detections at same position
      const exists = detections.some(
        (d) => d.start === match!.index && d.end === match!.index + value.length,
      );
      if (!exists) {
        detections.push({
          type: pattern.type,
          value,
          masked,
          start: match.index,
          end: match.index + value.length,
        });
      }
    }
  }

  // Sort by position (descending) to safely replace without index shifting
  const sorted = [...detections].sort((a, b) => b.start - a.start);
  for (const d of sorted) {
    sanitized = sanitized.slice(0, d.start) + d.masked + sanitized.slice(d.end);
  }

  return {
    hasPii: detections.length > 0,
    detections,
    sanitized,
  };
}

/**
 * Returns a safe log-friendly version of text with all PII masked.
 */
export function maskPiiForLog(text: string): string {
  return scanForPii(text).sanitized;
}
