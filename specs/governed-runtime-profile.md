# Governed Runtime Profile

**Specification identifier:** `governed-runtime/1.0`
**Status:** Working Draft, version 1.0.
**License:** Apache License 2.0

## 1. Abstract

"Governed" is an unregulated word. Any runtime that executes AI agents can claim it. This profile defines what the word has to mean for the claim to be checkable: twelve guarantees a runtime provides about attribution, effects, approval, policy, failure, control, isolation, models and integrity, grouped into three conformance levels, with the evidence a reviewer can ask for.

It is the companion of the Action Provenance Record (what happened) and the Action Approval Attestation (what was permitted). Those specify documents. This one specifies the runtime that produces them.

## 2. Why a profile

An organisation adopting AI agents has to answer to an audit committee, a regulator, or its own board for what those agents do. It cannot do that by reading vendor marketing. It needs a short, fixed list of properties it can put in a procurement questionnaire, test in a proof of concept, and hold a vendor to in a contract. This profile is that list.

Framed differently: if an AI operating system is the layer that lets agents act on real systems, this profile is the set of kernel guarantees that layer must provide before anyone should let it act.

## 3. Terminology

RFC 2119 keywords apply. A **runtime** is software that executes AI agents and mediates their access to tools, data and external systems. A **tenant** is an organisation whose agents, data and records the runtime holds in isolation. A **side-effecting action** is one that changes state outside the runtime. Terms defined in the companion specifications keep their meaning here.

## 4. The guarantees

Each guarantee states what the runtime MUST do and what evidence a reviewer can ask for.

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
No side-effecting action MAY execute without either a covering Action Approval Attestation from a human, or an `auto` grant under a cited policy that the tenant has configured. The runtime MUST evaluate coverage immediately before execution.
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
Records, policies, approvals, agents and connected credentials MUST be scoped to a tenant. No request MAY read or write another tenant's data. Platform-level administrative access MUST itself be recorded.
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

## 5. Conformance levels

| Level | Name | Guarantees |
|---|---|---|
| 1 | Attributable runtime | GR-1, GR-2, GR-3, GR-9, GR-10 |
| 2 | Governed runtime | Level 1 plus GR-4, GR-5, GR-6, GR-7, GR-8, GR-12 |
| 3 | Verifiable runtime | Level 2 plus GR-11 |

A runtime MAY claim a level only when every guarantee at that level holds for every tenant and every agent, not only under a particular configuration. Where a guarantee is available only on some plans, the claim MUST say so.

## 6. Conformance statement

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

Reviewers SHOULD test the statement against section 4 rather than accept it.

## 7. How to audit a claim in an afternoon

1. Ask for the conformance statement and the tool registry (GR-3).
2. In a test tenant, attempt one write without approval (GR-4) and one write with the policy service stalled (GR-6).
3. Engage the kill switch during a running job (GR-7).
4. Lower the autonomy cap and rerun an `auto` agent (GR-8).
5. Export a day of records and verify the chain with the reference implementation (GR-11).
6. Read three records end to end and confirm every member the level requires is present (GR-1, GR-2, GR-5, GR-10).

If any step fails, the runtime is not at the level it claims, whatever the marketing says.

## 8. Relationship to other work

This profile does not replace security frameworks. ISO/IEC 42001 asks an organisation to manage AI responsibly; this profile tells it what its runtime must guarantee so that management is possible. NIST AI RMF's "Govern" and "Manage" functions map to GR-5, GR-7 and GR-8. The Australian Government's Policy for the responsible use of AI in government requires accountable officials and records of AI use; GR-1, GR-2 and GR-11 are what make those records exist and hold. Security controls such as the ISM and Essential Eight apply to the platform underneath the runtime and are out of scope here.

## 9. Conformance statement for Renly

Renly conforms at **Level 3**. Every guarantee is implemented on all plans with one stated exception: GR-6 fail-closed *semantic* policy evaluation is an Enterprise plan capability; structural policy gates fail closed on every plan. Renly's autonomy scale is `suggest`, `approve`, `auto` with an organisation-wide cap, and a separate finer-grained scale for coding agents. Renly's conformance statement is published at `https://renly.ai/standards`.
