import { createHmac, timingSafeEqual } from 'node:crypto';
import { contentDigest } from './canonical.js';
import type { ActionProvenanceRecord, Chain, Digest, Integrity, KeyedProof, UnsealedRecord } from './types.js';

export const GENESIS = 'GENESIS';
export const MAC_ALG = 'hmac-sha256';

export function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromB64url(input: string): Buffer | null {
  try {
    const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
    return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  } catch {
    return null;
  }
}
export function hmac(secret: string, message: string): Buffer {
  return createHmac('sha256', secret).update(message).digest();
}
export function safeEqual(a: Buffer, b: Buffer | null): boolean {
  return b !== null && a.length === b.length && timingSafeEqual(a, b);
}
export function assertSecret(secret: string): void {
  if (!secret || secret.length < 16) throw new Error('secret must be at least 16 characters');
}

export interface SealOptions {
  secret: string;
  keyId: string;
  /** Provide to link the record into a per-scope hash chain. */
  chain?: { scope: string; seq: number; prev: Digest | null };
  now?: () => Date;
}

/** The message a MAC covers: the content digest string itself. */
export function macMessage(digest: Digest): string {
  return digest;
}
/** The message a chain link covers: digest, a dot, then the previous digest or GENESIS. */
export function chainLinkMessage(digest: Digest, prev: Digest | null): string {
  return `${digest}.${prev ?? GENESIS}`;
}

/**
 * Seal a record: compute its content digest, a keyed MAC over that digest, and
 * optionally a chain link over (digest, previous digest). Returns a new record.
 */
export function seal(record: UnsealedRecord | ActionProvenanceRecord, opts: SealOptions): ActionProvenanceRecord {
  assertSecret(opts.secret);
  const { integrity: _omit, ...content } = record as ActionProvenanceRecord;
  const digest = contentDigest(content);
  const mac: KeyedProof = { alg: MAC_ALG, keyId: opts.keyId, value: b64url(hmac(opts.secret, macMessage(digest))) };
  const integrity: Integrity = { contentDigest: digest, mac };
  if (opts.chain) {
    const link: KeyedProof = {
      alg: MAC_ALG, keyId: opts.keyId,
      value: b64url(hmac(opts.secret, chainLinkMessage(digest, opts.chain.prev))),
    };
    integrity.chain = { scope: opts.chain.scope, seq: opts.chain.seq, prev: opts.chain.prev, link };
  }
  integrity.sealedAt = (opts.now ? opts.now() : new Date()).toISOString();
  return { ...(content as UnsealedRecord), integrity };
}

export type VerifyReason = 'unsealed' | 'content_digest_mismatch' | 'no_mac' | 'bad_mac' | 'bad_link';

/**
 * Verify a sealed record offline: recompute the content digest, check the MAC,
 * and check the chain link when present.
 */
export function verify(record: ActionProvenanceRecord, secret: string): { valid: boolean; reason?: VerifyReason } {
  const integrity = record.integrity;
  if (!integrity) return { valid: false, reason: 'unsealed' };
  if (contentDigest(record) !== integrity.contentDigest) return { valid: false, reason: 'content_digest_mismatch' };
  if (!integrity.mac) return { valid: false, reason: 'no_mac' };
  if (!safeEqual(hmac(secret, macMessage(integrity.contentDigest)), fromB64url(integrity.mac.value))) {
    return { valid: false, reason: 'bad_mac' };
  }
  if (integrity.chain) {
    const expected = hmac(secret, chainLinkMessage(integrity.contentDigest, integrity.chain.prev));
    if (!safeEqual(expected, fromB64url(integrity.chain.link.value))) return { valid: false, reason: 'bad_link' };
  }
  return { valid: true };
}

export type ChainReason = 'seq_gap' | 'broken_prev_link' | 'record_invalid' | 'wrong_scope';

export interface ChainResult {
  ok: boolean;
  verified: number;
  brokenAtSeq?: number;
  reason?: ChainReason;
}

/**
 * Verify that an ordered sequence of sealed records forms an unbroken chain for
 * one scope: contiguous sequence numbers, each prev equal to the previous
 * content digest, and every record individually valid.
 */
export function verifyChain(records: ActionProvenanceRecord[], secret: string, scope: string): ChainResult {
  let prev: Chain | null = null;
  let prevDigest: Digest | null = null;
  let verified = 0;
  const fail = (reason: ChainReason, seq?: number): ChainResult =>
    seq === undefined ? { ok: false, verified, reason } : { ok: false, verified, brokenAtSeq: seq, reason };
  for (const record of records) {
    const chain = record.integrity?.chain;
    if (!chain || chain.scope !== scope) return fail('wrong_scope', chain?.seq);
    if (prev) {
      if (chain.seq !== prev.seq + 1) return fail('seq_gap', chain.seq);
      if (chain.prev !== prevDigest) return fail('broken_prev_link', chain.seq);
    }
    if (!verify(record, secret).valid) return fail('record_invalid', chain.seq);
    verified++;
    prev = chain;
    prevDigest = record.integrity!.contentDigest;
  }
  return { ok: true, verified };
}
