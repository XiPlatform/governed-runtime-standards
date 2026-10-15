# Action Provenance Record

**Version 1.0, Working Draft**

| | |
|---|---|
| Specification identifier | `action-provenance/1.0` |
| Status | Working Draft. The field set and conformance rules of version 1.0 are frozen; this version receives errata and clarifications only. |
| This revision | 2026-10-15 |
| First published | 2026-09-03 |
| Latest version | https://github.com/XiPlatform/governed-runtime-standards/blob/main/specs/action-provenance.md |
| Overview page | https://renly.ai/spec/action-provenance |
| Schema (normative) | [`schema/action-provenance-1.0.schema.json`](../schema/action-provenance-1.0.schema.json), published at https://renly.ai/spec/action-provenance/1.0/schema.json |
| Editor | Saif Ehsan (Renly) |
| Publisher | Renly (XiPlatform Pty Ltd, Australia) |
| Feedback | https://github.com/XiPlatform/governed-runtime-standards/issues |
| Licence | Apache License 2.0 |
| Companion specifications | [Action Approval Attestation 1.0](action-approval.md), [Governed Runtime Profile 1.0](governed-runtime-profile.md) |

## Status of This Document

This section describes the status of this document at the time of its publication.

This document is version 1.0 of the Action Provenance Record specification, one of the three Governed Runtime Standards. It is a Working Draft published by Renly (XiPlatform Pty Ltd) under the process described in [GOVERNANCE.md](../GOVERNANCE.md). It has not been developed or endorsed by a standards development organisation.

The members, enumerations and conformance rules of version 1.0 are frozen. This version is changed only by errata and clarifications, which do not change the specification identifier and are listed in [Appendix A](#appendix-a-change-history) and in [CHANGELOG.md](../CHANGELOG.md). Proposals for a later version are welcome.

Comments are invited as issues in the specification repository; [CONTRIBUTING.md](../CONTRIBUTING.md) describes the issue types and the process. Security issues in this specification are reported privately, as described in [SECURITY.md](../SECURITY.md).

## Abstract

An Action Provenance Record (APR) is a verifiable JSON document describing one action taken by or through an AI agent. It answers, in one place and in one format, the questions an auditor, a regulator or a manager asks after the fact: who requested the action, which agent and which model acted, what policy decided, who approved it, what it did to which system, and what happened.

A record is designed to be produced by any agent runtime, stored for as long as the organisation requires, exported to auditors, and verified offline without access to the system that produced it. This document defines the record, its canonical form, its integrity model (content digest, keyed MAC or signature, and per-tenant chain), and three cumulative conformance levels.

## Contents

1. [Introduction](#1-introduction)
2. [Conventions and Terminology](#2-conventions-and-terminology)
3. [The Record](#3-the-record)
4. [Correlation and Runs](#4-correlation-and-runs)
5. [Canonical Form and Digests](#5-canonical-form-and-digests)
6. [Integrity](#6-integrity)
7. [Conformance](#7-conformance)
8. [Registered Values and Extensions](#8-registered-values-and-extensions)
9. [Versioning](#9-versioning)
10. [Security Considerations](#10-security-considerations)
11. [Privacy Considerations](#11-privacy-considerations)
12. [Relationship to Other Work](#12-relationship-to-other-work)
13. [Examples](#13-examples)
14. [References](#14-references)

[Appendix A. Change History](#appendix-a-change-history)

## 1. Introduction

### 1.1 Motivation

Provenance for AI has so far mostly meant *content* provenance: where a file came from and whether a model made it [C2PA]. That question matters, but it is not the question that arises when an agent acts. An agent does not only produce text; it sends the email, changes the record, or initiates the payment. Once an AI system takes the action itself, the question shifts from whether the output is good to whether the organisation can account for what happened.

Existing work covers parts of the answer. W3C PROV [PROV-DM] and its agent extensions [PROV-AGENT] model activity graphs but do not address approval, policy or effects on business systems. The Agent Action Capsule Profile for SCITT [AGENT-CAPSULE], an individual Internet-Draft, records what an agent executed and binds it cryptographically, and carries the authority that permitted the action only as an opaque reference. Observability conventions [OTEL-GENAI] record model and token usage, not accountability.

The Action Provenance Record fills the gap between them: a single operator-facing document that binds attribution, authority, policy, model, effect and outcome together. Its integrity model uses only standard primitives (SHA-256 and HMAC-SHA256): any party can recompute a record's content digest with a hash function, and a holder of the sealing key can verify its proofs offline.

### 1.2 Design principles

1. **One record per action.** A record is a complete account of one action. Related records share a `correlationId`; the records with the same correlation form a run.
2. **Digests, not payloads.** A record MUST NOT need to carry raw prompts, responses, arguments or sensitive data to be useful. It carries digests and references, so that content can be checked when it is available and withheld when it must be.
3. **Terminal outcome.** A record describes an action that has finished. Its status is always a terminal state.
4. **Open vocabularies.** Enumerations that will grow (`action.kind`, tools, targets, evaluators) are open. Registered values are listed in this document; extensions use an `x-` prefix or the `extensions` member.
5. **Tenant scoped.** Records belong to a tenant. A runtime MUST NOT expose one tenant's records to another.
6. **Verifiable after the fact.** A sealed record can be checked for integrity without the runtime that produced it.

### 1.3 Scope

This document specifies the record format, its canonical serialisation, its integrity proofs and its conformance levels. It does not specify how a runtime decides policy or obtains approval (see [AAA] for approvals and [GRP] for runtime guarantees), how records are transported or stored, or how evidence keys are managed beyond the requirements in section 10.

## 2. Conventions and Terminology

### 2.1 Requirements notation

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

Sections 1.1, 1.3, 7.4, 12 and 13, Appendix A, the examples, and text marked as a note are informative. All other sections are normative.

### 2.2 Terms

- **Action.** One unit of work attributable to a principal: a chat turn, an agent invocation, a workflow step, a tool call, or a runtime action on a device.
- **Principal.** The party the action is attributed to; normally the human who asked for it.
- **Agent.** The AI agent definition (instructions, tools, configuration) that acted.
- **Effect.** Whether the action changed anything outside the runtime: `none`, `read` or `write`.
- **Side effect.** A tool invocation that changed state in a target system.
- **Policy verdict.** The decision of the runtime's policy layer for this action.
- **Approval.** A human decision permitting a specific proposed action. See the companion Action Approval Attestation specification [AAA].
- **Correlation.** The identifier that groups every record belonging to one action or run.
- **Tenant.** An organisation whose agents, data and records a runtime holds in isolation from other organisations.
- **Producer.** Software that creates records, normally an agent runtime.
- **Consumer.** Software that reads records.
- **Verifier.** Software that checks the integrity of records as defined in section 6.
- **Sealing.** Computing and attaching the `integrity` member of a record (section 6).
- **Canonical form.** The deterministic serialisation defined in section 5.

### 2.3 Data types

- **String, number, boolean, object, array, null.** As defined by JSON [RFC8259].
- **Timestamp.** A string in the date-time format of [RFC3339], in UTC.
- **Digest.** A string of the form `sha256:` followed by 64 lowercase hexadecimal characters (section 5).
- **Party.** An object `{ id, type, display?, tenant?, onBehalfOf? }` where `id` is a non-empty string, `type` is `human`, `agent`, `service` or `system`, `display` is a human-readable name, `tenant` is the party's tenant, and `onBehalfOf` is a party reference.
- **Party reference.** An object `{ id, type }` with the same meaning as in a party.
- **Keyed proof.** An object `{ alg, keyId, value }` where `alg` names the algorithm, `keyId` identifies the key, and `value` is the proof encoded as base64url without padding ([RFC4648], section 5).

## 3. The Record

A record is a JSON object [RFC8259]. Members marked (R) are REQUIRED at Level 1. Other members are OPTIONAL unless a conformance level requires them (section 7.2). The JSON Schema [APR-SCHEMA] is normative. It defines the permitted members and their types, and it does not permit members other than those defined in this section.

### 3.1 Identity and time

| Member | Type | Description |
|---|---|---|
| `spec` (R) | string | MUST be `action-provenance/1.0`. |
| `id` (R) | string | Unique record identifier. A UUID is RECOMMENDED. |
| `correlationId` (R) | string | Groups every record of one action or run. |
| `recordedAt` (R) | timestamp | When the record was written. |

### 3.2 Action

| Member | Type | Description |
|---|---|---|
| `action.kind` (R) | string | MUST be a registered value or begin with `x-`. Registered: `chat_turn`, `agent_invocation`, `workflow_step`, `tool_call`, `agent_formation`, `subagent_spawn`, `runtime_action`. |
| `action.at` (R) | timestamp | When the action occurred. |
| `action.effect` (R) | `none`, `read`, `write` | The strongest effect the action had on systems outside the runtime. |
| `action.description` | string | Human-readable summary. |

### 3.3 Who

| Member | Type | Description |
|---|---|---|
| `principal` (R) | party | The party the action is attributed to. |
| `principal.onBehalfOf` | party reference | Present when the principal acted for another party, for example an administrator impersonating a user or an agent acting for a human. |
| `agent` | object | `id` (REQUIRED when `agent` is present), `name`, `version`, `bundleDigest` (digest of the exact agent definition), `instructionsDigest` (digest of the resolved instructions). |

### 3.4 Model

| Member | Type | Description |
|---|---|---|
| `model.requested` | string | The model asked for. |
| `model.resolved` (R) | string | The model that actually produced the output, or `none`. |
| `model.provider` (R) | string | Provider identifier, for example `azure-openai`, `openai`, `anthropic`, `google`, or `none`. |
| `model.mode` | string | Provider-specific mode or routing label. |

### 3.5 Context

`context` MAY carry `tenant`, `workspace`, `session`, `execution` and `step` identifiers. These are references, not payloads.

### 3.6 Policy

| Member | Type | Description |
|---|---|---|
| `policy.verdict` | `allow`, `allow_with_obligations`, `deny`, `escalate` | The runtime's decision for this action. REQUIRED when `policy` is present. |
| `policy.ref`, `policy.version` | string | The governing policy and its version. |
| `policy.obligations` | array of strings | Conditions attached to an `allow_with_obligations` verdict. |
| `policy.evaluations` | array | Per-evaluator detail: `{ evaluator, decision, code?, confidence?, reasons? }`, where `confidence` is a number from 0 to 1. |

### 3.7 Approval

| Member | Type | Description |
|---|---|---|
| `approval.required` | boolean | Whether the runtime required approval for this action. REQUIRED when `approval` is present. |
| `approval.decision` | `approved`, `rejected`, `auto`, `not_required`, `expired` | REQUIRED when `approval` is present. `auto` means a policy granted autonomy for this action; `policy.ref` MUST then be present. |
| `approval.approver` | party | Who decided. |
| `approval.at` | timestamp | When. |
| `approval.method` | string | `ui`, `api`, `delegated` or `policy`. |
| `approval.attestation` | string | The identifier or content digest of the Action Approval Attestation [AAA] that authorised this action. |

### 3.8 Effects

`effects` is an array of the tool invocations made during the action. Each entry has these members:

| Member | Type | Description |
|---|---|---|
| `tool` (R) | string | Tool identifier, for example `outlook.send_email`. |
| `target` | string | The external system, for example `microsoft-outlook`. |
| `status` (R) | `succeeded`, `failed` | The result of the invocation. |
| `sideEffecting` (R) | boolean | Whether the invocation changed state in the target. |
| `argsDigest` | digest | Digest of the arguments. |
| `responseDigest` | digest | Digest of the response observed from the target. |
| `resultRef` | string | Reference to the created or changed object. |
| `approvedBy` | party | Who approved this specific side effect. |
| `compensated` | boolean | Whether a later action reversed this effect. |
| `error` | string | Error detail for a failed invocation. |

The members marked (R) are REQUIRED in every entry of `effects`.

### 3.9 Work product, cost and outcome

- `workProduct` MAY carry `inputDigest`, `outputDigest`, `sources` (array of strings) and `artifacts` (array of strings).
- `cost` MAY carry `inputTokens`, `outputTokens` and `estimatedUsd`, and MUST carry `attribution` (`exact`, `approximate` or `none`) when present, so that a reader knows how reliably cost was tied to this action.
- `outcome.status` (R) is one of `succeeded`, `failed`, `blocked`, `denied`, `cancelled`, `timed_out`. `denied` means policy refused the action; `blocked` means the runtime refused it for another reason, for example a kill switch or a fail-closed condition. `outcome.error` is OPTIONAL.

### 3.10 Integrity and extensions

`integrity` is defined in section 6. `extensions` is an object keyed by reverse-DNS namespace (for example `com.example`) whose values are objects. Consumers MUST ignore extensions they do not understand.

## 4. Correlation and Runs

Records that share a `correlationId` form a run. Within a run, records SHOULD be ordered by `action.at`. A run MAY contain a `chat_turn` record, several `tool_call` records, and `subagent_spawn` records for delegated work. A consumer MUST NOT assume a run is complete unless it holds a record with a terminal outcome for the originating action.

## 5. Canonical Form and Digests

In this section, a *document* is an Action Provenance Record or an Action Approval Attestation [AAA]. To compute a digest over a document, the document MUST first be serialised in canonical form:

1. Remove the top-level `integrity` member if present.
2. Remove any member whose value is undefined.
3. Serialise as JSON with object members sorted by key in UTF-16 code unit order at every level, arrays in their original order, no whitespace, and numbers and strings serialised as by the ECMAScript `JSON.stringify` operation [ECMA-262].

For documents whose values are standard JSON types this produces the same bytes as the JSON Canonicalization Scheme [RFC8785]. Implementations MAY use an RFC 8785 library.

Step 1 applies only to documents. When a producer digests other JSON content with this procedure, for example the arguments of a tool call for `argsDigest`, no member is removed, so that every member of that content is bound by the digest.

A digest is `sha256:` followed by the lowercase hexadecimal encoding of the SHA-256 [FIPS180-4] hash of the UTF-8 [RFC3629] bytes of the canonical form.

Note: the test vectors in [TEST-VECTORS] cover member ordering by UTF-16 code units, number and string serialisation, and the removal of the `integrity` member.

## 6. Integrity

The `integrity` member carries the proofs that make a record verifiable. It is computed by the sealing party (section 10).

### 6.1 Content digest

`integrity.contentDigest` MUST equal the digest of the canonical form of the record with `integrity` removed (section 5).

### 6.2 Keyed MAC

`integrity.mac` is a keyed proof with `alg` equal to `hmac-sha256`. `value` MUST be the base64url encoding, without padding, of HMAC-SHA256 [RFC2104] [FIPS180-4], keyed with the tenant's or runtime's evidence secret, over the UTF-8 bytes of the `contentDigest` string. The key is an octet string; where an evidence secret is held as text, the key is its UTF-8 encoding.

A MAC proves that a record has not changed since it was sealed by a holder of the key. It does not by itself prove *which* holder sealed it, and it cannot be verified by a party who does not hold the key.

### 6.3 Signature

`integrity.signature` is a keyed proof with an asymmetric algorithm such as `ed25519` or `es256`, over the same message as the MAC. A signature can be verified by any party holding the public key. Implementations that need third-party verification SHOULD add a signature; a MAC alone satisfies Level 3.

Note: version 1.0 does not register signature algorithm identifiers or fix the octet encoding of a signature beyond base64url. A producer that adds signatures needs to document the algorithm, the key distribution, and the encoding, for example the 64-octet Ed25519 signature of [RFC8032], or the fixed-length R || S form of an ECDSA P-256 signature as used by ES256 in [RFC7518], section 3.4. Registration of signature algorithms is expected in a later minor version.

### 6.4 Chain

To make a tenant's history tamper-evident as a whole, records MAY be linked into a chain per `scope` (normally the tenant). `integrity.chain` has these members:

- `chain.scope` identifies the chain.
- `chain.seq` is a monotonic integer starting at 0 for the scope.
- `chain.prev` is the `contentDigest` of the record at `seq - 1`, or `null` at genesis.
- `chain.link` is a keyed proof over the string formed by `contentDigest`, a full stop (`.`), and `prev`, or the literal `GENESIS` when `prev` is null. When `link.alg` is `hmac-sha256`, `link.value` is computed as for the MAC in section 6.2, over the UTF-8 bytes of that string.

A chain verifies when sequence numbers are contiguous, every `prev` equals the previous record's `contentDigest`, every link proof verifies, and every record verifies individually. A verifier MUST report the first failing sequence number.

A verifier can verify a contiguous segment of a chain, for example the records exported for one day. The `prev` of the first record in a segment is then checked only if the verifier also holds that record's predecessor.

### 6.5 What proofs do not cover

`integrity.sealedAt` is informational and is excluded from every digest and proof, so that a held document re-verifies deterministically.

## 7. Conformance

### 7.1 Conformance classes

This specification defines requirements for three classes of implementation:

- **Producers** create and seal records. A producer conforms at one of the levels in section 7.2, and meets the requirements in sections 1.2, 3 to 6, 10 and 11 that apply to producers and runtimes.
- **Consumers** read records. A consumer MUST ignore extensions it does not understand (section 3.10), MUST reject records whose `spec` it does not recognise (section 9), and MUST NOT assume a run is complete without a terminal record for the originating action (section 4).
- **Verifiers** check integrity. A verifier recomputes digests as in section 5, checks proofs as in section 6, and reports the first failing sequence number of a chain (section 6.4).

### 7.2 Conformance levels

An implementation MAY claim one of three levels for the records it produces. Each level includes the one before it.

#### Level 1: Attributable

Every record MUST contain the REQUIRED members in section 3 and MUST validate against the schema [APR-SCHEMA]. The record answers: who, which agent, which model, what, and what happened.

#### Level 2: Governed

In addition to Level 1:

1. Every record MUST carry `policy.verdict`.
2. Every action whose `effect` is `write`, or which contains a side-effecting entry in `effects`, and whose outcome is not `denied` or `blocked`, MUST carry `approval` with `required` equal to `true`.
3. If such an action `succeeded`, then either `approval.decision` is `approved` and `approval.approver` and `approval.at` are present, or `approval.decision` is `auto` and `policy.ref` is present.
4. A record whose `policy.verdict` is `deny` MUST NOT report a `succeeded` outcome for a write.
5. Every succeeded side-effecting entry in `effects` MUST carry `responseDigest` or `resultRef`.

The record now answers: on whose authority.

#### Level 3: Verifiable

In addition to Level 2, every record MUST be sealed: `integrity.contentDigest` MUST be present and correct, and at least one of `integrity.mac` or `integrity.signature` MUST be present. Records SHOULD be chained per tenant (section 6.4). The record now answers: can this be trusted after the fact.

Note: the structural Level 3 requirements, a correct content digest and the presence of a MAC or signature, can be checked without the key. Checking that the MAC itself is correct (section 6.2) requires the key.

### 7.3 Claiming conformance

A claim names the specification identifier and a level, for example `action-provenance/1.0 Level 3`. Because every level is stated as a requirement on every record, a claim at a level is a claim about every record the implementation produces. A claim that holds only for some editions, plans or configurations of a product states the limitation.

Claims are self-declared. Implementation reports, and the recommended format for them, are collected in the `conformance/` directory of the specification repository [IMPLEMENTATIONS]. That directory is informative and is not part of this specification.

### 7.4 Reference implementation and test vectors

This section is informative. The specification repository contains a reference implementation of this specification, a test suite, and test vectors [TEST-VECTORS] for canonical serialisation, content digests, MACs, chains and conformance levels. The test vectors are the reference for how the structural rules are applied. Where the reference implementation or the test vectors disagree with this document, this document prevails and the disagreement is handled as an erratum.

## 8. Registered Values and Extensions

Registered values for `action.kind`, `outcome.status`, `policy.verdict` and `approval.decision` are those listed in this document. Proposals to register additional values are made as issues in the specification repository. Vendors MAY use `x-` values and the `extensions` member without registration.

## 9. Versioning

The `spec` member carries the version a record conforms to. Consumers MUST reject records whose `spec` they do not recognise. A minor version adds OPTIONAL members only. A major version may change REQUIRED members. Errata and clarifications to a version do not change its `spec` value. The stability policy is described in [GOVERNANCE.md](../GOVERNANCE.md).

## 10. Security Considerations

**Integrity and origin.** A record's MAC proves integrity, not origin, to anyone outside the key holder. Use signatures where third parties must verify (section 6.3).

**Evidence keys.** Evidence secrets MUST be dedicated to evidence sealing and MUST NOT be shared with other subsystems. Rotate keys by `keyId`, and keep retired keys for verification only. HMAC keys shorter than the hash output (32 octets for SHA-256) reduce security [RFC2104]; keys are best generated by a cryptographically secure random number generator. Verifiers compare MAC values in constant time.

**Completeness.** A chain proves that no record was removed or reordered within a scope. It does not prove that every action was recorded. Runtimes that claim Level 3 SHOULD document how recording is enforced, for example by refusing to execute side effects when evidence cannot be sealed. A chain also cannot show that records were removed from its end. Publishing or anchoring the latest `contentDigest` of each chain outside the producer, for example in a transparency service [RFC9943], allows such truncation to be detected.

**Who seals.** Producers MUST NOT let a client supply `integrity`; it is always computed by the sealing party.

**Asserted values.** Timestamps, model identifiers and other members are asserted by the producer. A seal proves that they have not changed since sealing, not that they were accurate when recorded.

**Canonicalisation.** A JSON text with duplicate member names has no well-defined canonical form, because parsers disagree about which value applies. Producers do not emit duplicate names, and a verifier that encounters them cannot rely on the record. Numbers outside the precision of IEEE 754 double precision, and strings that are not valid Unicode, also serialise inconsistently; keeping records within the I-JSON profile [RFC7493] avoids both.

**Digests of low-entropy content.** A digest hides content only when the content is hard to guess. A digest of a short or predictable value, such as an amount or a yes-or-no choice, can be confirmed by trying candidate values (section 11).

## 11. Privacy Considerations

**Personal data in records.** Records identify people: the principal, approvers, and any party named in `onBehalfOf` or `approvedBy`. `display` names, `action.description`, `outcome.error`, `effects[].error`, `effects[].resultRef` and `workProduct.sources` can also contain personal information. Records are therefore normally personal information under privacy and data protection law, and are handled accordingly.

**Minimisation.** A record is evidence of an action, not a copy of its content. Producers SHOULD prefer digests and references over raw values in `effects`, `workProduct` and `action.description`. Where a description is needed for a human reader, it SHOULD be minimised. A record MUST NOT be a vehicle for exfiltrating the content it describes. Stable pseudonymous identifiers in `id` members, resolved to people by a directory held outside the record, keep personal information out of the record itself; `display` is OPTIONAL for this reason.

**Digests are not anonymisation.** As noted in section 10, a digest of low-entropy personal information can be reversed by guessing. Such digests are treated as personal information.

**Redaction and erasure.** A sealed record cannot be edited without invalidating its content digest and, in a chain, every later link. Erasure is therefore easiest when personal information is held outside the record: deleting the referenced content, or the directory entry that resolves an identifier, leaves the record verifiable. Where a sealed record itself has to be redacted, the redacted record no longer verifies against its original seal. A producer that redacts records keeps its own sealed account of the redaction, so that a reviewer can tell an authorised redaction from tampering.

**Retention.** Records are retained for a period the tenant controls (see GR-2 of [GRP]). Deleting the oldest records of a chain under a retention policy leaves a contiguous segment that still verifies (section 6.4). Deleting records from the middle of a chain appears to a verifier as a break, so retention deletions are best applied from the start of a chain and recorded.

**Access.** Records reveal patterns of work: who asked for what, when, and with what result. Records and exports are confidential to the tenant (section 1.2, principle 5), and access to them is best limited to the people who need it for audit, security or operations.

## 12. Relationship to Other Work

This section is informative.

- **Agent Action Capsule Profile for SCITT.** This individual Internet-Draft [AGENT-CAPSULE] records what an agent executed with COSE [RFC9052] signing and transparency receipts in the SCITT architecture [RFC9943], and carries the permitting authority as an opaque reference. An APR could serve as the human-readable payload of a capsule, and the Action Approval Attestation [AAA] can supply the authority the capsule leaves opaque. The two are complementary: the capsule anchors; the APR explains.
- **W3C PROV and PROV-AGENT.** An APR maps to PROV-DM [PROV-DM] as follows: the action is an `Activity`; the principal and agent are `Agent`s, with `actedOnBehalfOf` for `onBehalfOf`; inputs and outputs are `Entity`s identified by digest; `used` and `wasGeneratedBy` follow from `workProduct`; `wasAssociatedWith` links the activity to its agents. Approval and policy verdict have no native PROV counterpart and are carried as attributes. PROV-O [PROV-O] gives the corresponding RDF terms, and PROV-AGENT [PROV-AGENT] extends PROV for agentic workflows.
- **OpenTelemetry semantic conventions for generative AI.** [OTEL-GENAI] `model.provider` corresponds to `gen_ai.provider.name` (which supersedes `gen_ai.system`); `model.requested` and `model.resolved` to `gen_ai.request.model` and `gen_ai.response.model`; `cost.inputTokens` and `cost.outputTokens` to `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`. A trace describes what a system did over time; an APR describes what an organisation is accountable for.
- **C2PA.** Content provenance [C2PA] authenticates artefacts. Action provenance accounts for behaviour. The two answer different questions and can coexist: a C2PA manifest for a generated image, and an APR for the action that generated it.

## 13. Examples

This section is informative. The digests in the examples are illustrative.

- [`examples/approved-write.json`](../examples/approved-write.json): a human-approved email send. Level 2 as written, Level 3 once sealed.
- [`examples/denied-write.json`](../examples/denied-write.json): a bulk delete refused by policy before approval. Level 2.
- [`examples/read-only.json`](../examples/read-only.json): a read-only chat turn. Level 2.

Sealed forms of these records, with computed digests and MACs under a published test key, are in [TEST-VECTORS].

## 14. References

### 14.1 Normative References

**[APR-SCHEMA]** Renly, "Action Provenance Record 1.0 JSON Schema", `schema/action-provenance-1.0.schema.json`, <https://renly.ai/spec/action-provenance/1.0/schema.json>.

**[ECMA-262]** Ecma International, "ECMAScript 2026 Language Specification", ECMA-262, 17th edition, June 2026, <https://ecma-international.org/publications-and-standards/standards/ecma-262/>.

**[FIPS180-4]** National Institute of Standards and Technology, "Secure Hash Standard (SHS)", FIPS PUB 180-4, August 2015, <https://doi.org/10.6028/NIST.FIPS.180-4>.

**[JSON-SCHEMA]** Wright, A., Ed., Andrews, H., Ed., Hutton, B., Ed., and G. Dennis, "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022, <https://json-schema.org/draft/2020-12/json-schema-core>; and Wright, A., Ed., Andrews, H., Ed., and B. Hutton, Ed., "JSON Schema Validation: A Vocabulary for Structural Validation of JSON", draft-bhutton-json-schema-validation-01, June 2022, <https://json-schema.org/draft/2020-12/json-schema-validation>.

**[RFC2104]** Krawczyk, H., Bellare, M., and R. Canetti, "HMAC: Keyed-Hashing for Message Authentication", RFC 2104, February 1997, <https://www.rfc-editor.org/info/rfc2104>.

**[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997, <https://www.rfc-editor.org/info/rfc2119>.

**[RFC3339]** Klyne, G. and C. Newman, "Date and Time on the Internet: Timestamps", RFC 3339, July 2002, <https://www.rfc-editor.org/info/rfc3339>.

**[RFC3629]** Yergeau, F., "UTF-8, a transformation format of ISO 10646", STD 63, RFC 3629, November 2003, <https://www.rfc-editor.org/info/rfc3629>.

**[RFC4648]** Josefsson, S., "The Base16, Base32, and Base64 Data Encodings", RFC 4648, October 2006, <https://www.rfc-editor.org/info/rfc4648>.

**[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017, <https://www.rfc-editor.org/info/rfc8174>.

**[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017, <https://www.rfc-editor.org/info/rfc8259>.

### 14.2 Informative References

**[AAA]** Renly, "Action Approval Attestation", version 1.0, [`specs/action-approval.md`](action-approval.md).

**[AGENT-CAPSULE]** Mih, S., "An Agent Action Capsule Profile for SCITT", Internet-Draft draft-mih-scitt-agent-action-capsule-05, September 2026, work in progress, <https://datatracker.ietf.org/doc/draft-mih-scitt-agent-action-capsule/>.

**[C2PA]** Coalition for Content Provenance and Authenticity, "Content Credentials: C2PA Technical Specification", version 2.4, April 2026, <https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html>.

**[GRP]** Renly, "Governed Runtime Profile", version 1.0, [`specs/governed-runtime-profile.md`](governed-runtime-profile.md).

**[IMPLEMENTATIONS]** Governed Runtime Standards, "Conformance and implementation reports", [`conformance/README.md`](../conformance/README.md).

**[OTEL-GENAI]** OpenTelemetry, "Semantic Conventions for Generative AI (GenAI)", development status, <https://github.com/open-telemetry/semantic-conventions-genai>.

**[PROV-AGENT]** Souza, R., Gueroudji, A., DeWitt, S., Rosendo, D., Ghosal, T., Ross, R., Balaprakash, P., and R. Ferreira da Silva, "PROV-AGENT: Unified Provenance for Tracking AI Agent Interactions in Agentic Workflows", arXiv:2508.02866, August 2025, <https://arxiv.org/abs/2508.02866>.

**[PROV-DM]** Moreau, L. and P. Missier, Eds., "PROV-DM: The PROV Data Model", W3C Recommendation, 30 April 2013, <https://www.w3.org/TR/2013/REC-prov-dm-20130430/>.

**[PROV-O]** Lebo, T., Sahoo, S., and D. McGuinness, Eds., "PROV-O: The PROV Ontology", W3C Recommendation, 30 April 2013, <https://www.w3.org/TR/2013/REC-prov-o-20130430/>.

**[RFC7493]** Bray, T., Ed., "The I-JSON Message Format", RFC 7493, March 2015, <https://www.rfc-editor.org/info/rfc7493>.

**[RFC7518]** Jones, M., "JSON Web Algorithms (JWA)", RFC 7518, May 2015, <https://www.rfc-editor.org/info/rfc7518>.

**[RFC8032]** Josefsson, S. and I. Liusvaara, "Edwards-Curve Digital Signature Algorithm (EdDSA)", RFC 8032, January 2017, <https://www.rfc-editor.org/info/rfc8032>.

**[RFC8785]** Rundgren, A., Jordan, B., and S. Erdtman, "JSON Canonicalization Scheme (JCS)", RFC 8785, June 2020, <https://www.rfc-editor.org/info/rfc8785>.

**[RFC9052]** Schaad, J., "CBOR Object Signing and Encryption (COSE): Structures and Process", STD 96, RFC 9052, August 2022, <https://www.rfc-editor.org/info/rfc9052>.

**[RFC9943]** Birkholz, H., Delignat-Lavaud, A., Fournet, C., Deshpande, Y., and S. Lasker, "An Architecture for Trustworthy and Transparent Digital Supply Chains", RFC 9943, June 2026, <https://www.rfc-editor.org/info/rfc9943>.

**[TEST-VECTORS]** Governed Runtime Standards, "Test vectors", [`test-vectors/`](../test-vectors).

## Appendix A. Change History

This appendix is informative.

| Date | Version | Change |
|---|---|---|
| 2026-09-03 | 1.0 | First publication. |
| 2026-10-15 | 1.0 | Editorial revision with errata and clarifications. The members, enumerations and conformance levels are unchanged. |

Changes in the revision of 2026-10-15:

- **Structure.** Reorganised into Status of This Document, Abstract, Introduction, Conventions and Terminology, the normative body, Conformance, Security Considerations, Privacy Considerations, Relationship to Other Work, and References split into normative and informative. Sections were renumbered: the record is now section 3 (was 5), correlation section 4 (was 7), canonical form section 5 (was 8), integrity section 6 (was 9), conformance levels section 7.2 (was 6).
- **Implementation statement removed.** The section "Conformance statement for Renly" (was section 15) is removed. Implementation reports and statuses are kept outside the specifications, in the `conformance/` directory [IMPLEMENTATIONS].
- **Clarification APR-1.0-C1 (requirements notation).** BCP 14 now cites RFC 8174 together with RFC 2119: the key words are normative only in capitals.
- **Clarification APR-1.0-C2 (section 3.2).** `action.kind` MUST be a registered value or begin with `x-`. This states as a requirement the open-vocabulary rule of principle 4, as the reference implementation has applied it at Level 1 since version 1.0.
- **Clarification APR-1.0-C3 (section 5).** Removing the `integrity` member applies to records and attestations only. Other content digested with the canonical procedure, such as tool arguments, keeps every member, so that a member named `integrity` cannot escape an `argsDigest`.
- **Clarification APR-1.0-C4 (section 6.2).** The HMAC key is an octet string; a textual evidence secret is used as its UTF-8 encoding.
- **Clarification APR-1.0-C5 (section 6.4).** The link proof is computed as for the MAC when `link.alg` is `hmac-sha256`, and a verifier can verify a contiguous segment of a chain.
- **Erratum APR-1.0-E1 (section 12, informative).** The Agent Action Capsule is identified as an individual Internet-Draft, not an IETF working group document; the SCITT architecture is cited as RFC 9943; the OpenTelemetry generative AI conventions are cited at their current location.
- **Additions.** Data types (section 2.3), conformance classes (section 7.1), claiming conformance (section 7.3), a note on signature algorithms (section 6.3), and expanded security and privacy considerations. These add no requirement on a conforming record beyond the clarifications above.
