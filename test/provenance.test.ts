import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { contentDigest, createRecord, groupByCorrelation, seal, validate, verify, verifyChain } from '../src/index.js';
import type { ActionProvenanceRecord } from '../src/index.js';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../examples/${name}`, import.meta.url), 'utf8')) as ActionProvenanceRecord;
const SECRET = 'test-secret-at-least-16-chars';
const KEY = 'test-key-v1';

describe('conformance levels', () => {
  it('approved write reaches Level 2 unsealed and Level 3 sealed', () => {
    const r = load('approved-write.json');
    const res = validate(r);
    expect(res.issues.filter((i) => i.level <= 2)).toEqual([]);
    expect(res.level).toBe(2);
    const sealed = seal(r, { secret: SECRET, keyId: KEY });
    expect(validate(sealed, { targetLevel: 3 })).toMatchObject({ valid: true, level: 3 });
  });

  it('a policy-denied write is Level 2 without an approval member (it never reached approval)', () => {
    const res = validate(load('denied-write.json'));
    expect(res.issues.filter((i) => i.level <= 2)).toEqual([]);
    expect(res.level).toBe(2);
  });

  it('a read-only action is Level 2 without needing an approver', () => {
    expect(validate(load('read-only.json')).level).toBe(2);
  });

  it('a succeeded write without an approver drops to Level 1', () => {
    const r = load('approved-write.json');
    delete r.approval!.approver;
    const res = validate(r);
    expect(res.level).toBe(1);
    expect(res.issues.some((i) => i.path === '/approval/approver' && i.level === 2)).toBe(true);
  });

  it('a succeeded write with no approval member at all drops to Level 1', () => {
    const r = load('approved-write.json');
    delete r.approval;
    expect(validate(r).issues.some((i) => i.path === '/approval' && i.level === 2)).toBe(true);
  });

  it('an auto-approved write must cite its policy', () => {
    const r = load('approved-write.json');
    r.approval = { required: true, decision: 'auto' };
    expect(validate(r).level).toBe(2);
    delete r.policy!.ref;
    expect(validate(r).issues.some((i) => i.path === '/policy/ref')).toBe(true);
  });

  it('a denied verdict claiming a succeeded write is rejected at Level 2', () => {
    const r = load('denied-write.json');
    r.outcome = { status: 'succeeded' };
    r.effects = [{ tool: 'crm.delete', status: 'succeeded', sideEffecting: true, resultRef: 'x' }];
    expect(validate(r).issues.some((i) => i.path === '/outcome/status' && i.level === 2)).toBe(true);
  });

  it('a succeeded side effect must carry a response digest or result reference', () => {
    const r = load('approved-write.json');
    delete r.effects![0]!.responseDigest;
    delete r.effects![0]!.resultRef;
    expect(validate(r).issues.some((i) => i.path === '/effects/0' && i.level === 2)).toBe(true);
  });

  it('missing principal fails Level 1', () => {
    const r = load('read-only.json') as unknown as Record<string, unknown>;
    delete r.principal;
    expect(validate(r)).toMatchObject({ valid: false, level: 0 });
  });

  it('digests must be sha256 hex and action kinds must be registered or x- prefixed', () => {
    const r = load('read-only.json');
    r.effects![0]!.argsDigest = 'md5:abc' as never;
    expect(validate(r).level).toBe(0);
    const k = load('read-only.json');
    k.action.kind = 'x-custom_thing';
    expect(validate(k).level).toBe(2);
    k.action.kind = 'custom_thing' as never;
    expect(validate(k).level).toBe(0);
  });
});

describe('integrity', () => {
  it('seal then verify round-trips and detects tampering', () => {
    const sealed = seal(load('approved-write.json'), { secret: SECRET, keyId: KEY });
    expect(verify(sealed, SECRET)).toEqual({ valid: true });
    expect(verify(sealed, 'wrong-secret-wrong-secret').reason).toBe('bad_mac');
    const tampered = structuredClone(sealed);
    tampered.outcome.status = 'failed';
    expect(verify(tampered, SECRET).reason).toBe('content_digest_mismatch');
    expect(verify(load('read-only.json'), SECRET).reason).toBe('unsealed');
  });

  it('content digest excludes the integrity member and is independent of member order', () => {
    const r = load('read-only.json');
    const a = contentDigest(r);
    const reordered = Object.fromEntries(Object.entries(r).reverse()) as ActionProvenanceRecord;
    expect(contentDigest(reordered)).toBe(a);
    expect(contentDigest(seal(r, { secret: SECRET, keyId: KEY }))).toBe(a);
  });

  it('sealedAt is informational and does not affect verification', () => {
    const sealed = seal(load('read-only.json'), { secret: SECRET, keyId: KEY });
    sealed.integrity!.sealedAt = '2030-01-01T00:00:00Z';
    expect(verify(sealed, SECRET)).toEqual({ valid: true });
  });

  it('chain verifies in order and reports the first break', () => {
    const base = ['read-only.json', 'approved-write.json', 'denied-write.json'].map(load);
    const chain: ActionProvenanceRecord[] = [];
    let prev: `sha256:${string}` | null = null;
    base.forEach((r, seq) => {
      const s = seal(r, { secret: SECRET, keyId: KEY, chain: { scope: 'org_acme', seq, prev } });
      chain.push(s);
      prev = s.integrity!.contentDigest;
    });
    expect(chain[0]!.integrity!.chain!.prev).toBeNull();
    expect(verifyChain(chain, SECRET, 'org_acme')).toEqual({ ok: true, verified: 3 });
    expect(verifyChain([chain[0]!, chain[2]!], SECRET, 'org_acme')).toMatchObject({ ok: false, reason: 'seq_gap', brokenAtSeq: 2 });
    const relinked = structuredClone(chain);
    relinked[1]!.integrity!.chain!.prev = ('sha256:' + '0'.repeat(64)) as `sha256:${string}`;
    expect(verifyChain(relinked, SECRET, 'org_acme').reason).toBe('broken_prev_link');
    expect(verifyChain(chain, SECRET, 'org_other').reason).toBe('wrong_scope');
  });

  it('rejects weak secrets', () => {
    expect(() => seal(load('read-only.json'), { secret: 'short', keyId: KEY })).toThrow();
  });
});

describe('builder', () => {
  it('createRecord fills spec, id and recordedAt, and the result validates', () => {
    const r = createRecord({
      correlationId: 'corr_x',
      action: { kind: 'chat_turn', at: new Date().toISOString(), effect: 'none' },
      principal: { id: 'u1', type: 'human' },
      model: { resolved: 'none', provider: 'none' },
      outcome: { status: 'succeeded' },
    });
    expect(r.spec).toBe('action-provenance/1.0');
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(validate(r).level).toBeGreaterThanOrEqual(1);
  });

  it('groupByCorrelation preserves order within a run', () => {
    const a = load('read-only.json');
    const b = { ...a, id: 'b' };
    const groups = groupByCorrelation([a, b, load('denied-write.json')]);
    expect(groups.get(a.correlationId)?.map((x) => x.id)).toEqual([a.id, 'b']);
    expect(groups.size).toBe(2);
  });
});
