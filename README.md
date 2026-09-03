# Governed Runtime Standards

Open specifications for accountable AI agents, and a zero-dependency reference implementation.

When an AI agent stops answering and starts acting, the question changes from "is this output good" to "can we account for what happened." These standards make the answer a document you can store, export, and verify.

| Specification | Identifier | Question it answers |
|---|---|---|
| [Action Provenance Record](specs/action-provenance.md) | `action-provenance/1.0` | What did the agent do, for whom, with which model, and what happened? |
| [Action Approval Attestation](specs/action-approval.md) | `action-approval/1.0` | What exactly did a human permit, for how long, and can we prove it? |
| [Governed Runtime Profile](specs/governed-runtime-profile.md) | `governed-runtime/1.0` | What must a runtime guarantee before it may call itself governed? |

Each has three conformance levels, so a team can adopt them incrementally: attributable, governed, verifiable.

Published at [renly.ai/standards](https://renly.ai/standards). Schemas: [action-provenance](https://renly.ai/spec/action-provenance/1.0/schema.json), [action-approval](https://renly.ai/spec/action-approval/1.0/schema.json).

## Why these three

Existing work covers pieces. Content provenance (C2PA) authenticates artefacts. W3C PROV and its agent extensions model activity graphs but are silent on approval and policy. The IETF Agent Action Capsule cryptographically records what was executed and deliberately leaves the permitting authority as an opaque reference. Observability conventions record tokens, not accountability.

These standards fill the gap in the middle, in a form a small team can implement in a day and an auditor can verify with a hash function:

- **The record** binds who asked, which agent and model acted, what policy decided, who approved, what changed, and what happened, into one sealed document.
- **The attestation** binds a human's approval to a digest of the exact proposal, with a scope and an expiry, so "approve X, execute Y" and approval creep are detectable.
- **The profile** turns "governed" from a marketing word into twelve testable guarantees.

## Reference implementation

```bash
npm install governed-runtime
```

```ts
import { createRecord, validate, seal, verify, verifyChain } from 'governed-runtime';

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

validate(record);                                   // { valid: true, level: 2, issues: [] }
const sealed = seal(record, { secret: process.env.EVIDENCE_SECRET!, keyId: 'evidence-v1' });
validate(sealed, { targetLevel: 3 }).valid;         // true
verify(sealed, process.env.EVIDENCE_SECRET!);       // { valid: true }
```

Approvals:

```ts
import { createAttestation, sealAttestation, covers } from 'governed-runtime';

const grant = sealAttestation(createAttestation({
  correlationId: 'corr_123',
  proposal: { kind: 'tool_call', tool: 'outlook.send_email', effect: 'write', argsDigest },
  principal: { id: 'user_1', type: 'human' },
  approver: { id: 'user_1', type: 'human' },
  decision: 'approved',
  scope: 'single',
}), { secret, keyId: 'evidence-v1' });

covers(grant, { proposal: { kind: 'tool_call', tool: 'outlook.send_email', effect: 'write', argsDigest }, correlationId: 'corr_123' });
// { covered: true }   and with different arguments: { covered: false, reason: 'args_mismatch' }
```

Chains:

```ts
const sealedInChain = seal(record, { secret, keyId, chain: { scope: 'org_1', seq: 42, prev: previousDigest } });
verifyChain(exportedRecords, secret, 'org_1');   // { ok: true, verified: 1440 } or the first broken seq
```

The library has no runtime dependencies. `validate` and `validateAttestation` report the highest conformance level a document reaches and every issue standing between it and the next level.

## Repository layout

```
specs/      the three specifications (normative text)
schema/     JSON Schema 2020-12 for the two document types (normative)
src/        reference implementation (TypeScript, ESM, Node 18+)
examples/   worked records and attestations used by the tests
test/       vitest suite: conformance rules, integrity, chains, coverage
docs/       announcement and background
```

## Conformance

Implementations self-declare a level per specification. The test suite is the reference for the structural rules. Renly's runtime implements all three at Level 3; its statement is in each specification and at renly.ai/standards.

## Governance and contributing

See [GOVERNANCE.md](GOVERNANCE.md) and [CONTRIBUTING.md](CONTRIBUTING.md). Version 1.0 has a frozen field set; clarifications go through issues. Proposals for 1.1 are welcome.

## License

Apache License 2.0. Maintained by Renly (XiPlatform Pty Ltd, Australia).
