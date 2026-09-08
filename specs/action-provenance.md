# Action Provenance Record

**Specification identifier:** `action-provenance/1.0`
**Status:** Working Draft, version 1.0. The field set is frozen for 1.0; clarifications and errata only.
**Schema:** `schema/action-provenance-1.0.schema.json` (normative), published at `https://renly.ai/spec/action-provenance/1.0/schema.json`
**License:** Apache License 2.0
**Maintainer:** Renly (XiPlatform Pty Ltd), with community contributions

## 1. Abstract

An Action Provenance Record (APR) is a verifiable JSON document describing one action taken by or through an AI agent. It answers, in one place and in one format, the questions an auditor, a regulator, or a manager will ask after the fact: who requested the action, which agent and which model acted, what policy decided, who approved it, what it did to which system, and what happened.

The record is designed to be produced by any agent runtime, stored for as long as the organisation needs, exported to auditors, and verified offline without access to the system that produced it.

## 2. Motivation

Provenance for AI has so far meant *content* provenance: where a file came from and whether a model made it (C2PA). That question matters, but it is not the question that arises when an agent acts. An agent does not merely produce a paragraph; it sends the email, changes the record, moves the money. Once AI takes the action itself, the question shifts from "is this output good" to "can we account for what happened."

Existing work covers pieces of the answer. W3C PROV and its agent extensions model activity graphs but are silent on approval, policy and business-system effects. The IETF Agent Action Capsule records what was executed and binds it cryptographically, and deliberately leaves the *authority* that permitted the action as an opaque reference. Observability conventions record model and token usage, not accountability.

The Action Provenance Record fills the gap between them: a single operator-facing document that binds attribution, authority, policy, model, effect and outcome together, with an integrity model that a small team can implement in an afternoon and an auditor can verify with a hash function.

## 3. Terminology

The key words MUST, MUST NOT, REQUIRED, SHOULD, SHOULD NOT, RECOMMENDED, MAY and OPTIONAL are to be interpreted as described in RFC 2119.

- **Action.** One unit of work attributable to a principal: a chat turn, an agent invocation, a workflow step, a tool call, or a runtime action on a device.
- **Principal.** The party the action is attributed to; normally the human who asked for it.
- **Agent.** The AI agent definition (instructions, tools, configuration) that acted.
- **Effect.** Whether the action changed anything outside the runtime: `none`, `read` or `write`.
- **Side effect.** A tool invocation that changed state in a target system.
- **Policy verdict.** The decision of the runtime's policy layer for this action.
- **Approval.** A human decision permitting a specific proposed action. See the companion Action Approval Attestation specification.
- **Correlation.** The identifier that groups every record belonging to one action or run.
- **Digest.** A string of the form `sha256:` followed by 64 lowercase hexadecimal characters.
- **Canonical form.** The deterministic serialisation defined in section 8.

## 4. Design principles

1. **One record per action.** A record is a complete account of one action. Related records share a `correlationId`; a chain of records with the same correlation is a run.
2. **Digests, not payloads.** A record MUST NOT need to carry raw prompts, responses, arguments or sensitive data to be useful. It carries digests and references so that content can be checked when it is available and withheld when it must be.
3. **Terminal outcome.** A record describes an action that has finished. Status is always a terminal state.
4. **Open vocabularies.** Enumerations that will grow (`action.kind`, tools, targets, evaluators) are open. Registered values are listed here; extensions use an `x-` prefix or the `extensions` member.
5. **Tenant scoped.** Records belong to a tenant. A runtime MUST NOT expose one tenant's records to another.
6. **Verifiable after the fact.** A sealed record can be checked for integrity without the runtime that produced it.

## 5. The record

A record is a JSON object. Members marked R are REQUIRED at Level 1. Others are OPTIONAL unless a conformance level requires them (section 6).

### 5.1 Identity and time

| Member | Type | Description |
|---|---|---|
| `spec` (R) | string | MUST be `action-provenance/1.0`. |
| `id` (R) | string | Unique record identifier. UUID RECOMMENDED. |
| `correlationId` (R) | string | Groups every record of one action or run. |
| `recordedAt` (R) | timestamp | When the record was written. RFC 3339, UTC. |

### 5.2 Action

| Member | Type | Description |
|---|---|---|
| `action.kind` (R) | string | Registered: `chat_turn`, `agent_invocation`, `workflow_step`, `tool_call`, `agent_formation`, `subagent_spawn`, `runtime_action`. Extensions: `x-` prefix. |
| `action.at` (R) | timestamp | When the action occurred. |
| `action.effect` (R) | `none`, `read`, `write` | The strongest effect the action had on systems outside the runtime. |
| `action.description` | string | Human-readable summary. |

### 5.3 Who

| Member | Type | Description |
|---|---|---|
| `principal` (R) | party | The party the action is attributed to. |
| `principal.onBehalfOf` | party ref | Present when the principal acted for another party, for example an administrator impersonating a user or an agent acting for a human. |
| `agent` | object | `id` (R when present), `name`, `version`, `bundleDigest` (digest of the exact agent definition), `instructionsDigest` (digest of the resolved instructions). |

A **party** is `{ id, type, display?, tenant?, onBehalfOf? }` where `type` is `human`, `agent`, `service` or `system`.

### 5.4 Model

| Member | Type | Description |
|---|---|---|
| `model.requested` | string | The model asked for. |
| `model.resolved` (R) | string | The model that actually produced the output, or `none`. |
| `model.provider` (R) | string | Provider identifier, for example `azure-openai`, `openai`, `anthropic`, `google`, or `none`. |
| `model.mode` | string | Provider-specific mode or routing label. |

### 5.5 Context

`context` MAY carry `tenant`, `workspace`, `session`, `execution` and `step` identifiers. These are references, not payloads.

### 5.6 Policy

| Member | Type | Description |
|---|---|---|
| `policy.verdict` | `allow`, `allow_with_obligations`, `deny`, `escalate` | The runtime's decision for this action. |
| `policy.ref`, `policy.version` | string | The governing policy and its version. |
| `policy.obligations` | string[] | Conditions attached to an `allow_with_obligations` verdict. |
| `policy.evaluations` | array | Per-evaluator detail: `{ evaluator, decision, code?, confidence?, reasons? }`. |

### 5.7 Approval

| Member | Type | Description |
|---|---|---|
| `approval.required` | boolean | Whether the runtime required approval for this action. |
| `approval.decision` | `approved`, `rejected`, `auto`, `not_required`, `expired` | `auto` means a policy granted autonomy for this action; `policy.ref` MUST then be present. |
| `approval.approver` | party | Who decided. |
| `approval.at` | timestamp | When. |
| `approval.method` | string | `ui`, `api`, `delegated`, `policy`. |
| `approval.attestation` | string | The identifier or content digest of the Action Approval Attestation that authorised this action. |

### 5.8 Effects

`effects` is an array of tool invocations made during the action. Each entry:

| Member | Type | Description |
|---|---|---|
| `tool` (R) | string | Tool identifier, for example `outlook.send_email`. |
| `target` | string | The external system, for example `microsoft-outlook`. |
| `status` (R) | `succeeded`, `failed` | |
| `sideEffecting` (R) | boolean | Whether the invocation changed state in the target. |
| `argsDigest` | digest | Digest of the arguments. |
| `responseDigest` | digest | Digest of the response observed from the target. |
| `resultRef` | string | Reference to the created or changed object. |
| `approvedBy` | party | Who approved this specific side effect. |
| `compensated` | boolean | Whether a later action reversed this effect. |
| `error` | string | |

### 5.9 Work product, cost, outcome

- `workProduct` MAY carry `inputDigest`, `outputDigest`, `sources[]` and `artifacts[]`.
- `cost` MAY carry `inputTokens`, `outputTokens`, `estimatedUsd`, and MUST carry `attribution` (`exact`, `approximate`, `none`) when present, so a reader knows how reliably cost was tied to this action.
- `outcome.status` (R) is one of `succeeded`, `failed`, `blocked`, `denied`, `cancelled`, `timed_out`. `denied` means policy refused the action; `blocked` means the runtime refused it for another reason, for example a kill switch or a fail-closed condition. `outcome.error` is OPTIONAL.

### 5.10 Integrity and extensions

`integrity` is defined in section 9. `extensions` is an object keyed by reverse-DNS namespace (for example `ai.renly`) whose values are objects. Consumers MUST ignore extensions they do not understand.

## 6. Conformance levels

An implementation MAY claim one of three levels for the records it produces. Each level includes the one before it.

### Level 1: Attributable

Every record MUST contain the REQUIRED members in section 5 and MUST validate against the schema. The record answers: who, which agent, which model, what, and what happened.

### Level 2: Governed

In addition to Level 1:

1. Every record MUST carry `policy.verdict`.
2. Every action whose `effect` is `write`, or which contains a side-effecting entry in `effects`, and whose outcome is not `denied` or `blocked`, MUST carry `approval` with `required` equal to `true`.
3. If such an action `succeeded`, then either `approval.decision` is `approved` and `approval.approver` and `approval.at` are present, or `approval.decision` is `auto` and `policy.ref` is present.
4. A record whose `policy.verdict` is `deny` MUST NOT report a `succeeded` outcome for a write.
5. Every succeeded side-effecting entry in `effects` MUST carry `responseDigest` or `resultRef`.

The record now answers: on whose authority.

### Level 3: Verifiable

In addition to Level 2, every record MUST be sealed: `integrity.contentDigest` MUST be present and correct, and at least one of `integrity.mac` or `integrity.signature` MUST be present. Records SHOULD be chained per tenant (section 9.4). The record now answers: can this be trusted after the fact.

## 7. Correlation and runs

Records that share a `correlationId` form a run. Within a run, records SHOULD be ordered by `action.at`. A run MAY contain a `chat_turn` record, several `tool_call` records, and `subagent_spawn` records for delegated work. A consumer MUST NOT assume a run is complete unless it holds a record with a terminal outcome for the originating action.

## 8. Canonical form and digests

To compute any digest over a document, the document MUST first be serialised in canonical form:

1. Remove the `integrity` member if present.
2. Remove any member whose value is undefined.
3. Serialise as JSON with object members sorted by key in UTF-16 code unit order at every level, arrays in their original order, no whitespace, and numbers and strings serialised as by ECMAScript `JSON.stringify`.

For documents whose values are standard JSON types this produces the same bytes as RFC 8785 (JSON Canonicalization Scheme). Implementations MAY use an RFC 8785 library.

A digest is `sha256:` followed by the lowercase hexadecimal SHA-256 of the UTF-8 bytes of the canonical form.

## 9. Integrity

### 9.1 Content digest

`integrity.contentDigest` MUST equal the digest of the canonical form of the record with `integrity` removed.

### 9.2 Keyed MAC

`integrity.mac` is `{ alg, keyId, value }` with `alg` equal to `hmac-sha256`. `value` MUST be the base64url encoding (no padding) of HMAC-SHA256, keyed with the tenant's or runtime's evidence secret, over the UTF-8 bytes of the `contentDigest` string. A MAC proves that a record has not changed since it was sealed by a holder of the key. It does not by itself prove *which* holder sealed it, and it cannot be verified by a party who does not hold the key.

### 9.3 Signature

`integrity.signature` is `{ alg, keyId, value }` with an asymmetric algorithm such as `ed25519` or `es256`, over the same message as the MAC. A signature can be verified by any party holding the public key. Implementations that need third-party verification SHOULD add a signature; a MAC alone satisfies Level 3.

### 9.4 Chain

To make a tenant's history tamper-evident as a whole, records MAY be linked into a chain per `scope` (normally the tenant):

- `chain.seq` is a monotonic integer starting at 0 for the scope.
- `chain.prev` is the `contentDigest` of the record at `seq - 1`, or `null` at genesis.
- `chain.link` is a keyed proof over the string formed by `contentDigest`, a full stop, and `prev` or the literal `GENESIS` when `prev` is null.

A chain verifies when sequence numbers are contiguous, every `prev` equals the previous record's `contentDigest`, every link proof verifies, and every record verifies individually. A verifier MUST report the first failing sequence number.

### 9.5 What is not signed

`integrity.sealedAt` is informational and is excluded from every digest and proof, so that a held document re-verifies deterministically.

## 10. Privacy

A record is evidence of an action, not a copy of its content. Producers SHOULD prefer digests and references over raw values in `effects`, `workProduct` and `action.description`. Where a description is needed for a human reader, it SHOULD be minimised. A record MUST NOT be a vehicle for exfiltrating the content it describes.

## 11. Examples

- `examples/approved-write.json`: a human-approved email send, Level 2, sealable to Level 3.
- `examples/denied-write.json`: a bulk delete refused by policy before approval, Level 2.
- `examples/read-only.json`: a read-only chat turn, Level 2.

## 12. Relationship to other work

- **IETF Agent Action Capsule (SCITT).** Records what an agent executed with COSE signing and transparency receipts, and carries the permitting authority as an opaque reference. An APR can serve as the human-readable payload of a Capsule, and the Action Approval Attestation supplies the authority the Capsule leaves opaque. The two are complementary: the Capsule anchors, the APR explains.
- **W3C PROV and PROV-AGENT.** An APR maps to PROV-DM as follows: the action is an `Activity`; the principal and agent are `Agent`s, with `actedOnBehalfOf` for `onBehalfOf`; inputs and outputs are `Entity`s identified by digest; `used` and `wasGeneratedBy` follow from `workProduct`; `wasAssociatedWith` links the activity to its agents. Approval and policy verdict have no native PROV counterpart and are carried as attributes.
- **OpenTelemetry GenAI semantic conventions.** `model.provider` corresponds to `gen_ai.provider.name` (which supersedes `gen_ai.system`); `model.requested` and `model.resolved` to `gen_ai.request.model` and `gen_ai.response.model`; `cost.inputTokens` and `cost.outputTokens` to `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`. A trace tells you what a system did in time; an APR tells you what an organisation is accountable for.
- **C2PA.** Content provenance authenticates artefacts. Action provenance accounts for behaviour. The two answer different questions and can coexist: a C2PA manifest for a generated image, and an APR for the action that generated it.

## 13. Extensions and registry

Registered values for `action.kind`, `outcome.status`, `policy.verdict` and `approval.decision` are those listed in this document. Proposals to register additional values are made as issues in the specification repository. Vendors MAY use `x-` values and the `extensions` member without registration.

## 14. Security considerations

- A record's MAC proves integrity, not origin, to anyone outside the key holder. Use signatures where third parties must verify.
- Evidence secrets MUST be dedicated to evidence signing and MUST NOT be shared with other subsystems. Rotate keys by `keyId`; keep old keys for verification only.
- A chain proves that no record was removed or reordered within a scope. It does not prove that every action was recorded. Runtimes that claim Level 3 SHOULD document how recording is enforced, for example by refusing to execute side effects when evidence cannot be sealed.
- Producers MUST NOT let a client supply `integrity`; it is always computed by the sealing party.

## 15. Conformance statement for Renly

Renly's runtime produces an evidence record for every AI action on all plans and implements this specification at **Level 3**: every record carries a policy verdict, approval gates on side-effecting actions, a content digest, an HMAC-SHA256 MAC under a dedicated evidence key, and per-tenant chaining with sequence numbers and previous-hash links verified against frozen snapshots. Renly uses keyed MACs; asymmetric signatures are supported by this specification and are not currently produced. Fail-closed semantic policy evaluation is an Enterprise plan capability.

## 16. Versioning

The `spec` member carries the version a record conforms to. Consumers MUST reject records whose `spec` they do not recognise. A minor version adds OPTIONAL members only. A major version may change REQUIRED members.
