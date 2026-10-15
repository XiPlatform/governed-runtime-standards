# Action Approval Attestation

**Version 1.0, Working Draft**

| | |
|---|---|
| Specification identifier | `action-approval/1.0` |
| Status | Working Draft. The field set and conformance rules of version 1.0 are frozen; this version receives errata and clarifications only. |
| This revision | 2026-10-15 |
| First published | 2026-09-03 |
| Latest version | https://github.com/XiPlatform/governed-runtime-standards/blob/main/specs/action-approval.md |
| Overview page | https://renly.ai/spec/action-approval |
| Schema (normative) | [`schema/action-approval-1.0.schema.json`](../schema/action-approval-1.0.schema.json), published at https://renly.ai/spec/action-approval/1.0/schema.json |
| Editor | Saif Ehsan (Renly) |
| Publisher | Renly (XiPlatform Pty Ltd, Australia) |
| Feedback | https://github.com/XiPlatform/governed-runtime-standards/issues |
| Licence | Apache License 2.0 |
| Companion specifications | [Action Provenance Record 1.0](action-provenance.md), [Governed Runtime Profile 1.0](governed-runtime-profile.md) |

## Status of This Document

This section describes the status of this document at the time of its publication.

This document is version 1.0 of the Action Approval Attestation specification, one of the three Governed Runtime Standards. It is a Working Draft published by Renly (XiPlatform Pty Ltd) under the process described in [GOVERNANCE.md](../GOVERNANCE.md). It has not been developed or endorsed by a standards development organisation.

The members, enumerations, coverage algorithm and conformance rules of version 1.0 are frozen. This version is changed only by errata and clarifications, which do not change the specification identifier and are listed in [Appendix A](#appendix-a-change-history) and in [CHANGELOG.md](../CHANGELOG.md). Proposals for a later version are welcome.

Comments are invited as issues in the specification repository; [CONTRIBUTING.md](../CONTRIBUTING.md) describes the issue types and the process. Security issues in this specification are reported privately, as described in [SECURITY.md](../SECURITY.md).

## Abstract

An Action Approval Attestation is a verifiable statement that an identified approver permitted, or refused, a specific proposed action by an AI agent. It binds the decision to the exact proposal the approver saw, gives the permission a defined scope and bounds, and can be sealed so that the permission itself is evidence.

It answers the question that an Action Provenance Record [APR] raises and that transparency formats such as the Agent Action Capsule [AGENT-CAPSULE] leave as an opaque reference: on whose authority did this happen, and for exactly what. This document defines the attestation, its three scopes, a normative coverage algorithm that decides whether a grant authorises a proposal at the moment of execution, and three cumulative conformance levels.

## Contents

1. [Introduction](#1-introduction)
2. [Conventions and Terminology](#2-conventions-and-terminology)
3. [The Attestation](#3-the-attestation)
4. [Scope](#4-scope)
5. [Coverage](#5-coverage)
6. [Integrity](#6-integrity)
7. [Conformance](#7-conformance)
8. [Relationship to the Action Provenance Record](#8-relationship-to-the-action-provenance-record)
9. [Security Considerations](#9-security-considerations)
10. [Privacy Considerations](#10-privacy-considerations)
11. [Relationship to Other Work](#11-relationship-to-other-work)
12. [Examples](#12-examples)
13. [References](#13-references)

[Appendix A. Change History](#appendix-a-change-history)

## 1. Introduction

### 1.1 Motivation

Human approval of agent actions is widely promised and rarely specified. In practice "the user approved it" is often a boolean in a database, disconnected from what was shown on screen, what was actually executed, and how long the permission lasted. That leaves three failures unaddressed:

1. **Approve X, execute Y.** The agent proposes one thing, the human approves, and the arguments change before execution. Without binding the approval to a digest of the arguments, nothing detects this.
2. **Approval creep.** A single approval silently becomes a standing permission with no expiry, no use limit, and no record of what it matches.
3. **Unverifiable consent.** After the fact, nobody can prove that the approval existed, who gave it, or that it has not been edited.

This specification makes approval a first-class document that is bound to a proposal, scoped, and sealable.

### 1.2 Scope

This document specifies the attestation format, its scopes, the coverage algorithm, how an attestation is sealed, and its conformance levels. It does not specify how a runtime presents a proposal to an approver, how approvers are authenticated, or how policies that grant `auto` decisions are written.

## 2. Conventions and Terminology

### 2.1 Requirements notation

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

Sections 1, 7.4, 11 and 12, Appendix A, the examples, and text marked as a note are informative. All other sections are normative.

### 2.2 Terms

- **Proposal.** What the runtime intends to do, presented to the approver before execution.
- **Approver.** The party that decides on a proposal: a human, or for an `auto` decision the policy engine acting as a `service` party.
- **Grant.** An attestation with decision `approved` or `auto`.
- **Scope.** How many future proposals a grant covers: `single`, `session` or `standing` (section 4).
- **Coverage.** The determination that a grant authorises a specific proposal now (section 5).
- **Enforcing runtime.** The runtime that evaluates coverage and executes, or refuses to execute, the proposal.
- Terms defined in the Action Provenance Record [APR], including principal, correlation, tenant, digest and canonical form, have the same meaning here.

### 2.3 Data types

Timestamps, digests, parties, party references and keyed proofs are as defined in section 2.3 of [APR], with one difference: in version 1.0 of this specification a party has no `onBehalfOf` member, and the schema [AAA-SCHEMA] does not permit one.

## 3. The Attestation

An attestation is a JSON object [RFC8259]. Members marked (R) are REQUIRED at Level 1. Other members are OPTIONAL unless a conformance level requires them (section 7.2). The JSON Schema [AAA-SCHEMA] is normative. It defines the permitted members and their types, and it does not permit members other than those defined in this section.

### 3.1 Members

| Member | Type | Description |
|---|---|---|
| `spec` (R) | string | MUST be `action-approval/1.0`. |
| `id` (R) | string | Unique identifier. |
| `correlationId` (R) | string | The action or run the attestation belongs to. For `single` scope this is the action's correlation; for `session` scope it MAY be the session identifier. |
| `proposal` (R) | object | What was approved. See section 3.2. |
| `principal` (R) | party | Who requested the action. |
| `approver` (R) | party | Who decided. For decision `auto`, the policy engine as a `service` party. |
| `decision` (R) | `approved`, `rejected`, `auto` | The decision. |
| `scope` (R) | `single`, `session`, `standing` | See section 4. |
| `constraints` | object | `expiresAt` (timestamp), `maxUses` (integer, at least 1), `matchOn` (array of proposal member names), `conditions` (array of strings). |
| `decidedAt` (R) | timestamp | When the decision was made. |
| `method` | string | `ui`, `api`, `delegated` or `policy`. |
| `policy` | object | `ref`, `version`: the policy under which approval was sought or granted. |
| `reason` | string | The approver's stated reason. |
| `revoked` | object | `at` (REQUIRED when `revoked` is present), `by`, `reason`. Present once a grant has been withdrawn. |
| `integrity` | object | `contentDigest` (REQUIRED when `integrity` is present), `mac`, `signature`, `sealedAt`. See section 6. |
| `extensions` | object | Vendor extensions keyed by reverse-DNS namespace, whose values are objects. |

### 3.2 Proposal

| Member | Type | Description |
|---|---|---|
| `kind` (R) | string | The action kind, as in the Action Provenance Record. |
| `tool`, `target` | string | Tool and external system. |
| `effect` (R) | `read`, `write` | The effect of the proposed action. |
| `argsDigest` (R) | digest | Digest of the exact arguments the approver saw. |
| `summary` | string | The human-readable description shown to the approver. |
| `presentedDigest` | digest | Digest of the full presentation when it contained more than the arguments. |

`argsDigest` is REQUIRED at Level 1. An approval that does not bind the arguments is not an approval of anything in particular. When the arguments are JSON, `argsDigest` is computed over their canonical form as described in section 5 of [APR], which removes no member from content other than a record or an attestation.

## 4. Scope

- **`single`.** The grant covers one execution of exactly this proposal in exactly this correlation. This is the default and SHOULD be used for anything with a material effect.
- **`session`.** The grant covers proposals within one session that match on the members named in `constraints.matchOn`. It ends with the session.
- **`standing`.** The grant covers matching proposals until it expires, is exhausted or is revoked. A standing grant MUST carry `expiresAt` or `maxUses`. This models the "always allow" pattern safely.

For `session` and `standing` scope, `constraints.matchOn` MUST name the proposal members that must be equal for the grant to apply, for example `["tool", "target", "effect"]`. Arguments are deliberately not matched for these scopes; that is what makes them broader than `single`.

## 5. Coverage

Given a grant `G` and a proposal `P` to execute now with correlation `C`, `G` covers `P` if and only if all of the following hold:

1. `G.decision` is `approved` or `auto`.
2. `G.revoked` is absent.
3. `G.constraints.expiresAt`, if present, is later than now.
4. `G.constraints.maxUses`, if present, exceeds the number of executions already made under `G`.
5. `G.proposal.effect` equals `P.effect`.
6. If `G.scope` is `single`: `G.correlationId` equals `C` and `G.proposal.argsDigest` equals `P.argsDigest`.
7. If `G.scope` is `session` or `standing`: for every member `m` in `G.constraints.matchOn`, `G.proposal[m]` equals `P[m]`. For `session` scope, `G.correlationId` MUST additionally equal `C` or the current session identifier.

A runtime MUST evaluate coverage immediately before execution, not at the time of approval. A runtime MUST record which attestation covered an execution in the resulting Action Provenance Record's `approval.attestation`.

Note: the coverage test vectors in [TEST-VECTORS] include boundary cases for expiry (a grant whose `expiresAt` equals now does not cover) and for use limits, changed arguments, revocation and session matching. The order in which an implementation evaluates the conditions, and the reason it reports when coverage fails, are not specified.

## 6. Integrity

An attestation is sealed in the same way as an Action Provenance Record, without a chain. `integrity.contentDigest` is the digest of the canonical form of the attestation with `integrity` removed, as defined in sections 5 and 6.1 of [APR]. `integrity.mac` and `integrity.signature` are computed as defined in sections 6.2 and 6.3 of [APR]. `integrity.sealedAt` is informational and is excluded from every digest and proof, as in section 6.5 of [APR].

Adding `revoked` to a sealed attestation changes its content digest, so the existing seal no longer verifies. Section 9 recommends that revocation itself be sealed.

## 7. Conformance

### 7.1 Conformance classes

- **Producers** create and seal attestations. A producer conforms at one of the levels in section 7.2.
- **Enforcing runtimes** evaluate coverage and execute proposals. An enforcing runtime evaluates coverage as in section 5, immediately before execution, records the covering attestation as required by section 5, and meets the requirements on consumption and revocation in section 9.
- **Verifiers** check the integrity of attestations as in section 6, and can check an executed action against the attestation that covered it (section 8).

### 7.2 Conformance levels

Each level includes the one before it.

- **Level 1: Bound.** The attestation validates against the schema [AAA-SCHEMA]. `argsDigest` binds the decision to the proposal.
- **Level 2: Scoped.** In addition: an `approved` or `rejected` decision MUST be made by a `human` party; an `auto` decision MUST cite `policy.ref`; a `session` or `standing` grant MUST name `constraints.matchOn`; a `standing` grant MUST carry `expiresAt` or `maxUses`.
- **Level 3: Verifiable.** In addition: the attestation is sealed with `integrity.contentDigest` and a `mac` or `signature`, computed as in section 6.

### 7.3 Claiming conformance

A claim names the specification identifier and a level, for example `action-approval/1.0 Level 3`, and is a claim about every attestation the implementation produces. A claim that holds only for some editions, plans or configurations of a product states the limitation.

Claims are self-declared. Implementation reports, and the recommended format for them, are collected in the `conformance/` directory of the specification repository [IMPLEMENTATIONS]. That directory is informative and is not part of this specification.

### 7.4 Reference implementation and test vectors

This section is informative. The specification repository contains a reference implementation of this specification, a test suite, and test vectors [TEST-VECTORS] for content digests, sealing, coverage and conformance levels. Where the reference implementation or the test vectors disagree with this document, this document prevails and the disagreement is handled as an erratum.

## 8. Relationship to the Action Provenance Record

The attestation is created before execution; the record is created after. The record's `approval.attestation` member carries the attestation's `id` or `contentDigest`. A verifier holding both can confirm that the executed `effects[].argsDigest` equals the approved `proposal.argsDigest` for a `single` grant, which is the check that closes the approve-X-execute-Y gap.

## 9. Security Considerations

- **Binding.** Present the same bytes you digest. If the approver sees a summary, record `presentedDigest` as well as `argsDigest`, and make sure the summary cannot be misleading about the arguments.
- **Replay.** A `single` grant MUST be consumed on first execution. Runtimes SHOULD store consumed attestation identifiers.
- **Use counting.** For a grant with `maxUses`, the count of executions is held by the enforcing runtime, not by the attestation. Unless the count is checked and incremented atomically, concurrent executions under one grant can exceed the limit.
- **Delegation.** `method: delegated` records that the approver acted through delegated authority. The delegating party SHOULD be recorded in `extensions`, because the version 1.0 schema does not permit an `onBehalfOf` member on the approver (section 2.3).
- **Revocation.** A revoked grant MUST stop covering proposals immediately. Revocation SHOULD itself be sealed.
- **Auto approvals.** An `auto` decision is only as good as the policy it cites. Runtimes SHOULD expose an organisation-wide cap on autonomy so that no agent can be granted more than the organisation allows.
- **Clocks.** Expiry is evaluated against the enforcing runtime's clock. A runtime whose clock is wrong extends or shortens every grant with an `expiresAt`.
- **Keys.** The considerations for evidence keys in section 10 of [APR] apply to attestations.

## 10. Privacy Considerations

An attestation identifies the principal and the approver, and its `summary` and `reason` are free text that often contains personal information, such as the recipient of a message. The `summary` exists to record what the approver saw; where that presentation is sensitive, `presentedDigest` binds it without the attestation carrying it, and the presentation can be held, and erased, separately.

The privacy considerations of [APR] (section 11) apply: digests of low-entropy content are not anonymous, sealed attestations cannot be redacted without invalidating their seal, and attestations are confidential to the tenant. Attestations are best retained for at least as long as the records that cite them, so that every `approval.attestation` reference in a retained record can be resolved.

## 11. Relationship to Other Work

This section is informative. The Agent Action Capsule Profile for SCITT [AGENT-CAPSULE], an individual Internet-Draft, records what an agent executed and carries the authority under which the action was permitted as an opaque reference. An Action Approval Attestation, identified by its `id` or `contentDigest`, is a concrete, verifiable form for that authority.

## 12. Examples

This section is informative. The digests in the examples are illustrative.

- [`examples/approval-single.json`](../examples/approval-single.json): a single-scope human approval of an email send. Level 2 as written, Level 3 once sealed.
- [`examples/approval-standing.json`](../examples/approval-standing.json): a standing "always allow" grant for creating draft invoices, bounded by an expiry and a use limit, matching on tool, target and effect. Level 2.

Sealed forms of these attestations, and coverage cases, are in [TEST-VECTORS].

## 13. References

### 13.1 Normative References

**[AAA-SCHEMA]** Renly, "Action Approval Attestation 1.0 JSON Schema", `schema/action-approval-1.0.schema.json`, <https://renly.ai/spec/action-approval/1.0/schema.json>.

**[APR]** Renly, "Action Provenance Record", version 1.0, [`specs/action-provenance.md`](action-provenance.md).

**[JSON-SCHEMA]** Wright, A., Ed., Andrews, H., Ed., Hutton, B., Ed., and G. Dennis, "JSON Schema: A Media Type for Describing JSON Documents", draft-bhutton-json-schema-01, June 2022, <https://json-schema.org/draft/2020-12/json-schema-core>; and Wright, A., Ed., Andrews, H., Ed., and B. Hutton, Ed., "JSON Schema Validation: A Vocabulary for Structural Validation of JSON", draft-bhutton-json-schema-validation-01, June 2022, <https://json-schema.org/draft/2020-12/json-schema-validation>.

**[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997, <https://www.rfc-editor.org/info/rfc2119>.

**[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017, <https://www.rfc-editor.org/info/rfc8174>.

**[RFC8259]** Bray, T., Ed., "The JavaScript Object Notation (JSON) Data Interchange Format", STD 90, RFC 8259, December 2017, <https://www.rfc-editor.org/info/rfc8259>.

The normative references of [APR] apply to the digests and proofs used in this document.

### 13.2 Informative References

**[AGENT-CAPSULE]** Mih, S., "An Agent Action Capsule Profile for SCITT", Internet-Draft draft-mih-scitt-agent-action-capsule-05, September 2026, work in progress, <https://datatracker.ietf.org/doc/draft-mih-scitt-agent-action-capsule/>.

**[GRP]** Renly, "Governed Runtime Profile", version 1.0, [`specs/governed-runtime-profile.md`](governed-runtime-profile.md).

**[IMPLEMENTATIONS]** Governed Runtime Standards, "Conformance and implementation reports", [`conformance/README.md`](../conformance/README.md).

**[TEST-VECTORS]** Governed Runtime Standards, "Test vectors", [`test-vectors/`](../test-vectors).

## Appendix A. Change History

This appendix is informative.

| Date | Version | Change |
|---|---|---|
| 2026-09-03 | 1.0 | First publication. |
| 2026-10-15 | 1.0 | Editorial revision with errata and clarifications. The members, enumerations, coverage algorithm and conformance levels are unchanged. |

Changes in the revision of 2026-10-15:

- **Structure.** Reorganised into Status of This Document, Abstract, Introduction, Conventions and Terminology, the normative body, Conformance, Security Considerations, Privacy Considerations, and References split into normative and informative. Sections were renumbered: the attestation is now section 3 (was 4), scope section 4 (was 5), coverage section 5 (was 6), conformance levels section 7.2 (was 7). Sealing, previously described within Level 3, has its own section 6. References to the Action Provenance Record now use its renumbered sections 5 and 6 (were 8 and 9).
- **Implementation statement removed.** The section "Conformance statement for Renly" (was section 10) is removed. Implementation reports and statuses are kept outside the specifications, in the `conformance/` directory [IMPLEMENTATIONS].
- **Clarification AAA-1.0-C1 (requirements notation).** BCP 14 now cites RFC 8174 together with RFC 2119: the key words are normative only in capitals.
- **Clarification AAA-1.0-C2 (section 3.2).** `argsDigest` over JSON arguments uses the canonical form of [APR] section 5, which removes no member from the arguments.
- **Erratum AAA-1.0-E1 (section 9, delegation).** The text suggested recording the delegating party in `approver.onBehalfOf`. The version 1.0 schema does not permit `onBehalfOf` on an attestation party, so an attestation following that suggestion would fail Level 1. The delegating party is recorded in `extensions`.
- **Erratum AAA-1.0-E2 (Abstract, informative).** The Agent Action Capsule is identified as an individual Internet-Draft, not an IETF working group document.
- **Additions.** Data types (section 2.3), the integrity section (section 6), conformance classes (section 7.1), claiming conformance (section 7.3), privacy considerations, and security notes on use counting, clocks and keys. These add no requirement on a conforming attestation.
