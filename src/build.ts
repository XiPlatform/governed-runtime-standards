import { randomUUID } from 'node:crypto';
import type { ActionProvenanceRecord, UnsealedAttestation, UnsealedRecord } from './types.js';
import { APPROVAL_SPEC, PROVENANCE_SPEC } from './types.js';

export type RecordInput = Omit<UnsealedRecord, 'spec' | 'id' | 'recordedAt'> & { id?: string; recordedAt?: string };
export type AttestationInput = Omit<UnsealedAttestation, 'spec' | 'id' | 'decidedAt'> & { id?: string; decidedAt?: string };

/** Build an unsealed record with the spec version, an id and recordedAt filled in. */
export function createRecord(input: RecordInput, opts: { now?: () => Date } = {}): UnsealedRecord {
  const now = opts.now ? opts.now() : new Date();
  const { id, recordedAt, ...rest } = input;
  return { spec: PROVENANCE_SPEC, id: id ?? randomUUID(), recordedAt: recordedAt ?? now.toISOString(), ...rest };
}

/** Build an unsealed attestation with the spec version, an id and decidedAt filled in. */
export function createAttestation(input: AttestationInput, opts: { now?: () => Date } = {}): UnsealedAttestation {
  const now = opts.now ? opts.now() : new Date();
  const { id, decidedAt, ...rest } = input;
  return { spec: APPROVAL_SPEC, id: id ?? randomUUID(), decidedAt: decidedAt ?? now.toISOString(), ...rest };
}

/** Group records by correlationId, preserving order within each group. */
export function groupByCorrelation(records: ActionProvenanceRecord[]): Map<string, ActionProvenanceRecord[]> {
  const out = new Map<string, ActionProvenanceRecord[]>();
  for (const r of records) {
    const list = out.get(r.correlationId) ?? [];
    list.push(r);
    out.set(r.correlationId, list);
  }
  return out;
}
