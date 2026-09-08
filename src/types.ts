/**
 * Governed Runtime Standards, version 1.0.
 *
 * Types mirror the normative JSON Schemas in ../schema:
 *   action-provenance-1.0.schema.json  (Action Provenance Record)
 *   action-approval-1.0.schema.json    (Action Approval Attestation)
 */

export const PROVENANCE_SPEC = 'action-provenance/1.0' as const;
export const APPROVAL_SPEC = 'action-approval/1.0' as const;

/** RFC 3339 timestamp, UTC. */
export type Timestamp = string;
/** "sha256:" followed by 64 lowercase hex characters. */
export type Digest = `sha256:${string}`;

export type PartyType = 'human' | 'agent' | 'service' | 'system';
export type Effect = 'none' | 'read' | 'write';
export type PolicyVerdict = 'allow' | 'allow_with_obligations' | 'deny' | 'escalate';
export type ApprovalDecision = 'approved' | 'rejected' | 'auto' | 'not_required' | 'expired';
export type OutcomeStatus = 'succeeded' | 'failed' | 'blocked' | 'denied' | 'cancelled' | 'timed_out';
export type CostAttribution = 'exact' | 'approximate' | 'none';

/** Registered action kinds. Extensions use an "x-" prefix. */
export type ActionKind =
  | 'chat_turn' | 'agent_invocation' | 'workflow_step' | 'tool_call'
  | 'agent_formation' | 'subagent_spawn' | 'runtime_action'
  | `x-${string}`;

export interface Party {
  id: string;
  type: PartyType;
  display?: string;
  tenant?: string;
  onBehalfOf?: { id: string; type: PartyType };
}

export interface KeyedProof {
  /** hmac-sha256 for a MAC; ed25519 or es256 for a signature. */
  alg: string;
  keyId: string;
  /** base64url, no padding. */
  value: string;
}

export interface Chain {
  scope: string;
  seq: number;
  prev: Digest | null;
  link: KeyedProof;
}

export interface Integrity {
  contentDigest: Digest;
  mac?: KeyedProof;
  signature?: KeyedProof;
  chain?: Chain;
  sealedAt?: Timestamp;
}

export interface Evaluation {
  evaluator: string;
  decision: string;
  code?: string;
  confidence?: number;
  reasons?: string[];
}

export interface EffectEntry {
  tool: string;
  target?: string;
  status: 'succeeded' | 'failed';
  sideEffecting: boolean;
  argsDigest?: Digest;
  responseDigest?: Digest;
  resultRef?: string;
  approvedBy?: Party;
  compensated?: boolean;
  error?: string;
}

// ─── Action Provenance Record ────────────────────────────────────────────────

export interface ActionProvenanceRecord {
  spec: typeof PROVENANCE_SPEC;
  id: string;
  correlationId: string;
  recordedAt: Timestamp;
  action: { kind: ActionKind; at: Timestamp; effect: Effect; description?: string };
  principal: Party;
  agent?: { id: string; name?: string; version?: string; bundleDigest?: Digest; instructionsDigest?: Digest };
  model: { requested?: string; resolved: string; provider: string; mode?: string };
  context?: { tenant?: string; workspace?: string; session?: string; execution?: string; step?: string };
  policy?: { verdict: PolicyVerdict; ref?: string; version?: string; obligations?: string[]; evaluations?: Evaluation[] };
  approval?: { required: boolean; decision: ApprovalDecision; approver?: Party; at?: Timestamp; method?: string; attestation?: string };
  effects?: EffectEntry[];
  workProduct?: { inputDigest?: Digest; outputDigest?: Digest; sources?: string[]; artifacts?: string[] };
  cost?: { inputTokens?: number; outputTokens?: number; estimatedUsd?: number; attribution: CostAttribution };
  outcome: { status: OutcomeStatus; error?: string };
  integrity?: Integrity;
  extensions?: Record<string, Record<string, unknown>>;
}

/** A record before it has been sealed. */
export type UnsealedRecord = Omit<ActionProvenanceRecord, 'integrity'>;

// ─── Action Approval Attestation ─────────────────────────────────────────────

export type ApprovalScope = 'single' | 'session' | 'standing';

export interface ActionApprovalAttestation {
  spec: typeof APPROVAL_SPEC;
  id: string;
  correlationId: string;
  proposal: {
    kind: string;
    tool?: string;
    target?: string;
    effect: 'read' | 'write';
    argsDigest: Digest;
    summary?: string;
    presentedDigest?: Digest;
  };
  principal: Party;
  approver: Party;
  decision: 'approved' | 'rejected' | 'auto';
  scope: ApprovalScope;
  constraints?: { expiresAt?: Timestamp; maxUses?: number; matchOn?: string[]; conditions?: string[] };
  decidedAt: Timestamp;
  method?: string;
  policy?: { ref?: string; version?: string };
  reason?: string;
  revoked?: { at: Timestamp; by?: Party; reason?: string };
  integrity?: Omit<Integrity, 'chain'>;
  extensions?: Record<string, Record<string, unknown>>;
}

export type UnsealedAttestation = Omit<ActionApprovalAttestation, 'integrity'>;

// ─── Validation ──────────────────────────────────────────────────────────────

export type ConformanceLevel = 1 | 2 | 3;

export interface ValidationIssue {
  /** JSON pointer to the offending member. */
  path: string;
  message: string;
  /** The lowest level at which this issue is a failure. */
  level: ConformanceLevel;
}

export interface ValidationResult {
  valid: boolean;
  /** Highest level the document satisfies; 0 when it is not structurally valid. */
  level: 0 | ConformanceLevel;
  issues: ValidationIssue[];
}
