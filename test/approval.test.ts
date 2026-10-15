import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { covers, createAttestation, sealAttestation, validateAttestation, verifyAttestation } from '../src/index.js';
import type { ActionApprovalAttestation } from '../src/index.js';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../examples/${name}`, import.meta.url), 'utf8')) as ActionApprovalAttestation;
const SECRET = 'test-secret-at-least-16-chars';
const KEY = 'test-key-v1';

describe('attestation validation', () => {
  it('a single-scope human approval is Level 2 unsealed and Level 3 sealed', () => {
    const a = load('approval-single.json');
    expect(validateAttestation(a).level).toBe(2);
    expect(validateAttestation(sealAttestation(a, { secret: SECRET, keyId: KEY }), { targetLevel: 3 })).toMatchObject({ valid: true, level: 3 });
  });

  it('a standing grant must say what it matches on and carry a bound', () => {
    const a = load('approval-standing.json');
    expect(validateAttestation(a).level).toBe(2);
    const noMatch = structuredClone(a);
    delete noMatch.constraints!.matchOn;
    expect(validateAttestation(noMatch).issues.some((i) => i.path === '/constraints/matchOn')).toBe(true);
    const unbounded = structuredClone(a);
    delete unbounded.constraints!.expiresAt;
    delete unbounded.constraints!.maxUses;
    expect(validateAttestation(unbounded).issues.some((i) => i.path === '/constraints')).toBe(true);
  });

  it('a human decision must be made by a human; an auto decision must cite a policy', () => {
    const a = load('approval-single.json');
    a.approver = { id: 'svc_policy', type: 'service' };
    expect(validateAttestation(a).issues.some((i) => i.path === '/approver/type')).toBe(true);
    a.decision = 'auto';
    delete a.policy;
    expect(validateAttestation(a).issues.some((i) => i.path === '/policy/ref')).toBe(true);
  });

  it('argsDigest is mandatory: an approval that does not bind the arguments is not Level 1', () => {
    const a = load('approval-single.json') as unknown as { proposal: Record<string, unknown> };
    delete a.proposal.argsDigest;
    expect(validateAttestation(a).level).toBe(0);
  });
});

describe('attestation integrity', () => {
  it('seal, verify, and detect a changed proposal', () => {
    const sealed = sealAttestation(load('approval-single.json'), { secret: SECRET, keyId: KEY });
    expect(verifyAttestation(sealed, SECRET)).toEqual({ valid: true });
    const tampered = structuredClone(sealed);
    tampered.proposal.argsDigest = ('sha256:' + 'f'.repeat(64)) as `sha256:${string}`;
    expect(verifyAttestation(tampered, SECRET).reason).toBe('content_digest_mismatch');
  });
});

describe('coverage', () => {
  const single = load('approval-single.json');
  const standing = load('approval-standing.json');
  const at = (iso: string) => new Date(iso);

  it('a single grant covers exactly the approved arguments and correlation', () => {
    const ok = covers(single, { proposal: { ...single.proposal }, correlationId: single.correlationId });
    expect(ok.covered).toBe(true);
    const otherArgs = covers(single, { proposal: { ...single.proposal, argsDigest: 'sha256:' + '1'.repeat(64) }, correlationId: single.correlationId });
    expect(otherArgs).toMatchObject({ covered: false, reason: 'args_mismatch' });
    const otherRun = covers(single, { proposal: { ...single.proposal }, correlationId: 'corr_other' });
    expect(otherRun).toMatchObject({ covered: false, reason: 'correlation_mismatch' });
  });

  it('a standing grant matches on the named members and ignores arguments', () => {
    const proposal = { kind: 'tool_call', tool: 'xero.create_invoice_draft', target: 'xero', effect: 'write' as const, argsDigest: 'sha256:' + '9'.repeat(64) };
    expect(covers(standing, { proposal, correlationId: 'corr_new', now: at('2026-09-02T04:00:00Z') }).covered).toBe(true);
    expect(covers(standing, { proposal: { ...proposal, tool: 'xero.publish_invoice' }, correlationId: 'corr_new', now: at('2026-09-02T04:00:00Z') })).toMatchObject({ covered: false, reason: 'mismatch:tool' });
    expect(covers(standing, { proposal: { ...proposal, effect: 'read' }, correlationId: 'corr_new', now: at('2026-09-02T04:00:00Z') })).toMatchObject({ covered: false, reason: 'effect_mismatch' });
  });

  it('a standing grant stops covering when expired, exhausted, or revoked', () => {
    const proposal = { kind: 'tool_call', tool: 'xero.create_invoice_draft', target: 'xero', effect: 'write' as const, argsDigest: 'sha256:' + '9'.repeat(64) };
    expect(covers(standing, { proposal, correlationId: 'c', now: at('2026-09-03T00:00:00Z') })).toMatchObject({ covered: false, reason: 'expired' });
    expect(covers(standing, { proposal, correlationId: 'c', now: at('2026-09-02T04:00:00Z'), usesSoFar: 50 })).toMatchObject({ covered: false, reason: 'exhausted' });
    const revoked = structuredClone(standing);
    revoked.revoked = { at: '2026-09-02T05:00:00Z', reason: 'run finished early' };
    expect(covers(revoked, { proposal, correlationId: 'c', now: at('2026-09-02T04:00:00Z') })).toMatchObject({ covered: false, reason: 'revoked' });
  });

  it('a rejection never covers anything', () => {
    const rejected = structuredClone(single);
    rejected.decision = 'rejected';
    expect(covers(rejected, { proposal: { ...single.proposal }, correlationId: single.correlationId })).toMatchObject({ covered: false, reason: 'not_approved' });
  });

  it('createAttestation fills spec, id and decidedAt', () => {
    const a = createAttestation({
      correlationId: 'c1',
      proposal: { kind: 'tool_call', effect: 'write', argsDigest: ('sha256:' + '2'.repeat(64)) as `sha256:${string}` },
      principal: { id: 'u1', type: 'human' },
      approver: { id: 'u1', type: 'human' },
      decision: 'approved',
      scope: 'single',
    });
    expect(a.spec).toBe('action-approval/1.0');
    expect(validateAttestation(a).level).toBe(2);
  });
});
