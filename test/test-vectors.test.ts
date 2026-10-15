import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  canonicalJson, chainLinkMessage, contentDigest, covers, macMessage, seal, sealAttestation,
  sha256Digest, validate, validateAttestation, verify, verifyAttestation, verifyChain,
} from '../src/index.js';
import type { ActionApprovalAttestation, ActionProvenanceRecord, CoverageCheck, Digest } from '../src/index.js';

// Checks the reference implementation against the published test vectors in
// test-vectors/. Independent implementations can port these assertions.

type DocType = 'record' | 'attestation';
type Doc = Record<string, unknown>;
interface Key { keyId: string; secret: string; secretUtf8Hex: string }

const load = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../test-vectors/${name}`, import.meta.url), 'utf8')) as T;
const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hmacB64url = (secret: string, message: string) =>
  b64url(createHmac('sha256', Buffer.from(secret, 'utf8')).update(message, 'utf8').digest());
const asRecord = (d: Doc) => d as unknown as ActionProvenanceRecord;
const asAttestation = (d: Doc) => d as unknown as ActionApprovalAttestation;

describe('test vectors: canonical form', () => {
  const file = load<{ vectors: { name: string; input: string; canonical: string; canonicalUtf8Hex: string; sha256: string }[] }>('canonical-form.json');
  for (const v of file.vectors) {
    it(v.name, () => {
      const canonical = canonicalJson(JSON.parse(v.input));
      expect(canonical).toBe(v.canonical);
      expect(Buffer.from(canonical, 'utf8').toString('hex')).toBe(v.canonicalUtf8Hex);
      expect(sha256Digest(canonical)).toBe(v.sha256);
    });
  }
});

describe('test vectors: content digest', () => {
  const file = load<{ vectors: { name: string; document: Doc; canonical: string; contentDigest: string }[] }>('content-digest.json');
  for (const v of file.vectors) {
    it(v.name, () => {
      const { integrity: _omit, ...content } = v.document;
      expect(canonicalJson(content)).toBe(v.canonical);
      expect(contentDigest(v.document)).toBe(v.contentDigest);
      expect(sha256Digest(v.canonical)).toBe(v.contentDigest);
    });
  }
});

describe('test vectors: seal and verify', () => {
  const file = load<{
    keys: Record<'test' | 'other', Key>;
    sealedAt: string;
    vectors: { name: string; type: DocType; document: Doc; contentDigest: Digest; macMessage: string; mac: { value: string }; sealed: Doc }[];
    verifyCases: { name: string; type: DocType; key: 'test' | 'other'; document: Doc; expected: { valid: boolean; reason?: string } }[];
  }>('seal-and-verify.json');
  const now = () => new Date(file.sealedAt);
  const opts = { secret: file.keys.test.secret, keyId: file.keys.test.keyId, now };

  it('publishes each key as UTF-8 text and hex', () => {
    for (const k of Object.values(file.keys)) expect(Buffer.from(k.secret, 'utf8').toString('hex')).toBe(k.secretUtf8Hex);
  });

  for (const v of file.vectors) {
    it(`seal ${v.name}`, () => {
      const sealed = v.type === 'record' ? seal(asRecord(v.document), opts) : sealAttestation(asAttestation(v.document), opts);
      expect(sealed).toEqual(v.sealed);
      expect(contentDigest(v.document)).toBe(v.contentDigest);
      expect(macMessage(v.contentDigest)).toBe(v.macMessage);
      // The MAC recomputed directly with node:crypto, independently of seal().
      expect(hmacB64url(file.keys.test.secret, v.macMessage)).toBe(v.mac.value);
    });
  }

  for (const c of file.verifyCases) {
    it(`verify ${c.name}`, () => {
      const secret = file.keys[c.key].secret;
      const result = c.type === 'record' ? verify(asRecord(c.document), secret) : verifyAttestation(asAttestation(c.document), secret);
      expect(result).toEqual(c.expected);
    });
  }
});

describe('test vectors: chain', () => {
  const file = load<{
    key: Key;
    scope: string;
    vectors: { seq: number; document: Doc; contentDigest: Digest; prev: Digest | null; linkMessage: string; link: { value: string }; sealed: Doc & { integrity: { sealedAt: string } } }[];
    chainCases: { name: string; scope: string; records: Doc[]; expected: Record<string, unknown> }[];
  }>('chain.json');

  for (const v of file.vectors) {
    it(`seal seq ${v.seq}`, () => {
      const now = () => new Date(v.sealed.integrity.sealedAt);
      const sealed = seal(asRecord(v.document), { secret: file.key.secret, keyId: file.key.keyId, now, chain: { scope: file.scope, seq: v.seq, prev: v.prev } });
      expect(sealed).toEqual(v.sealed);
      expect(chainLinkMessage(v.contentDigest, v.prev)).toBe(v.linkMessage);
      expect(hmacB64url(file.key.secret, v.linkMessage)).toBe(v.link.value);
    });
  }

  for (const c of file.chainCases) {
    it(`verifyChain ${c.name}`, () => {
      expect(verifyChain(c.records.map(asRecord), file.key.secret, c.scope)).toEqual(c.expected);
    });
  }
});

describe('test vectors: coverage', () => {
  const file = load<{
    args: { approved: unknown; approvedDigest: string; changed: unknown; changedDigest: string };
    grants: Record<string, Doc>;
    cases: { name: string; grant: string; check: Omit<CoverageCheck, 'now'> & { now: string }; expected: { covered: boolean; reason?: string } }[];
  }>('coverage.json');

  it('argument digests are canonical SHA-256 digests', () => {
    expect(sha256Digest(canonicalJson(file.args.approved))).toBe(file.args.approvedDigest);
    expect(sha256Digest(canonicalJson(file.args.changed))).toBe(file.args.changedDigest);
  });

  for (const c of file.cases) {
    it(c.name, () => {
      const grant = file.grants[c.grant];
      expect(grant).toBeDefined();
      const { now, ...rest } = c.check;
      expect(covers(asAttestation(grant!), { ...rest, now: new Date(now) })).toEqual(c.expected);
    });
  }
});

describe('test vectors: conformance levels', () => {
  const file = load<{ cases: { name: string; type: DocType; document: Doc; expectedLevel: number; failingAtNextLevel: string[] }[] }>('conformance-levels.json');
  for (const c of file.cases) {
    it(c.name, () => {
      const result = c.type === 'record' ? validate(c.document) : validateAttestation(c.document);
      expect(result.level).toBe(c.expectedLevel);
      const atNext = [...new Set(result.issues.filter((i) => i.level === result.level + 1).map((i) => i.path))];
      expect(atNext).toEqual(c.failingAtNextLevel);
    });
  }
});
