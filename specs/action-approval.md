# Action Approval Attestation

**Specification identifier:** `action-approval/1.0`
**Status:** Working Draft, version 1.0. The field set is frozen for 1.0; clarifications and errata only.
**Schema:** `schema/action-approval-1.0.schema.json` (normative), published at `https://renly.ai/spec/action-approval/1.0/schema.json`
**License:** Apache License 2.0

## 1. Abstract

An Action Approval Attestation is a verifiable statement that an identified approver permitted, or refused, a specific proposed action by an AI agent. It binds the decision to the exact proposal the approver saw, gives the permission a defined scope and bounds, and can be sealed so that the permission itself is evidence.

It is the answer to the question the Action Provenance Record raises and the IETF Agent Action Capsule deliberately leaves open: on whose authority did this happen, and for exactly what.

## 2. Motivation

Human-in-the-loop is the safety mechanism every agent vendor promises and almost none of them specify. In practice "the user approved it" is a boolean in a database, disconnected from what was shown on screen, what was actually executed, and how long the permission lasted. That leaves three concrete failures unaddressed:

1. **Approve X, execute Y.** The agent proposes one thing, the human approves, and the arguments change before execution. Without binding the approval to a digest of the arguments, nothing detects this.
2. **Approval creep.** A single "yes" silently becomes a standing permission with no expiry, no use limit, and no record of what it matches.
3. **Unverifiable consent.** After the fact, nobody can prove that the approval existed, who gave it, or that it has not been edited.

This specification makes approval a first-class, bound, scoped, sealable document.

## 3. Terminology

RFC 2119 keywords apply. A **proposal** is what the runtime intends to do, presented to the approver before execution. A **grant** is an attestation with decision `approved` or `auto`. **Scope** is how many future proposals a grant covers. **Coverage** is the determination that a grant authorises a specific proposal now.

## 4. The attestation

| Member | Type | Description |
|---|---|---|
| `spec` (R) | string | MUST be `action-approval/1.0`. |
| `id` (R) | string | Unique identifier. |
| `correlationId` (R) | string | The action or run the attestation belongs to. For `single` scope this is the action's correlation; for `session` scope it MAY be the session identifier. |
| `proposal` (R) | object | What was approved. See 4.1. |
| `principal` (R) | party | Who requested the action. |
| `approver` (R) | party | Who decided. For decision `auto`, the policy engine as a `service` party. |
| `decision` (R) | `approved`, `rejected`, `auto` | |
| `scope` (R) | `single`, `session`, `standing` | See section 5. |
| `constraints` | object | `expiresAt`, `maxUses`, `matchOn[]`, `conditions[]`. |
| `decidedAt` (R) | timestamp | |
| `method` | string | `ui`, `api`, `delegated`, `policy`. |
| `policy` | object | `ref`, `version`: the policy under which approval was sought or granted. |
| `reason` | string | The approver's stated reason. |
| `revoked` | object | `at` (R), `by`, `reason`. Present once a grant has been withdrawn. |
| `integrity` | object | `contentDigest` (R), `mac`, `signature`, `sealedAt`. As in the Action Provenance Record, without a chain. |
| `extensions` | object | Reverse-DNS namespaced vendor extensions. |

### 4.1 Proposal

| Member | Type | Description |
|---|---|---|
| `kind` (R) | string | The action kind, as in the Action Provenance Record. |
| `tool`, `target` | string | Tool and external system. |
| `effect` (R) | `read`, `write` | |
| `argsDigest` (R) | digest | Digest of the exact arguments the approver saw. |
| `summary` | string | The human-readable description shown to the approver. |
| `presentedDigest` | digest | Digest of the full presentation when it contained more than the arguments. |

`argsDigest` is REQUIRED at Level 1. An approval that does not bind the arguments is not an approval of anything in particular.

## 5. Scope

- **`single`.** The grant covers one execution of exactly this proposal in exactly this correlation. This is the default and SHOULD be used for anything with a material effect.
- **`session`.** The grant covers proposals within one session that match on the members named in `constraints.matchOn`. It ends with the session.
- **`standing`.** The grant covers matching proposals until it expires, is exhausted or is revoked. A standing grant MUST carry `expiresAt` or `maxUses`. This models the "always allow" pattern safely.

For `session` and `standing` scope, `constraints.matchOn` MUST name the proposal members that must be equal for the grant to apply, for example `["tool", "target", "effect"]`. Arguments are deliberately not matched for these scopes; that is what makes them broader than `single`.

## 6. Coverage (normative)

Given a grant `G` and a proposal `P` to execute now with correlation `C`, `G` covers `P` if and only if all of the following hold:

1. `G.decision` is `approved` or `auto`.
2. `G.revoked` is absent.
3. `G.constraints.expiresAt`, if present, is later than now.
4. `G.constraints.maxUses`, if present, exceeds the number of executions already made under `G`.
5. `G.proposal.effect` equals `P.effect`.
6. If `G.scope` is `single`: `G.correlationId` equals `C` and `G.proposal.argsDigest` equals `P.argsDigest`.
7. If `G.scope` is `session` or `standing`: for every member `m` in `G.constraints.matchOn`, `G.proposal[m]` equals `P[m]`. For `session` scope, `G.correlationId` MUST additionally equal `C` or the current session identifier.

A runtime MUST evaluate coverage immediately before execution, not at the time of approval. A runtime MUST record which attestation covered an execution in the resulting Action Provenance Record's `approval.attestation`.

## 7. Conformance levels

- **Level 1: Bound.** The attestation validates against the schema. `argsDigest` binds the decision to the proposal.
- **Level 2: Scoped.** In addition: an `approved` or `rejected` decision MUST be made by a `human` party; an `auto` decision MUST cite `policy.ref`; a `session` or `standing` grant MUST name `constraints.matchOn`; a `standing` grant MUST carry `expiresAt` or `maxUses`.
- **Level 3: Verifiable.** In addition: the attestation is sealed with `integrity.contentDigest` and a `mac` or `signature`, computed as in the Action Provenance Record specification sections 8 and 9.

## 8. Relationship to the Action Provenance Record

The attestation is created before execution; the record is created after. The record's `approval.attestation` member carries the attestation's `id` or `contentDigest`. A verifier holding both can confirm that the executed `effects[].argsDigest` equals the approved `proposal.argsDigest` for a `single` grant, which is the check that closes the approve-X-execute-Y gap.

## 9. Security considerations

- **Binding.** Present the same bytes you digest. If the approver sees a summary, record `presentedDigest` as well as `argsDigest`, and make sure the summary cannot be misleading about the arguments.
- **Replay.** A `single` grant MUST be consumed on first execution. Runtimes SHOULD store consumed attestation identifiers.
- **Delegation.** `method: delegated` records that the approver acted through delegated authority. The delegating party SHOULD be recorded in `approver.onBehalfOf` where the profile supports it, or in `extensions`.
- **Revocation.** A revoked grant MUST stop covering proposals immediately. Revocation SHOULD itself be sealed.
- **Auto approvals.** An `auto` decision is only as good as the policy it cites. Runtimes SHOULD expose an organisation-wide cap on autonomy so that no agent can be granted more than the organisation allows.

## 10. Conformance statement for Renly

Renly presents every side-effecting action as an approval card bound to the proposed tool call, signs granted approvals with a dedicated evidence key, supports single approvals and time- and scope-bounded "always allow" grants, records the covering approval in the resulting evidence record, and enforces an organisation-wide autonomy cap. Renly implements this specification at **Level 3** using keyed MACs.
