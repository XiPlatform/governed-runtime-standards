import { createHash } from 'node:crypto';
import type { Digest } from './types.js';

/**
 * Deterministic canonical form: object members sorted by key (UTF-16 code unit
 * order), arrays in order, undefined members dropped, numbers and strings
 * serialised as by ECMAScript JSON.stringify. For documents made of standard
 * JSON values this yields the same bytes as RFC 8785 (JSON Canonicalization
 * Scheme).
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(source).sort()) {
    const v = source[key];
    if (v !== undefined) out[key] = canonicalize(v);
  }
  return out;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Digest(input: string | Uint8Array): Digest {
  return `sha256:${createHash('sha256').update(input).digest('hex')}`;
}

/** Digest of a document's canonical form with its integrity member removed. */
export function contentDigest(document: object): Digest {
  const { integrity: _omit, ...rest } = document as { integrity?: unknown };
  return sha256Digest(canonicalJson(rest));
}

export function isDigest(value: unknown): value is Digest {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/.test(value);
}
