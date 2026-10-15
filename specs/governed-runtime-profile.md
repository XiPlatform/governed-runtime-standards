# Governed Runtime Profile

**Version 1.0, Working Draft**

| | |
|---|---|
| Specification identifier | `governed-runtime/1.0` |
| Status | Working Draft. The guarantees and conformance levels of version 1.0 are frozen; this version receives errata and clarifications only. |
| This revision | 2026-10-15 |
| First published | 2026-09-03 |
| Latest version | https://github.com/XiPlatform/governed-runtime-standards/blob/main/specs/governed-runtime-profile.md |
| Overview page | https://renly.ai/spec/governed-runtime-profile |
| Editor | Saif Ehsan (Renly) |
| Publisher | Renly (XiPlatform Pty Ltd, Australia) |
| Feedback | https://github.com/XiPlatform/governed-runtime-standards/issues |
| Licence | Apache License 2.0 |
| Companion specifications | [Action Provenance Record 1.0](action-provenance.md), [Action Approval Attestation 1.0](action-approval.md) |

## Status of This Document

This section describes the status of this document at the time of its publication.

This document is version 1.0 of the Governed Runtime Profile, one of the three Governed Runtime Standards. It is a Working Draft published by Renly (XiPlatform Pty Ltd) under the process described in [GOVERNANCE.md](../GOVERNANCE.md). It has not been developed or endorsed by a standards development organisation.

The guarantees and conformance levels of version 1.0 are frozen. This version is changed only by errata and clarifications, which do not change the specification identifier and are listed in [Appendix A](#appendix-a-change-history) and in [CHANGELOG.md](../CHANGELOG.md). Proposals for a later version are welcome.

Comments are invited as issues in the specification repository; [CONTRIBUTING.md](../CONTRIBUTING.md) describes the issue types and the process. Security issues in this specification are reported privately, as described in [SECURITY.md](../SECURITY.md).

## Abstract

The word "governed" is applied to AI agent runtimes without an agreed meaning, so a claim that a runtime is governed cannot be checked. This profile defines what the word has to mean for such a claim to be checkable: twelve guarantees a runtime provides about attribution, effects, approval, policy, failure, control, isolation, models and integrity, grouped into three conformance levels, with the evidence a reviewer can ask for and a procedure for reviewing a claim.

It is the companion of the Action Provenance Record [APR] (what happened) and the Action Approval Attestation [AAA] (what was permitted). Those specify documents. This one specifies the runtime that produces them.

## Contents

1. [Introduction](#1-introduction)
2. [Conventions and Terminology](#2-conventions-and-terminology)
3. [The Guarantees](#3-the-guarantees)
4. [Conformance](#4-conformance)
5. [Conformance Review Procedure](#5-conformance-review-procedure)
6. [Security Considerations](#6-security-considerations)
7. [Privacy Considerations](#7-privacy-considerations)
8. [Relationship to Other Work](#8-relationship-to-other-work)
9. [References](#9-references)

[Appendix A. Change History](#appendix-a-change-history)

## 1. Introduction

### 1.1 Why a profile

An organisation adopting AI agents answers to an audit committee, a regulator, or its own board for what those agents do. It cannot do that from vendor descriptions. It needs a short, fixed list of properties it can put in a procurement questionnaire, test in a proof of concept, and hold a supplier to in a contract. This profile is that list.

The guarantees play a role for an agent runtime similar to the one an operating system kernel plays for the programs it runs: they are properties that hold whatever an individual agent has been instructed to do.

### 1.2 Scope

This profile specifies runtime behaviour and the evidence for it. It does not specify how a runtime implements the guarantees, and it does not replace security, privacy or AI management frameworks (section 8).

## 2. Conventions and Terminology

### 2.1 Requirements notation

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

Section 1, section 4.4, section 5, section 8, Appendix A, the *Evidence* paragraphs of section 3, and text marked as a note are informative. All other sections are normative.

### 2.2 Terms

- **Runtime.** Software that executes AI agents and mediates their access to tools, data and external systems.
- **Tenant.** An organisation whose agents, data and records the runtime holds in isolation.
- **Tenant administrator.** A person the tenant has authorised to administer the runtime for that tenant.
- **Side-effecting action.** An action that changes state outside the runtime.
- **Autonomy level.** The degree to which an agent may act without a human decision (GR-8).
- **Reviewer.** A person testing a runtime's conformance claim, for example a customer, an auditor or an assessor.
- Terms defined in the companion specifications [APR] [AAA] keep their meaning here.

## 3. The Guarantees

Each guarantee states what the runtime MUST do. The *Evidence* paragraph that follows it describes what a reviewer can ask for; it is informative and is not the only acceptable evidence.

### GR-1 Attribution

Every action MUST be attributable to a principal, and where an agent acted, to the agent and the model that acted. Impersonation and delegation MUST be recorded as such, never hidden.

*Evidence:* Action Provenance Records at Level 1 for a sample of actions.

### GR-2 Provenance

The runtime MUST produce an Action Provenance Record for every action, on every plan or tier, and MUST retain it for a period the tenant controls.

*Evidence:* the retention setting; records for a chosen day; an export.

### GR-3 Effect classification

Every tool the runtime can invoke MUST be classified as `read` or `write` before it can be used, and the classification MUST be recorded in every effect entry. Unclassified tools MUST be treated as `write`.

*Evidence:* the tool registry with classifications.

### GR-4 Approval gate

A side-effecting action MUST NOT execute unless it is covered by an Action Approval Attestation from a human, or by an `auto` grant under a cited policy that the tenant has configured. The runtime MUST evaluate coverage immediately before execution.

*Evidence:* attempt a write without approval; observe that it is held, not executed.

### GR-5 Versioned policy

Every action MUST be evaluated against a policy identified by reference and version, and the verdict MUST be recorded. Policy changes MUST be attributable.

*Evidence:* the policy history; a record showing `policy.ref` and `policy.version`.

### GR-6 Fail closed

When policy evaluation is unavailable, degraded, or times out, side-effecting actions MUST be blocked, not bypassed. The runtime MAY continue read-only work. The outcome MUST be recorded as `blocked`.

*Evidence:* disable or stall the policy service in a test tenant; observe that writes stop.

### GR-7 Kill switch

A tenant administrator MUST be able to halt all agent execution for the tenant immediately, and the halt MUST take effect before the next side-effecting action. The runtime MUST NOT require vendor intervention to engage it.

*Evidence:* engage it; observe in-flight work stopping.

### GR-8 Autonomy levels

The runtime MUST expose a defined scale of agent autonomy and an organisation-wide cap. The effective level of any agent MUST be the lesser of what it is configured for and what the organisation allows. The scale MUST include at least:

| Level | Meaning |
|---|---|
| `observe` | The agent produces analysis only; no tool calls. |
| `suggest` | The agent may call read tools and propose writes; it never executes a write. |
| `approve` | The agent executes writes only under a covering approval. |
| `auto` | The agent executes writes under policy-granted `auto` approvals, within the cap. |

*Evidence:* set the cap to `approve`; observe that an `auto`-configured agent is held for approval.

### GR-9 Tenant isolation

Records, policies, approvals, agents and connected credentials MUST be scoped to a tenant. A request MUST NOT read or write another tenant's data. Platform-level administrative access MUST itself be recorded.

*Evidence:* the data model; a penetration test finding on cross-tenant access.

### GR-10 Model control

The runtime MUST record the resolved model and provider for every action, and MUST let the tenant restrict which models and providers its agents may use, including the option to use only models the tenant hosts or licenses itself.

*Evidence:* the model allow-list; a record's `model` member.

### GR-11 Integrity

Records MUST be sealed at Action Provenance Record Level 3 and chained per tenant. The tenant MUST be able to export records and verify them offline.

*Evidence:* an export; an independent verification of its chain.

### GR-12 Least privilege

An agent MUST receive only the tools and connections it has been granted, and MUST NOT be able to acquire more at run time. Grants MUST be attributable.

*Evidence:* an agent's grant list; an attempt to use an ungranted tool.

## 4. Conformance

### 4.1 Conformance levels

| Level | Name | Guarantees |
|---|---|---|
| 1 | Attributable runtime | GR-1, GR-2, GR-3, GR-9, GR-10 |
| 2 | Governed runtime | Level 1 plus GR-4, GR-5, GR-6, GR-7, GR-8, GR-12 |
| 3 | Verifiable runtime | Level 2 plus GR-11 |

### 4.2 Claiming conformance

A runtime MAY claim a level only when every guarantee at that level holds for every tenant and every agent, not only under a particular configuration. Where a guarantee is available only on some plans, the claim MUST say so.

### 4.3 Conformance statement

A runtime claiming conformance SHOULD publish a statement in this form:

```json
{
  "spec": "governed-runtime/1.0",
  "runtime": { "name": "Example Runtime", "version": "4.2", "vendor": "Example Pty Ltd" },
  "level": 3,
  "guarantees": {
    "GR-1": "yes", "GR-2": "yes", "GR-3": "yes", "GR-4": "yes", "GR-5": "yes", "GR-6": "yes, Enterprise plan",
    "GR-7": "yes", "GR-8": "yes", "GR-9": "yes", "GR-10": "yes", "GR-11": "yes", "GR-12": "yes"
  },
  "records": { "provenance": "action-provenance/1.0 Level 3", "approval": "action-approval/1.0 Level 3" },
  "statedAt": "2026-09-02",
  "evidence": "https://example.com/trust/governed-runtime"
}
```

The members are:

| Member | Meaning |
|---|---|
| `spec` | The profile identifier, `governed-runtime/1.0`. |
| `runtime` | The `name`, `version` and `vendor` of the runtime. |
| `level` | The level claimed: 1, 2 or 3. |
| `guarantees` | For each guarantee, `yes`, or a qualified answer that states a limitation, such as the plans on which the guarantee is available (section 4.2). |
| `records` | The specification identifier and level of the records and attestations the runtime produces. |
| `statedAt` | The date of the statement. |
| `evidence` | Where a reviewer can obtain evidence. |

Reviewers SHOULD test the statement against section 3 rather than accept it.

### 4.4 Implementation reports

This section is informative. Conformance is self-declared. Implementation reports, including conformance statements in the form above, are collected in the `conformance/` directory of the specification repository [IMPLEMENTATIONS], which also describes how to submit one. That directory is not part of this specification.

## 5. Conformance Review Procedure

This section is informative. It describes a minimum review that a reviewer can perform to test a claim at Level 2 or Level 3 rather than accept it.

**Scope.** The procedure exercises GR-1 to GR-8, GR-10 and GR-11 by observation in a test tenant. GR-9 (tenant isolation) and GR-12 (least privilege) are assessed from the evidence listed for them in section 3. The procedure samples behaviour: it can show that a claim is false, but passing it does not prove that every guarantee holds for every tenant and every agent, and it does not replace a security assessment.

**Prerequisites.** A test tenant with an administrator account; an agent able to perform at least one write against a connected test system; a means, provided by the runtime operator, to stall or disable policy evaluation for the test tenant; and the reference implementation [REFERENCE-IMPL] or another verifier for step 5.

**Expected effort.** With the prerequisites in place, the procedure takes a reviewer a few hours. Arranging access to a test tenant is usually the longer task.

**Steps.**

1. Ask for the conformance statement and the tool registry (GR-3).
2. In a test tenant, attempt one write without approval (GR-4) and one write with the policy service stalled (GR-6).
3. Engage the kill switch during a running job (GR-7).
4. Lower the autonomy cap and rerun an `auto` agent (GR-8).
5. Export a day of records and verify the chain with the reference implementation (GR-11).
6. Read three records end to end and confirm every member the level requires is present (GR-1, GR-2, GR-5, GR-10).

**Outcome.** If any step fails, the runtime does not meet the level it claims.

## 6. Security Considerations

**Claims are self-declared.** Conformance to this profile is not a certification, and a statement is only as reliable as the review that tests it (section 5). The profile does not assess the security of the platform underneath the runtime (section 8).

**The operator holds the keys.** Level 3 records prove that they have not changed since sealing. When the runtime operator holds the evidence keys, they do not prove that the operator recorded events honestly. Signatures under keys the tenant controls, and anchoring chain heads outside the operator (see section 10 of [APR]), reduce this dependence.

**Review in a test tenant.** Steps 2 to 4 of the review procedure deliberately exercise failure and control paths. They are performed in a test tenant, never in a tenant that serves production work.

**Availability trade-offs.** GR-6 and GR-7 trade availability for safety: while policy evaluation is unavailable, or the kill switch is engaged, side-effecting work stops. Tenants plan for that, for example with a manual fallback for time-critical writes.

**Operator access.** GR-9 requires platform-level administrative access to be recorded, so the operator's own staff are within the scope of attribution.

## 7. Privacy Considerations

The records a conforming runtime produces contain personal information; the privacy considerations of [APR] (section 11) and [AAA] (section 10) apply. GR-2 gives the tenant control of retention, and GR-11 gives it the ability to export records, which supports access, correction and retention obligations. Exports made for a conformance review contain personal information when they come from a tenant with real users; using a test tenant with synthetic data for the review avoids this. GR-10 also lets a tenant restrict which model providers process its data, which is relevant to where that data is processed.

## 8. Relationship to Other Work

This section is informative. This profile does not replace security or AI management frameworks. ISO/IEC 42001 [ISO42001] asks an organisation to manage AI responsibly; this profile tells it what its runtime must guarantee so that management is possible. The Govern and Manage functions of the NIST AI Risk Management Framework [NIST-AI-RMF] map to GR-5, GR-7 and GR-8. The Australian Government's Policy for the responsible use of AI in government [DTA-AI-POLICY] requires agencies to designate accountable officials and to keep registers of their AI use cases; GR-1, GR-2 and GR-11 provide attributable, retained and verifiable records of each action taken under a registered use case, which an accountable official can rely on. Security controls such as those of the Information Security Manual [ISM] and the Essential Eight [E8] apply to the platform underneath the runtime and are out of scope here.

## 9. References

### 9.1 Normative References

**[AAA]** Renly, "Action Approval Attestation", version 1.0, [`specs/action-approval.md`](action-approval.md).

**[APR]** Renly, "Action Provenance Record", version 1.0, [`specs/action-provenance.md`](action-provenance.md).

**[RFC2119]** Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997, <https://www.rfc-editor.org/info/rfc2119>.

**[RFC8174]** Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017, <https://www.rfc-editor.org/info/rfc8174>.

### 9.2 Informative References

**[DTA-AI-POLICY]** Digital Transformation Agency, Australian Government, "Policy for the responsible use of AI in government", version 2.0, effective 15 December 2025, <https://www.digital.gov.au/ai/ai-in-government-policy>.

**[E8]** Australian Signals Directorate, "Essential Eight", <https://www.cyber.gov.au/essential-eight>.

**[IMPLEMENTATIONS]** Governed Runtime Standards, "Conformance and implementation reports", [`conformance/README.md`](../conformance/README.md).

**[ISM]** Australian Signals Directorate, "Information Security Manual", <https://www.cyber.gov.au/ism>.

**[ISO42001]** ISO/IEC, "Information technology - Artificial intelligence - Management system", ISO/IEC 42001:2023, December 2023, <https://www.iso.org/standard/42001>.

**[NIST-AI-RMF]** National Institute of Standards and Technology, "Artificial Intelligence Risk Management Framework (AI RMF 1.0)", NIST AI 100-1, January 2023, <https://doi.org/10.6028/NIST.AI.100-1>.

**[REFERENCE-IMPL]** Governed Runtime Standards, "Reference implementation", [`src/`](../src).

## Appendix A. Change History

This appendix is informative.

| Date | Version | Change |
|---|---|---|
| 2026-09-03 | 1.0 | First publication. |
| 2026-10-15 | 1.0 | Editorial revision with errata and clarifications. The guarantees and conformance levels are unchanged. |

Changes in the revision of 2026-10-15:

- **Structure.** Reorganised into Status of This Document, Abstract, Introduction, Conventions and Terminology, the guarantees, Conformance, the review procedure, Security Considerations, Privacy Considerations, and References split into normative and informative. Sections were renumbered: the guarantees are now section 3 (were 4), conformance levels section 4.1 (was 5), the conformance statement section 4.3 (was 6), the review procedure section 5 (was 7).
- **Implementation statement removed.** The section "Conformance statement for Renly" (was section 9) is removed. Implementation reports and statuses are kept outside the specifications, in the `conformance/` directory [IMPLEMENTATIONS].
- **Clarification GRP-1.0-C1 (requirements notation).** BCP 14 now cites RFC 8174 together with RFC 2119: the key words are normative only in capitals.
- **Erratum GRP-1.0-E1 (GR-4 and GR-9).** The text used "MAY" in negative sentences ("No side-effecting action MAY execute", "No request MAY read or write"), a construction BCP 14 does not define. Both are restated with "MUST NOT". The meaning is unchanged.
- **Clarification GRP-1.0-C2 (section 5).** The audit procedure (previously section 7) is renamed "Conformance review procedure", marked informative, and given a stated scope, prerequisites and expected effort. Its steps are unchanged.
- **Clarification GRP-1.0-C3 (section 8, informative).** The description of the Australian Government policy is updated to version 2.0 of that policy and states its requirements precisely.
- **Additions.** A description of the conformance statement members (section 4.3), security and privacy considerations, and a statement that the evidence paragraphs are informative. These add no requirement on a conforming runtime.
