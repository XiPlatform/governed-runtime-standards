// Generates the files in test-vectors/ from the reference implementation.
//
//   npm run test-vectors
//
// The script builds nothing itself: it imports the compiled library from dist/,
// so run it through the npm script, which compiles first. Output is
// deterministic: fixed identifiers, fixed timestamps and a published test key.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalJson, sha256Digest, contentDigest, macMessage, chainLinkMessage,
  seal, verify, verifyChain, sealAttestation, verifyAttestation, covers,
  validate, validateAttestation,
} from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'test-vectors');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const example = (name) => JSON.parse(readFileSync(join(root, 'examples', name), 'utf8'));
const clone = (v) => structuredClone(v);
const hex = (s) => Buffer.from(s, 'utf8').toString('hex');

const TEST_KEY = { keyId: 'test-vector-key-1', secret: 'GRS-TEST-VECTOR-KEY-1.0-NOT-A-SECRET' };
const OTHER_KEY = { keyId: 'test-vector-key-2', secret: 'GRS-OTHER-TEST-KEY-1.0-NOT-A-SECRET' };
const keyBlock = (k) => ({ keyId: k.keyId, secret: k.secret, secretUtf8Hex: hex(k.secret) });
const SEALED_AT = '2026-09-02T04:00:00.000Z';
const now = () => new Date(SEALED_AT);
const sealOpts = (extra = {}) => ({ secret: TEST_KEY.secret, keyId: TEST_KEY.keyId, now, ...extra });

const header = (title, specs, notes) => ({
  title,
  specs,
  generator: `governed-runtime ${pkg.version} reference implementation, scripts/generate-test-vectors.mjs`,
  notes,
});

function write(name, body) {
  writeFileSync(join(outDir, name), JSON.stringify(body, null, 2) + '\n');
  console.log(`wrote test-vectors/${name}`);
}

mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// 1. Canonical form
// ---------------------------------------------------------------------------

const canonicalCases = [
  ['member-order', 'Object members are sorted by key at every level. Arrays keep their order.',
    '{"b":1,"a":{"d":[3,1,2],"c":null}}'],
  ['whitespace', 'Insignificant whitespace is removed.',
    '{\n  "z" : [ 1 , 2 ],\n  "y" : { "x" : "" }\n}'],
  ['literals-and-empty-values', 'true, false, null, empty object, empty array and empty string.',
    '{"t":true,"f":false,"n":null,"o":{},"a":[],"s":""}'],
  ['numbers', 'Numbers are serialised as by ECMAScript JSON.stringify (Number::toString): no trailing zeros, negative zero as 0, exponent form from 1e21 and below 1e-6.',
    '{"int":1,"trailingZero":1.0,"negativeZero":-0,"half":1.5,"tenth":0.1,"third":0.3333333333333333,"exponentUpper":2E3,"belowExponent":100000000000000000000,"atExponent":1e21,"smallPlain":0.000001,"smallExponent":1e-7,"beyondPrecision":123456789012345678901234567890,"negative":-42}'],
  ['strings', 'Strings are serialised as by ECMAScript JSON.stringify: quotation mark, reverse solidus and control characters are escaped (\\b \\t \\n \\f \\r or lowercase \\u00XX); the solidus, DEL and all other characters, including U+2028, are written as UTF-8.',
    '{"quote":"\\"","backslash":"\\\\","solidus":"\\/","newline":"\\n","tab":"\\t","backspace":"\\b","control":"\\u0001","unitSeparator":"\\u001F","delete":"\\u007f","latin":"\\u00e9","cjk":"\\u6f22","emoji":"\\ud83d\\ude00","lineSeparator":"\\u2028"}'],
  ['key-order-utf16', 'Keys are compared as sequences of UTF-16 code units, not code points: U+1F600 (code units D83D DE00) sorts before U+E000. The empty key sorts first, and a key sorts before any longer key it prefixes.',
    '{"\\ue000":1,"\\ud83d\\ude00":2,"a":3,"A":4,"\\u00e9":5,"aa":6,"":7}'],
  ['nested-arrays', 'Objects inside arrays are canonicalised; the array order is preserved.',
    '[{"b":[{"d":1,"c":2}],"a":0},[],"x"]'],
  ['integrity-is-ordinary-content', 'Removing the integrity member is part of computing a document digest (content-digest.json), not of canonical serialisation. In other content, such as tool arguments, a member named integrity is serialised like any other.',
    '{"to":"accounts@northwind.example","integrity":"retained"}'],
];

write('canonical-form.json', {
  ...header('Canonical serialisation and SHA-256 digests', ['action-provenance/1.0', 'action-approval/1.0'], [
    'input is JSON text. Parse it, serialise it in canonical form, and compare with canonical.',
    'canonicalUtf8Hex is the UTF-8 encoding of canonical. sha256 is the digest of those bytes in the specification syntax.',
    'For inputs made of standard JSON values these outputs are identical to RFC 8785 (JCS).',
  ]),
  vectors: canonicalCases.map(([name, description, input]) => {
    const canonical = canonicalJson(JSON.parse(input));
    return { name, description, input, canonical, canonicalUtf8Hex: hex(canonical), sha256: sha256Digest(canonical) };
  }),
});

// ---------------------------------------------------------------------------
// 2. Content digests of documents
// ---------------------------------------------------------------------------

const withoutIntegrity = (doc) => { const { integrity: _omit, ...rest } = doc; return rest; };
const sealedApprovedWrite = seal(example('approved-write.json'), sealOpts());
const nestedIntegrity = {
  ...example('read-only.json'),
  extensions: { 'com.example': { integrity: 'nested members named integrity are content' } },
};

const digestDocs = [
  ['record-read-only', 'record', 'examples/read-only.json', example('read-only.json')],
  ['record-approved-write', 'record', 'examples/approved-write.json', example('approved-write.json')],
  ['record-denied-write', 'record', 'examples/denied-write.json', example('denied-write.json')],
  ['record-sealed-integrity-removed', 'record', 'The sealed form of examples/approved-write.json. The top-level integrity member is removed before digesting, so the digest equals that of the unsealed record.', sealedApprovedWrite],
  ['record-nested-integrity-kept', 'record', 'Only the top-level integrity member is removed. A nested member with the same name is content.', nestedIntegrity],
  ['attestation-single', 'attestation', 'examples/approval-single.json', example('approval-single.json')],
  ['attestation-standing', 'attestation', 'examples/approval-standing.json', example('approval-standing.json')],
];

write('content-digest.json', {
  ...header('Content digests of records and attestations', ['action-provenance/1.0', 'action-approval/1.0'], [
    'contentDigest is the digest of the canonical form of document with its top-level integrity member removed.',
    'canonical is that canonical form, given so that a mismatch can be located.',
  ]),
  vectors: digestDocs.map(([name, type, description, document]) => ({
    name, type, description, document,
    canonical: canonicalJson(withoutIntegrity(document)),
    contentDigest: contentDigest(document),
  })),
});

// ---------------------------------------------------------------------------
// 3. Sealing with a keyed MAC, and verification
// ---------------------------------------------------------------------------

const sealVectors = [
  ['record-read-only', 'record', example('read-only.json')],
  ['record-approved-write', 'record', example('approved-write.json')],
  ['record-denied-write', 'record', example('denied-write.json')],
  ['attestation-single', 'attestation', example('approval-single.json')],
  ['attestation-standing', 'attestation', example('approval-standing.json')],
].map(([name, type, document]) => {
  const sealed = type === 'record' ? seal(document, sealOpts()) : sealAttestation(document, sealOpts());
  return {
    name, type, document,
    contentDigest: sealed.integrity.contentDigest,
    macMessage: macMessage(sealed.integrity.contentDigest),
    mac: sealed.integrity.mac,
    sealed,
  };
});

const sealedRecord = sealVectors.find((v) => v.name === 'record-approved-write').sealed;
const sealedAttestation = sealVectors.find((v) => v.name === 'attestation-single').sealed;

const verifyCases = [];
const addVerify = (name, description, type, key, document) => {
  const secret = key === 'test' ? TEST_KEY.secret : OTHER_KEY.secret;
  const expected = type === 'record' ? verify(document, secret) : verifyAttestation(document, secret);
  verifyCases.push({ name, description, type, key, document, expected });
};
addVerify('record-valid', 'An unmodified sealed record verifies.', 'record', 'test', sealedRecord);
{
  const d = clone(sealedRecord); d.integrity.sealedAt = '2030-01-01T00:00:00.000Z';
  addVerify('record-sealedAt-changed', 'sealedAt is informational and excluded from every proof.', 'record', 'test', d);
}
{
  const d = clone(sealedRecord); d.outcome.status = 'failed';
  addVerify('record-content-changed', 'A member changed after sealing: the content digest no longer matches.', 'record', 'test', d);
}
addVerify('record-wrong-key', 'Verified with a different key: the MAC does not match.', 'record', 'other', sealedRecord);
{
  const d = clone(sealedRecord);
  const v = d.integrity.mac.value;
  d.integrity.mac.value = (v[0] === 'A' ? 'B' : 'A') + v.slice(1);
  addVerify('record-mac-altered', 'The MAC value altered: the MAC does not match.', 'record', 'test', d);
}
{
  const d = clone(sealedRecord); delete d.integrity.mac;
  addVerify('record-no-mac', 'An integrity member without a MAC. The reference implementation verifies MACs only.', 'record', 'test', d);
}
addVerify('record-unsealed', 'A record with no integrity member.', 'record', 'test', example('approved-write.json'));
addVerify('attestation-valid', 'An unmodified sealed attestation verifies.', 'attestation', 'test', sealedAttestation);
{
  const d = clone(sealedAttestation);
  d.proposal.argsDigest = sha256Digest(canonicalJson({ to: 'attacker@example.net' }));
  addVerify('attestation-proposal-changed', 'The approved arguments digest replaced after sealing.', 'attestation', 'test', d);
}
addVerify('attestation-wrong-key', 'Verified with a different key.', 'attestation', 'other', sealedAttestation);

write('seal-and-verify.json', {
  ...header('Sealing with HMAC-SHA256 and offline verification', ['action-provenance/1.0', 'action-approval/1.0'], [
    'The keys below are published test keys. Never use them to seal real records.',
    'The HMAC key is the UTF-8 encoding of secret (secretUtf8Hex). The MAC message is the UTF-8 encoding of the contentDigest string.',
    'mac.value is the base64url encoding, without padding, of HMAC-SHA256(key, macMessage).',
    'sealed is the reference output with sealedAt fixed; sealedAt is informational and is not covered by any proof.',
    'In verifyCases, valid is normative. reason is the reference implementation result code and is informative.',
  ]),
  keys: { test: keyBlock(TEST_KEY), other: keyBlock(OTHER_KEY) },
  sealedAt: SEALED_AT,
  vectors: sealVectors,
  verifyCases,
});

// ---------------------------------------------------------------------------
// 4. Per-scope chains
// ---------------------------------------------------------------------------

const SCOPE = 'tenant_example';
const chainRecord = (n, kind, effect, status) => ({
  spec: 'action-provenance/1.0',
  id: `chain-record-${n}`,
  correlationId: `corr_chain_${n}`,
  recordedAt: `2026-09-02T03:0${n}:30.000Z`,
  action: { kind, at: `2026-09-02T03:0${n}:00.000Z`, effect },
  principal: { id: 'user_1', type: 'human', tenant: SCOPE },
  model: { resolved: 'none', provider: 'none' },
  policy: { verdict: status === 'denied' ? 'deny' : 'allow', ref: 'pol_default', version: '1' },
  outcome: { status },
});
const chainInputs = [
  chainRecord(0, 'chat_turn', 'none', 'succeeded'),
  chainRecord(1, 'tool_call', 'read', 'succeeded'),
  chainRecord(2, 'tool_call', 'write', 'denied'),
];
const chainSealed = [];
const chainVectors = [];
let prev = null;
chainInputs.forEach((document, seq) => {
  const sealed = seal(document, sealOpts({ chain: { scope: SCOPE, seq, prev } }));
  chainSealed.push(sealed);
  chainVectors.push({
    seq, document,
    contentDigest: sealed.integrity.contentDigest,
    prev,
    linkMessage: chainLinkMessage(sealed.integrity.contentDigest, prev),
    link: sealed.integrity.chain.link,
    mac: sealed.integrity.mac,
    sealed,
  });
  prev = sealed.integrity.contentDigest;
});

const chainCases = [];
const addChain = (name, description, records, scope = SCOPE) => {
  chainCases.push({ name, description, scope, records, expected: verifyChain(records, TEST_KEY.secret, scope) });
};
addChain('intact', 'Three records in order from genesis.', chainSealed);
addChain('segment', 'A contiguous segment that starts after genesis, as in an export for one day. The first record\'s prev cannot be checked without its predecessor.', chainSealed.slice(1));
addChain('gap', 'The record at seq 1 is missing.', [chainSealed[0], chainSealed[2]]);
addChain('reordered', 'Records presented out of order.', [chainSealed[1], chainSealed[0], chainSealed[2]]);
{
  const r = clone(chainSealed); r[1].integrity.chain.prev = 'sha256:' + '0'.repeat(64);
  addChain('broken-prev', 'The record at seq 1 points at a digest that is not its predecessor\'s.', r);
}
{
  const r = clone(chainSealed); r[1].outcome.status = 'failed';
  addChain('content-changed', 'The record at seq 1 was changed after sealing.', r);
}
{
  const r = clone(chainSealed);
  const c = r[2].integrity;
  r[2].integrity.chain.link = { ...c.chain.link, value: seal(chainInputs[2], { secret: OTHER_KEY.secret, keyId: TEST_KEY.keyId, now, chain: { scope: SCOPE, seq: 2, prev: c.chain.prev } }).integrity.chain.link.value };
  addChain('forged-link', 'The link proof at seq 2 was computed with a different key.', r);
}
addChain('wrong-scope', 'An intact chain verified against a different scope.', chainSealed, 'tenant_other');

write('chain.json', {
  ...header('Per-scope chains', ['action-provenance/1.0'], [
    'Records are sealed with the test key from seal-and-verify.json.',
    'linkMessage is contentDigest, a full stop, and prev or the literal GENESIS. link.value is the base64url encoding, without padding, of HMAC-SHA256(key, linkMessage).',
    'In chainCases, ok and brokenAtSeq are normative: a verifier reports the first failing sequence number. verified and reason are reference implementation results and are informative.',
  ]),
  key: keyBlock(TEST_KEY),
  scope: SCOPE,
  vectors: chainVectors,
  chainCases,
});

// ---------------------------------------------------------------------------
// 5. Approval coverage
// ---------------------------------------------------------------------------

const approvedArgs = { to: 'accounts@northwind.example', subject: 'August aged-receivables reminder', attachments: ['INV-0419'] };
const changedArgs = { ...approvedArgs, to: 'accounts@northwind-payments.example' };
const approvedArgsDigest = sha256Digest(canonicalJson(approvedArgs));
const changedArgsDigest = sha256Digest(canonicalJson(changedArgs));

const single = { ...example('approval-single.json') };
single.proposal = { ...single.proposal, argsDigest: approvedArgsDigest };
const standing = example('approval-standing.json');
const grants = {
  single,
  standing,
  session: {
    spec: 'action-approval/1.0', id: 'att_session_example', correlationId: 'sess_7c2e',
    proposal: { kind: 'tool_call', tool: 'jira.add_comment', target: 'jira', effect: 'write', argsDigest: 'sha256:' + '4'.repeat(64) },
    principal: { id: 'user_2f9a', type: 'human' }, approver: { id: 'user_2f9a', type: 'human' },
    decision: 'approved', scope: 'session', constraints: { matchOn: ['tool', 'effect'] },
    decidedAt: '2026-09-02T03:00:00.000Z', method: 'ui',
  },
  rejected: { ...clone(single), id: 'att_rejected_example', decision: 'rejected' },
  revoked: { ...clone(standing), id: 'att_revoked_example', revoked: { at: '2026-09-02T05:00:00.000Z', by: { id: 'user_2f9a', type: 'human' }, reason: 'run finished early' } },
  auto: {
    spec: 'action-approval/1.0', id: 'att_auto_example', correlationId: 'corr_auto',
    proposal: { kind: 'tool_call', tool: 'calendar.create_hold', target: 'microsoft-outlook', effect: 'write', argsDigest: 'sha256:' + '5'.repeat(64) },
    principal: { id: 'user_2f9a', type: 'human' }, approver: { id: 'policy-engine', type: 'service' },
    decision: 'auto', scope: 'standing', constraints: { matchOn: ['tool', 'target', 'effect'], maxUses: 3 },
    decidedAt: '2026-09-02T03:00:00.000Z', method: 'policy', policy: { ref: 'pol_calendar_holds', version: '1' },
  },
};

const sp = single.proposal;
const draft = { kind: 'tool_call', tool: 'xero.create_invoice_draft', target: 'xero', effect: 'write', argsDigest: 'sha256:' + '9'.repeat(64) };
const comment = { kind: 'tool_call', tool: 'jira.add_comment', target: 'jira', effect: 'write', argsDigest: 'sha256:' + '6'.repeat(64) };
const hold = { kind: 'tool_call', tool: 'calendar.create_hold', target: 'microsoft-outlook', effect: 'write', argsDigest: 'sha256:' + '7'.repeat(64) };
const WITHIN = '2026-09-02T04:00:00.000Z';

const coverageCases = [
  ['single-exact', 'The exact approved arguments in the approved correlation.', 'single', 6,
    { proposal: { ...sp }, correlationId: single.correlationId, now: WITHIN }],
  ['single-args-changed', 'Approve X, execute Y: the recipient changed after approval, so the arguments digest differs.', 'single', 6,
    { proposal: { ...sp, argsDigest: changedArgsDigest }, correlationId: single.correlationId, now: WITHIN }],
  ['single-other-correlation', 'The same arguments in a different action.', 'single', 6,
    { proposal: { ...sp }, correlationId: 'corr_other', now: WITHIN }],
  ['single-effect-mismatch', 'The proposal effect differs from the approved effect.', 'single', 5,
    { proposal: { ...sp, effect: 'read' }, correlationId: single.correlationId, now: WITHIN }],
  ['rejected', 'A rejected decision never covers anything.', 'rejected', 1,
    { proposal: { ...sp }, correlationId: single.correlationId, now: WITHIN }],
  ['revoked', 'A revoked grant stops covering immediately.', 'revoked', 2,
    { proposal: { ...draft }, correlationId: 'corr_new', now: WITHIN }],
  ['standing-other-arguments', 'A standing grant does not match arguments; it matches the members named in matchOn.', 'standing', 7,
    { proposal: { ...draft }, correlationId: 'corr_new', now: WITHIN }],
  ['standing-tool-mismatch', 'A different tool on the same target.', 'standing', 7,
    { proposal: { ...draft, tool: 'xero.publish_invoice' }, correlationId: 'corr_new', now: WITHIN }],
  ['standing-target-mismatch', 'The same tool name against a different target system.', 'standing', 7,
    { proposal: { ...draft, target: 'quickbooks' }, correlationId: 'corr_new', now: WITHIN }],
  ['standing-before-expiry', 'One millisecond before expiresAt.', 'standing', 3,
    { proposal: { ...draft }, correlationId: 'corr_new', now: '2026-09-02T11:12:38.639Z' }],
  ['standing-at-expiry', 'At exactly expiresAt: expiresAt must be later than now, so the grant no longer covers.', 'standing', 3,
    { proposal: { ...draft }, correlationId: 'corr_new', now: '2026-09-02T11:12:38.640Z' }],
  ['standing-after-expiry', 'After expiresAt.', 'standing', 3,
    { proposal: { ...draft }, correlationId: 'corr_new', now: '2026-09-03T00:00:00.000Z' }],
  ['standing-last-use', 'maxUses is 50 and 49 executions have been made.', 'standing', 4,
    { proposal: { ...draft }, correlationId: 'corr_new', now: WITHIN, usesSoFar: 49 }],
  ['standing-exhausted', 'maxUses is 50 and 50 executions have been made.', 'standing', 4,
    { proposal: { ...draft }, correlationId: 'corr_new', now: WITHIN, usesSoFar: 50 }],
  ['session-same-correlation', 'A session grant used with its own correlation.', 'session', 7,
    { proposal: { ...comment }, correlationId: 'sess_7c2e', now: WITHIN }],
  ['session-same-session', 'A session grant used by another action in the same session.', 'session', 7,
    { proposal: { ...comment }, correlationId: 'corr_in_session', sessionId: 'sess_7c2e', now: WITHIN }],
  ['session-other-session', 'A session grant presented in a different session.', 'session', 7,
    { proposal: { ...comment }, correlationId: 'corr_elsewhere', sessionId: 'sess_9d41', now: WITHIN }],
  ['session-target-not-matched', 'matchOn names tool and effect only, so a different target is still covered.', 'session', 7,
    { proposal: { ...comment, target: 'jira-cloud-2' }, correlationId: 'corr_in_session', sessionId: 'sess_7c2e', now: WITHIN }],
  ['auto-within-limit', 'A policy-granted auto grant within its use limit.', 'auto', 4,
    { proposal: { ...hold }, correlationId: 'corr_any', now: WITHIN, usesSoFar: 2 }],
  ['auto-exhausted', 'A policy-granted auto grant at its use limit.', 'auto', 4,
    { proposal: { ...hold }, correlationId: 'corr_any', now: WITHIN, usesSoFar: 3 }],
].map(([name, description, grant, rule, check]) => {
  const { now: at, ...rest } = check;
  return { name, description, grant, rule, check, expected: covers(grants[grant], { ...rest, now: new Date(at) }) };
});

write('coverage.json', {
  ...header('Approval coverage', ['action-approval/1.0'], [
    'Each case asks whether grants[grant] covers check.proposal, executed now at check.now with correlation check.correlationId (and session check.sessionId, when given), after check.usesSoFar executions under the grant (0 when absent).',
    'rule is the step of the coverage algorithm that decides the case.',
    'expected.covered is normative. expected.reason is the reference implementation result code and is informative.',
    'args and changedArgs show how the single grant\'s argsDigest and the changed digest in single-args-changed were computed: the SHA-256 digest of the canonical form of the arguments.',
  ]),
  args: { approved: approvedArgs, approvedDigest: approvedArgsDigest, changed: changedArgs, changedDigest: changedArgsDigest },
  grants,
  cases: coverageCases,
});

// ---------------------------------------------------------------------------
// 6. Conformance levels
// ---------------------------------------------------------------------------

const levelCases = [];
const addLevel = (name, description, type, document) => {
  const res = type === 'record' ? validate(document) : validateAttestation(document);
  const failing = res.issues.filter((i) => i.level === res.level + 1).map((i) => i.path);
  levelCases.push({ name, description, type, document, expectedLevel: res.level, failingAtNextLevel: [...new Set(failing)] });
};

addLevel('record-read-only', 'A read-only chat turn with a policy verdict.', 'record', example('read-only.json'));
addLevel('record-approved-write', 'A human-approved write, unsealed.', 'record', example('approved-write.json'));
addLevel('record-denied-write', 'A write refused by policy before it reached approval.', 'record', example('denied-write.json'));
addLevel('record-approved-write-sealed', 'The approved write, sealed with the test key.', 'record', sealedRecord);
{
  const d = clone(sealedRecord); d.outcome.status = 'failed';
  addLevel('record-sealed-then-changed', 'Sealed, then changed: the content digest is no longer correct, so the record is not Level 3.', 'record', d);
}
{
  const d = clone(sealedRecord); delete d.integrity.mac;
  addLevel('record-digest-without-proof', 'A correct content digest without a MAC or a signature.', 'record', d);
}
{
  const d = example('approved-write.json'); delete d.approval.approver;
  addLevel('record-write-without-approver', 'A succeeded, approved write that does not name the approver.', 'record', d);
}
{
  const d = example('approved-write.json'); delete d.approval;
  addLevel('record-write-without-approval', 'A succeeded write with no approval member.', 'record', d);
}
{
  const d = example('approved-write.json'); d.approval = { required: true, decision: 'auto' }; delete d.policy.ref;
  addLevel('record-auto-without-policy-ref', 'An auto-approved write that does not cite the policy that granted autonomy.', 'record', d);
}
{
  const d = example('approved-write.json'); d.approval = { required: true, decision: 'auto' };
  addLevel('record-auto-with-policy-ref', 'An auto-approved write under a cited policy.', 'record', d);
}
{
  const d = example('denied-write.json');
  d.outcome = { status: 'succeeded' };
  d.effects = [{ tool: 'crm.delete_contacts', target: 'crm', status: 'succeeded', sideEffecting: true, resultRef: 'job_1' }];
  addLevel('record-deny-verdict-succeeded-write', 'A deny verdict alongside a succeeded write.', 'record', d);
}
{
  const d = example('approved-write.json'); delete d.effects[0].responseDigest; delete d.effects[0].resultRef;
  addLevel('record-side-effect-without-result', 'A succeeded side effect without responseDigest or resultRef.', 'record', d);
}
{
  const d = example('read-only.json'); delete d.policy;
  addLevel('record-without-policy', 'A record without a policy verdict.', 'record', d);
}
{
  const d = example('read-only.json'); d.action.kind = 'x-example_report';
  addLevel('record-extension-kind', 'An extension action kind with the x- prefix.', 'record', d);
}
{
  const d = example('read-only.json'); d.action.kind = 'example_report';
  addLevel('record-unregistered-kind', 'An action kind that is neither registered nor x- prefixed.', 'record', d);
}
{
  const d = example('read-only.json'); delete d.principal;
  addLevel('record-without-principal', 'A record without a principal.', 'record', d);
}
{
  const d = example('read-only.json'); d.effects[0].argsDigest = 'md5:0cc175b9c0f1b6a831c399e269772661';
  addLevel('record-bad-digest-syntax', 'A digest that is not sha256: followed by 64 lowercase hexadecimal characters.', 'record', d);
}
addLevel('attestation-single', 'A single-scope human approval, unsealed.', 'attestation', example('approval-single.json'));
addLevel('attestation-single-sealed', 'The single-scope approval, sealed with the test key.', 'attestation', sealedAttestation);
{
  const d = clone(sealedAttestation); d.proposal.argsDigest = changedArgsDigest;
  addLevel('attestation-sealed-then-changed', 'Sealed, then the approved arguments digest replaced.', 'attestation', d);
}
addLevel('attestation-standing', 'A standing grant with matchOn, an expiry and a use limit.', 'attestation', example('approval-standing.json'));
{
  const d = example('approval-standing.json'); delete d.constraints.expiresAt; delete d.constraints.maxUses;
  addLevel('attestation-standing-unbounded', 'A standing grant with neither expiresAt nor maxUses.', 'attestation', d);
}
{
  const d = example('approval-standing.json'); d.scope = 'session'; delete d.constraints.matchOn;
  addLevel('attestation-session-without-matchOn', 'A session grant that does not say what it matches on.', 'attestation', d);
}
{
  const d = example('approval-single.json'); d.approver = { id: 'policy-engine', type: 'service' };
  addLevel('attestation-approved-by-service', 'An approved decision made by a service party.', 'attestation', d);
}
{
  const d = example('approval-single.json'); d.decision = 'auto'; d.approver = { id: 'policy-engine', type: 'service' }; delete d.policy;
  addLevel('attestation-auto-without-policy', 'An auto decision that does not cite a policy.', 'attestation', d);
}
{
  const d = example('approval-single.json'); delete d.proposal.argsDigest;
  addLevel('attestation-without-argsDigest', 'A proposal that does not bind the arguments.', 'attestation', d);
}

write('conformance-levels.json', {
  ...header('Conformance levels of records and attestations', ['action-provenance/1.0', 'action-approval/1.0'], [
    'expectedLevel is the highest conformance level the document satisfies, or 0 when it does not satisfy Level 1.',
    'Level 3 cases are sealed with the test key from seal-and-verify.json. Establishing Level 3 needs no key: the content digest is recomputed and a MAC or signature must be present. Checking the MAC itself is covered by seal-and-verify.json.',
    'failingAtNextLevel lists the JSON Pointer paths the reference implementation reports against the next level. It is informative.',
  ]),
  cases: levelCases,
});
