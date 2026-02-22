// ═══════════════════════════════════════════════════
// neoAI — Environment Variable Validation
// ═══════════════════════════════════════════════════

import type { Bindings } from '../types';

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates required and optional environment variables at startup.
 * Logs warnings for optional missing vars, throws on required missing vars.
 */
export function validateEnv(env: Partial<Bindings>): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required bindings (will fail if missing)
  if (!env.DB) errors.push('D1 database binding "DB" is not configured');
  if (!env.KV) errors.push('KV namespace binding "KV" is not configured');

  // Required for auth (skip in development)
  const isDev = env.ENVIRONMENT === 'development';

  if (!isDev) {
    if (!env.CF_ACCESS_TEAM_DOMAIN) {
      errors.push('CF_ACCESS_TEAM_DOMAIN is required in production');
    }
    if (!env.CF_ACCESS_AUD) {
      errors.push('CF_ACCESS_AUD is required in production');
    }
  } else {
    if (!env.CF_ACCESS_TEAM_DOMAIN) {
      warnings.push('CF_ACCESS_TEAM_DOMAIN not set — auth will be bypassed in dev');
    }
  }

  // AI provider keys (at least one should be present)
  const hasAnyProvider =
    !!env.GEMINI_API_KEY || !!env.GROQ_API_KEY || !!env.HF_API_KEY || !!env.AI;

  if (!hasAnyProvider) {
    warnings.push(
      'No AI provider configured. Set at least one of: GEMINI_API_KEY, GROQ_API_KEY, HF_API_KEY, or enable Workers AI binding.',
    );
  }

  // Individual provider warnings
  if (!env.GEMINI_API_KEY) warnings.push('GEMINI_API_KEY not set — Gemini models unavailable');
  if (!env.GROQ_API_KEY) warnings.push('GROQ_API_KEY not set — Groq models unavailable');
  if (!env.HF_API_KEY) warnings.push('HF_API_KEY not set — HuggingFace models unavailable');
  if (!env.AI) warnings.push('Workers AI binding not configured — Workers AI models unavailable');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
