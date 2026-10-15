# Governed Runtime Standards

[![CI](https://github.com/XiPlatform/governed-runtime-standards/actions/workflows/ci.yml/badge.svg)](https://github.com/XiPlatform/governed-runtime-standards/actions/workflows/ci.yml)

Open specifications for recording what AI agents do and on whose authority, in documents that can be stored, exported and verified independently of the system that produced them. With a reference implementation, JSON Schemas and test vectors.

## Overview

When an AI agent acts on business systems, by sending a message, changing a record or initiating a payment, the organisation responsible has to be able to account for each action: who requested it, which agent and model acted, which policy applied, who approved it, what changed, and what happened. The Governed Runtime Standards define that account as portable, verifiable JSON documents, and define the guarantees an agent runtime has to provide for those documents to be trustworthy.

| Specification | Identifier | Question it answers |
|---|---|---|
| [Action Provenance Record](specs/action-provenance.md) | `action-provenance/1.0` | What did the agent do, for whom, with which model, and what happened? |
| [Action Approval Attestation](specs/action-approval.md) | `action-approval/1.0` | What exactly did a human permit, for how long, and can that be proved? |
| [Governed Runtime Profile](specs/governed-runtime-profile.md) | `governed-runtime/1.0` | What must a runtime guarantee before it can be called governed? |

- **The record** binds who asked, which agent and model acted, what policy decided, who approved, what changed and what happened into one sealed document, optionally chained per tenant so that removal or reordering is detectable.
- **The attestation** binds a human's approval to a digest of the exact proposal, with a scope, an expiry and a use limit, so that "approve X, execute Y" and approval creep are detectable.
- **The profile** defines twelve testable guarantees, from approval gates and fail-closed policy to a kill switch and tenant isolation, and a procedure for reviewing a runtime's claim.

Each specification defines three cumulative conformance levels, so that an implementation can adopt it incrementally:

| Level | Action Provenance Record | Action Approval Attestation | Governed Runtime Profile |
|---|---|---|---|
| 1 | **Attributable.** Who, which agent and model, what, and what happened. | **Bound.** The decision is tied to a digest of the exact proposal. | **Attributable runtime.** Attribution, provenance, effect classification, tenant isolation, model control. |
| 2 | **Governed.** A policy verdict on every action; approval on every write that reached execution. | **Scoped.** Humans decide; `auto` decisions cite a policy; broad grants state what they match and carry a bound. | **Governed runtime.** Approval gates, versioned policy, fail closed, kill switch, autonomy cap, least privilege. |
| 3 | **Verifiable.** Sealed with a content digest and a MAC or signature; chained per tenant. | **Verifiable.** Sealed. | **Verifiable runtime.** Records sealed, chained and exportable for offline verification. |

## Status

All three specifications are at **version 1.0, Working Draft**, first published on 3 September 2026. The field set and conformance rules of version 1.0 are frozen: version 1.0 receives errata and clarifications only, and proposals for a later version are welcome. See the change history at the end of each specification and [CHANGELOG.md](CHANGELOG.md).

The standards are published and maintained by Renly (XiPlatform Pty Ltd, Australia). They have not been developed or endorsed by a standards development organisation; [GOVERNANCE.md](GOVERNANCE.md) describes how decisions are made, the stability policy, and how the standards would move to a neutral home.

Overview pages are published at [renly.ai/standards](https://renly.ai/standards). The schemas are published at [renly.ai/spec/action-provenance/1.0/schema.json](https://renly.ai/spec/action-provenance/1.0/schema.json) and [renly.ai/spec/action-approval/1.0/schema.json](https://renly.ai/spec/action-approval/1.0/schema.json).

## Who these standards are for

- **Runtime and platform engineers** who build or operate agent runtimes, and need a record and approval format that customers and auditors can check.
- **Security, risk and audit teams** who need to verify after the fact what an agent did and who authorised it, offline and without trusting the vendor's console.
- **CIOs and procurement teams** who need precise, testable requirements for agent platforms. For example: *"The runtime conforms to `governed-runtime/1.0` at Level 2 and produces `action-provenance/1.0` records at Level 3."*
- **Standards and policy specialists** working on AI accountability. Each specification describes its relationship to adjacent work: C2PA, W3C PROV, the Agent Action Capsule Internet-Draft for SCITT, the OpenTelemetry generative AI conventions, ISO/IEC 42001 and the NIST AI Risk Management Framework.

## Quick start

The reference implementation is a TypeScript library with no runtime dependencies (ESM, Node.js 18 or later). It is not published to a package registry: clone the repository, or copy the files you need from [`src/`](src).

```bash
git clone https://github.com/XiPlatform/governed-runtime-standards.git
cd governed-runtime-standards
npm ci
npm test
```

Create, validate, seal and verify a record:

```ts
import { createRecord, validate, seal, verify } from './src/index.js';

const secret = process.env.EVIDENCE_SECRET!;   // a dedicated evidence key, at least 16 characters
const keyId = 'evidence-v1';

const record = createRecord({
  correlationId: 'corr_123',
  action: { kind: 'tool_call', at: new Date().toISOString(), effect: 'write' },
  principal: { id: 'user_1', type: 'human', tenant: 'org_1' },
  agent: { id: 'agent_finance', version: '7' },
  model: { resolved: 'gpt-5-2026-03-01', provider: 'azure-openai' },
  policy: { verdict: 'allow', ref: 'pol_outbound_email', version: '3' },
  approval: { required: true, decision: 'approved', approver: { id: 'user_1', type: 'human' }, at: new Date().toISOString() },
  effects: [{ tool: 'outlook.send_email', target: 'microsoft-outlook', status: 'succeeded', sideEffecting: true, resultRef: 'msg_9' }],
  outcome: { status: 'succeeded' },
});

validate(record);                    // level 2; the remaining issue is Level 3's missing integrity member
const sealed = seal(record, { secret, keyId });
validate(sealed).level;              // 3
verify(sealed, secret);              // { valid: true }
```

Bind an approval to the exact arguments, and check coverage immediately before execution:

```ts
import { canonicalJson, covers, createAttestation, sealAttestation, sha256Digest } from './src/index.js';

const args = { to: 'accounts@northwind.example', subject: 'August reminder' };
const argsDigest = sha256Digest(canonicalJson(args));
const proposal = { kind: 'tool_call', tool: 'outlook.send_email', effect: 'write' as const, argsDigest };

const grant = sealAttestation(createAttestation({
  correlationId: 'corr_123',
  proposal,
  principal: { id: 'user_1', type: 'human' },
  approver: { id: 'user_1', type: 'human' },
  decision: 'approved',
  scope: 'single',
}), { secret, keyId });

covers(grant, { proposal, correlationId: 'corr_123' });
// { covered: true }; with any other arguments: { covered: false, reason: 'args_mismatch' }
```

Chain records per tenant, and verify an export:

```ts
import { seal, verifyChain } from './src/index.js';

const chained = seal(record, { secret, keyId, chain: { scope: 'org_1', seq: 42, prev: previousDigest } });
verifyChain(exportedRecords, secret, 'org_1');   // { ok: true, verified: n }, or the first failing seq
```

What the library does, and does not do:

- `validate` and `validateAttestation` report the highest conformance level a document reaches and every issue between it and the next level. They check the rules the specifications define; they are not general JSON Schema validators. To reject unknown members as well, validate against the schemas in [`schema/`](schema).
- `seal`, `verify`, `sealAttestation`, `verifyAttestation` and `verifyChain` produce and check HMAC-SHA256 MACs and chain links. The library does not produce or verify asymmetric signatures, which the specifications permit as an alternative.
- `covers` implements the coverage algorithm of the Action Approval Attestation. Counting executions under a grant and consuming single-use grants are the caller's responsibility.

## Test vectors

[`test-vectors/`](test-vectors) contains canonical inputs and expected outputs, generated from the reference implementation, for canonical serialisation, content digests, MACs under a published test key, chain links and chain verification, approval coverage (including changed arguments, expiry, revocation and use limits), and conformance levels. They let an implementation in any language test itself. See [test-vectors/README.md](test-vectors/README.md).

## Conformance and implementations

Conformance is self-declared per specification and level; there is no certification programme. Implementation reports are collected in [`conformance/`](conformance), which describes the report format, how to test a claim, and how to submit a report by pull request. Renly, the maintainer, is implementing the standards in its runtime and claims no conformance level yet; its status is in [conformance/implementations/renly.md](conformance/implementations/renly.md), and any conformance report it publishes is held to the same format as any other.

## Repository layout

```
specs/          the three specifications (normative)
schema/         JSON Schema 2020-12 for the record and the attestation (normative)
src/            reference implementation (TypeScript, ESM, Node.js 18+)
test/           test suite: conformance rules, integrity, chains, coverage, schemas, test vectors
test-vectors/   canonical inputs and expected outputs for independent implementations
examples/       worked records and attestations
conformance/    how to claim conformance, and implementation reports (informative)
scripts/        test-vector generator
```

## Participating

- **Questions and clarifications, errata, proposals and implementation reports:** open an issue using the matching template. [CONTRIBUTING.md](CONTRIBUTING.md) describes each type and the process.
- **Pull requests** are welcome. Normative changes start with an issue.
- **Security issues** in the specifications or the reference implementation: report privately as described in [SECURITY.md](SECURITY.md).
- **Conduct:** participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Licence

The specifications, schemas, reference implementation, test vectors and examples are licensed under the [Apache License 2.0](LICENSE). See also [NOTICE](NOTICE).

## Citation

To cite the standards, use the metadata in [CITATION.cff](CITATION.cff) (GitHub shows it as "Cite this repository"), or:

> Renly (XiPlatform Pty Ltd). *Governed Runtime Standards*, version 1.0: Action Provenance Record, Action Approval Attestation and Governed Runtime Profile. 2026. https://github.com/XiPlatform/governed-runtime-standards
