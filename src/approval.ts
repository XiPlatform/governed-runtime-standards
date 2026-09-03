import { contentDigest, isDigest } from './canonical.js';
import { assertSecret, b64url, fromB64url, hmac, macMessage, MAC_ALG, safeEqual } from './integrity.js';
import type { ActionApprovalAttestation, KeyedProof, UnsealedAttestation, ValidationIssue, ValidationResult } from './types.js';

const PARTY_TYPES = new Set(['human', 'agent', 'service', 'system']);
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isTs = (v: unknown): boolean => typeof v === 'string' && RFC3339.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Validate an Action Approval Attestation. Level 1 is structural; Level 2 adds
 * the binding rules (a standing or session grant must say what it matches on,
 * an auto decision must cite a policy, a human decision must name a human);
 * Level 3 requires integrity.
 */
export function validateAttestation(input: unknown, opts: { targetLevel?: 1 | 2 | 3 } = {}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string, level: 1 | 2 | 3) => issues.push({ path, message, level });
  if (!isObj(input)) return { valid: false, level: 0, issues: [{ path: '', message: 'attestation must be an object', level: 1 }] };
  const a = input as Partial<ActionApprovalAttestation> & Record<string, unknown>;

  if (a.spec !== 'action-approval/1.0') add('/spec', 'must be "action-approval/1.0"', 1);
  if (!isStr(a.id)) add('/id', 'required non-empty string', 1);
  if (!isStr(a.correlationId)) add('/correlationId', 'required non-empty string', 1);
  if (!isTs(a.decidedAt)) add('/decidedAt', 'required RFC 3339 timestamp', 1);
  if (!['approved', 'rejected', 'auto'].includes(a.decision as string)) add('/decision', 'must be approved, rejected or auto', 1);
  if (!['single', 'session', 'standing'].includes(a.scope as string)) add('/scope', 'must be single, session or standing', 1);

  if (!isObj(a.proposal)) add('/proposal', 'required object', 1);
  else {
    if (!isStr(a.proposal.kind)) add('/proposal/kind', 'required', 1);
    if (a.proposal.effect !== 'read' && a.proposal.effect !== 'write') add('/proposal/effect', 'must be read or write', 1);
    if (!isDigest(a.proposal.argsDigest)) add('/proposal/argsDigest', 'required sha256:<hex> digest of the exact arguments', 1);
  }
  const party = (p: unknown, path: string) => {
    if (!isObj(p) || !isStr(p.id) || !PARTY_TYPES.has(p.type as string)) add(path, 'required party with id and type', 1);
  };
  party(a.principal, '/principal');
  party(a.approver, '/approver');
  if (a.constraints !== undefined) {
    if (!isObj(a.constraints)) add('/constraints', 'must be an object', 1);
    else if (a.constraints.expiresAt !== undefined && !isTs(a.constraints.expiresAt)) add('/constraints/expiresAt', 'must be RFC 3339', 1);
  }

  // Level 2: binding rules.
  if (isObj(a.approver)) {
    if ((a.decision === 'approved' || a.decision === 'rejected') && a.approver.type !== 'human') {
      add('/approver/type', 'Level 2: an approved or rejected decision must be made by a human party', 2);
    }
    if (a.decision === 'auto') {
      if (!isObj(a.policy) || !isStr(a.policy.ref)) add('/policy/ref', 'Level 2: an auto decision must cite the policy that granted it', 2);
    }
  }
  if (a.scope === 'session' || a.scope === 'standing') {
    const m = isObj(a.constraints) ? a.constraints.matchOn : undefined;
    if (!Array.isArray(m) || m.length === 0) add('/constraints/matchOn', 'Level 2: a session or standing grant must state which proposal members it matches on', 2);
  }
  if (a.scope === 'standing' && (!isObj(a.constraints) || (!isTs(a.constraints.expiresAt) && typeof a.constraints.maxUses !== 'number'))) {
    add('/constraints', 'Level 2: a standing grant must carry an expiry or a use limit', 2);
  }

  // Level 3: integrity.
  if (!isObj(a.integrity)) add('/integrity', 'Level 3 requires an integrity member', 3);
  else {
    if (!isDigest(a.integrity.contentDigest)) add('/integrity/contentDigest', 'must be sha256:<hex>', 3);
    if (!isObj(a.integrity.mac) && !isObj(a.integrity.signature)) add('/integrity', 'Level 3 requires a mac or a signature', 3);
  }

  const failsAt = (lvl: 1 | 2 | 3) => issues.some((i) => i.level <= lvl);
  const level: 0 | 1 | 2 | 3 = failsAt(1) ? 0 : failsAt(2) ? 1 : failsAt(3) ? 2 : 3;
  return { valid: level >= (opts.targetLevel ?? 1), level, issues };
}

/** Seal an attestation with a keyed MAC over its content digest. */
export function sealAttestation(
  attestation: UnsealedAttestation | ActionApprovalAttestation,
  opts: { secret: string; keyId: string; now?: () => Date },
): ActionApprovalAttestation {
  assertSecret(opts.secret);
  const { integrity: _omit, ...content } = attestation as ActionApprovalAttestation;
  const digest = contentDigest(content);
  const mac: KeyedProof = { alg: MAC_ALG, keyId: opts.keyId, value: b64url(hmac(opts.secret, macMessage(digest))) };
  return { ...(content as UnsealedAttestation), integrity: { contentDigest: digest, mac, sealedAt: (opts.now ? opts.now() : new Date()).toISOString() } };
}

export function verifyAttestation(a: ActionApprovalAttestation, secret: string): { valid: boolean; reason?: 'unsealed' | 'content_digest_mismatch' | 'no_mac' | 'bad_mac' } {
  if (!a.integrity) return { valid: false, reason: 'unsealed' };
  if (contentDigest(a) !== a.integrity.contentDigest) return { valid: false, reason: 'content_digest_mismatch' };
  if (!a.integrity.mac) return { valid: false, reason: 'no_mac' };
  if (!safeEqual(hmac(secret, macMessage(a.integrity.contentDigest)), fromB64url(a.integrity.mac.value))) return { valid: false, reason: 'bad_mac' };
  return { valid: true };
}

export interface CoverageCheck {
  /** The proposed action to execute now. */
  proposal: { kind: string; tool?: string; target?: string; effect: 'read' | 'write'; argsDigest: string };
  correlationId: string;
  sessionId?: string;
  now?: Date;
  usesSoFar?: number;
}

/**
 * Decide whether an attestation authorises a concrete proposal. A single-scope
 * grant must match the exact arguments and correlation. Session and standing
 * grants match on the members named in constraints.matchOn, and must not be
 * expired, exhausted, or revoked.
 */
export function covers(a: ActionApprovalAttestation, check: CoverageCheck): { covered: boolean; reason?: string } {
  if (a.decision !== 'approved' && a.decision !== 'auto') return { covered: false, reason: 'not_approved' };
  if (a.revoked) return { covered: false, reason: 'revoked' };
  const now = check.now ?? new Date();
  if (a.constraints?.expiresAt && Date.parse(a.constraints.expiresAt) <= now.getTime()) return { covered: false, reason: 'expired' };
  if (typeof a.constraints?.maxUses === 'number' && (check.usesSoFar ?? 0) >= a.constraints.maxUses) return { covered: false, reason: 'exhausted' };
  if (a.proposal.effect !== check.proposal.effect) return { covered: false, reason: 'effect_mismatch' };

  if (a.scope === 'single') {
    if (a.correlationId !== check.correlationId) return { covered: false, reason: 'correlation_mismatch' };
    if (a.proposal.argsDigest !== check.proposal.argsDigest) return { covered: false, reason: 'args_mismatch' };
    return { covered: true };
  }
  const matchOn = a.constraints?.matchOn ?? [];
  for (const member of matchOn) {
    const want = (a.proposal as Record<string, unknown>)[member];
    const have = (check.proposal as Record<string, unknown>)[member];
    if (want !== have) return { covered: false, reason: `mismatch:${member}` };
  }
  if (a.scope === 'session' && a.correlationId !== check.correlationId && a.correlationId !== check.sessionId) {
    return { covered: false, reason: 'session_mismatch' };
  }
  return { covered: true };
}
