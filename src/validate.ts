import { isDigest } from './canonical.js';
import type { ActionProvenanceRecord, ConformanceLevel, ValidationIssue, ValidationResult } from './types.js';

const PARTY_TYPES = new Set(['human', 'agent', 'service', 'system']);
const EFFECTS = new Set(['none', 'read', 'write']);
const VERDICTS = new Set(['allow', 'allow_with_obligations', 'deny', 'escalate']);
const DECISIONS = new Set(['approved', 'rejected', 'auto', 'not_required', 'expired']);
const OUTCOMES = new Set(['succeeded', 'failed', 'blocked', 'denied', 'cancelled', 'timed_out']);
const ATTRIBUTIONS = new Set(['exact', 'approximate', 'none']);
const KINDS = new Set(['chat_turn', 'agent_invocation', 'workflow_step', 'tool_call', 'agent_formation', 'subagent_spawn', 'runtime_action']);
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isTs = (v: unknown): boolean => typeof v === 'string' && RFC3339.test(v) && !Number.isNaN(Date.parse(v));

/**
 * Validate an Action Provenance Record. Structural rules are Level 1
 * (Attributable); governance rules are Level 2 (Governed); integrity rules are
 * Level 3 (Verifiable). The result reports the highest level fully satisfied and
 * every issue found, so a caller can see exactly what is missing for the next level.
 */
export function validate(input: unknown, opts: { targetLevel?: ConformanceLevel } = {}): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string, level: ConformanceLevel) => issues.push({ path, message, level });

  if (!isObj(input)) return { valid: false, level: 0, issues: [{ path: '', message: 'record must be an object', level: 1 }] };
  const r = input as Partial<ActionProvenanceRecord> & Record<string, unknown>;

  // ── Level 1: Attributable ──────────────────────────────────────────────────
  if (r.spec !== 'action-provenance/1.0') add('/spec', 'must be "action-provenance/1.0"', 1);
  if (!isStr(r.id)) add('/id', 'required non-empty string', 1);
  if (!isStr(r.correlationId)) add('/correlationId', 'required non-empty string', 1);
  if (!isTs(r.recordedAt)) add('/recordedAt', 'required RFC 3339 timestamp', 1);

  if (!isObj(r.action)) add('/action', 'required object', 1);
  else {
    const kind = r.action.kind;
    if (!isStr(kind) || !(KINDS.has(kind) || kind.startsWith('x-'))) add('/action/kind', 'must be a registered kind or start with "x-"', 1);
    if (!isTs(r.action.at)) add('/action/at', 'required RFC 3339 timestamp', 1);
    if (!EFFECTS.has(r.action.effect as string)) add('/action/effect', 'must be none, read or write', 1);
  }

  const checkParty = (p: unknown, path: string, level: ConformanceLevel) => {
    if (!isObj(p)) return add(path, 'required object with id and type', level);
    if (!isStr(p.id)) add(`${path}/id`, 'required non-empty string', level);
    if (!PARTY_TYPES.has(p.type as string)) add(`${path}/type`, 'must be human, agent, service or system', level);
    if (p.onBehalfOf !== undefined && (!isObj(p.onBehalfOf) || !isStr(p.onBehalfOf.id) || !PARTY_TYPES.has(p.onBehalfOf.type as string))) {
      add(`${path}/onBehalfOf`, 'must be a party reference with id and type', level);
    }
  };
  checkParty(r.principal, '/principal', 1);

  if (!isObj(r.model)) add('/model', 'required object', 1);
  else {
    if (!isStr(r.model.resolved)) add('/model/resolved', 'required; use "none" when no model was invoked', 1);
    if (!isStr(r.model.provider)) add('/model/provider', 'required; use "none" when no model was invoked', 1);
  }

  if (!isObj(r.outcome)) add('/outcome', 'required object', 1);
  else if (!OUTCOMES.has(r.outcome.status as string)) add('/outcome/status', 'must be a terminal status', 1);

  if (r.agent !== undefined) {
    if (!isObj(r.agent) || !isStr(r.agent.id)) add('/agent', 'when present, must have a non-empty id', 1);
    else {
      if (r.agent.bundleDigest !== undefined && !isDigest(r.agent.bundleDigest)) add('/agent/bundleDigest', 'must be sha256:<hex>', 1);
      if (r.agent.instructionsDigest !== undefined && !isDigest(r.agent.instructionsDigest)) add('/agent/instructionsDigest', 'must be sha256:<hex>', 1);
    }
  }
  if (r.cost !== undefined && (!isObj(r.cost) || !ATTRIBUTIONS.has(r.cost.attribution as string))) add('/cost/attribution', 'must be exact, approximate or none', 1);
  if (r.effects !== undefined) {
    if (!Array.isArray(r.effects)) add('/effects', 'must be an array', 1);
    else r.effects.forEach((e, i) => {
      if (!isObj(e)) return add(`/effects/${i}`, 'must be an object', 1);
      if (!isStr(e.tool)) add(`/effects/${i}/tool`, 'required non-empty string', 1);
      if (e.status !== 'succeeded' && e.status !== 'failed') add(`/effects/${i}/status`, 'must be succeeded or failed', 1);
      if (typeof e.sideEffecting !== 'boolean') add(`/effects/${i}/sideEffecting`, 'required boolean', 1);
      for (const k of ['argsDigest', 'responseDigest'] as const) {
        if (e[k] !== undefined && !isDigest(e[k])) add(`/effects/${i}/${k}`, 'must be sha256:<hex>', 1);
      }
      if (e.approvedBy !== undefined) checkParty(e.approvedBy, `/effects/${i}/approvedBy`, 1);
    });
  }
  if (r.policy !== undefined && (!isObj(r.policy) || !VERDICTS.has(r.policy.verdict as string))) add('/policy/verdict', 'must be allow, allow_with_obligations, deny or escalate', 1);
  if (r.approval !== undefined) {
    if (!isObj(r.approval)) add('/approval', 'must be an object', 1);
    else {
      if (typeof r.approval.required !== 'boolean') add('/approval/required', 'required boolean', 1);
      if (!DECISIONS.has(r.approval.decision as string)) add('/approval/decision', 'must be approved, rejected, auto, not_required or expired', 1);
      if (r.approval.approver !== undefined) checkParty(r.approval.approver, '/approval/approver', 1);
      if (r.approval.at !== undefined && !isTs(r.approval.at)) add('/approval/at', 'must be RFC 3339', 1);
    }
  }

  // ── Level 2: Governed ──────────────────────────────────────────────────────
  const effect = isObj(r.action) ? r.action.effect : undefined;
  const sideEffecting = Array.isArray(r.effects) && r.effects.some((e) => isObj(e) && e.sideEffecting === true);
  const outcomeStatus = isObj(r.outcome) ? r.outcome.status : undefined;
  // A denied or blocked action never reached the approval step.
  const shortCircuited = outcomeStatus === 'denied' || outcomeStatus === 'blocked';

  if (!isObj(r.policy)) add('/policy', 'Level 2 requires a policy verdict on every action', 2);

  if ((effect === 'write' || sideEffecting) && !shortCircuited) {
    if (!isObj(r.approval)) add('/approval', 'Level 2 requires an approval member on every write action that reached execution', 2);
    else {
      const d = r.approval.decision;
      if (r.approval.required !== true) add('/approval/required', 'Level 2 requires approval.required to be true on a write action', 2);
      if (outcomeStatus === 'succeeded') {
        if (d === 'approved') {
          if (!isObj(r.approval.approver)) add('/approval/approver', 'an approved write must name the approver', 2);
          if (!isTs(r.approval.at)) add('/approval/at', 'an approved write must record when approval was given', 2);
        } else if (d === 'auto') {
          if (!isObj(r.policy) || !isStr(r.policy.ref)) add('/policy/ref', 'an auto-approved write must cite the policy that granted autonomy', 2);
        } else {
          add('/approval/decision', 'a succeeded write must be approved, or auto-approved under a cited policy', 2);
        }
      }
    }
  }
  if ((effect === 'write' || sideEffecting) && isObj(r.policy) && r.policy.verdict === 'deny' && outcomeStatus === 'succeeded') {
    add('/outcome/status', 'a denied write must not report a succeeded outcome', 2);
  }
  if (Array.isArray(r.effects)) r.effects.forEach((e, i) => {
    if (isObj(e) && e.sideEffecting === true && e.status === 'succeeded' && !isDigest(e.responseDigest) && !isStr(e.resultRef)) {
      add(`/effects/${i}`, 'Level 2 requires responseDigest or resultRef on every succeeded side effect', 2);
    }
  });

  // ── Level 3: Verifiable ────────────────────────────────────────────────────
  if (!isObj(r.integrity)) add('/integrity', 'Level 3 requires an integrity member', 3);
  else {
    if (!isDigest(r.integrity.contentDigest)) add('/integrity/contentDigest', 'must be sha256:<hex>', 3);
    if (!isObj(r.integrity.mac) && !isObj(r.integrity.signature)) add('/integrity', 'Level 3 requires a mac or a signature', 3);
    if (r.integrity.chain !== undefined) {
      const c = r.integrity.chain;
      if (!isObj(c) || !isStr(c.scope) || typeof c.seq !== 'number' || !(c.prev === null || isDigest(c.prev)) || !isObj(c.link)) {
        add('/integrity/chain', 'chain requires scope, seq, prev (digest or null) and link', 3);
      }
    }
  }

  const failsAt = (lvl: ConformanceLevel) => issues.some((i) => i.level <= lvl);
  const level: 0 | ConformanceLevel = failsAt(1) ? 0 : failsAt(2) ? 1 : failsAt(3) ? 2 : 3;
  return { valid: level >= (opts.targetLevel ?? 1), level, issues };
}
