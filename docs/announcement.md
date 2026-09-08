# Launch collateral

Three pieces, in the founder's voice. No em dashes anywhere.

---

## LinkedIn post

I built Renly because AI agents that *act* need a different kind of accountability from AI that *answers*.

When an agent sends the email, changes the record or moves the money, "was the output good" stops being the question. The question is: can you account for what happened, and on whose authority?

Today we are publishing three open standards, Apache 2.0, that make that answer a document you can store, export and verify:

1. The Action Provenance Record. One record per action: who asked, which agent and model acted, what policy decided, who approved, what changed, what happened. Sealed and chained so it holds up after the fact.

2. The Action Approval Attestation. A human's "yes" bound to a digest of exactly what they approved, with a scope and an expiry. It makes "approve X, execute Y" detectable, and it fills the gap the IETF's own agent-capsule draft leaves open on purpose.

3. The Governed Runtime Profile. Twelve testable guarantees a runtime must provide before it may call itself governed, with an afternoon-long audit procedure. "Governed" should not be a marketing word.

These are the records Renly already produces in production. We are publishing the formats so any runtime can produce them, any auditor can verify them, and buyers can put them in a procurement questionnaire.

Reference implementation, schemas and specs: github.com/XiPlatform/governed-runtime-standards
Read them at renly.ai/standards

If you build agent runtimes, govern AI in an organisation, or audit it, I would value your objections. That is what version 1.0 is for.

---

## Show HN

**Title:** Show HN: Open standards for what an AI agent did, and who approved it

**Body:**

I run a small governed-runtime product for AI agents. The part that turned out to matter most to buyers was not the agents; it was the evidence record: for every action, who asked, which model, what the policy said, who approved, what changed, and a hash chain so it holds up in an audit.

Nobody had standardised that record, so we wrote it down and are publishing it as three specs under Apache 2.0:

- Action Provenance Record: the per-action record, with three conformance levels (attributable, governed, verifiable) and a MAC/signature plus per-tenant chain.
- Action Approval Attestation: a human approval bound to a digest of the exact proposal, with single/session/standing scopes and a normative coverage algorithm. This is the "may" axis that the IETF SCITT agent-capsule draft deliberately leaves as an opaque reference.
- Governed Runtime Profile: twelve guarantees (approval gates, fail-closed policy, kill switch, autonomy cap, tenant isolation, integrity...) so "governed" is testable.

The reference library is TypeScript with zero runtime dependencies: validate, seal, verify, verify a chain, check whether a grant covers a proposal. Tests cover the normative rules.

Relationship to prior art is in each spec: complementary to C2PA (content), W3C PROV / PROV-AGENT (activity graphs), OTel GenAI (telemetry), and the IETF capsule (transparency-log anchoring).

Repo: https://github.com/XiPlatform/governed-runtime-standards
Specs rendered: https://renly.ai/standards

Happy to be told where the model is wrong; that is the point of publishing a 1.0 draft.

---

## One-paragraph rationale (for the website and press)

Renly publishes the Governed Runtime Standards because accountability for AI agents should not depend on which vendor you bought. The Action Provenance Record, the Action Approval Attestation and the Governed Runtime Profile are the formats Renly's own runtime produces, released under Apache 2.0 so that any runtime can produce them, any auditor can verify them, and any organisation can require them.
