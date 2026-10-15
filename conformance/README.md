# Conformance and implementation reports

This directory collects implementation reports: statements by implementers of the level at which their software conforms to each Governed Runtime Standard. It is informative. Nothing in this directory is part of a specification, and the specifications do not depend on it.

## What a conformance claim is

Each specification defines three cumulative conformance levels:

| Level | [Action Provenance Record](../specs/action-provenance.md) | [Action Approval Attestation](../specs/action-approval.md) | [Governed Runtime Profile](../specs/governed-runtime-profile.md) |
|---|---|---|---|
| 1 | Attributable | Bound | Attributable runtime |
| 2 | Governed | Scoped | Governed runtime |
| 3 | Verifiable | Verifiable | Verifiable runtime |

Conformance is self-declared. There is no certification programme, and the maintainers do not test, endorse or vouch for any claim. Listing an implementation here records that its implementer has made a claim in the format below; it does not mean the claim has been checked.

A claim is made per specification and names the specification identifier and the level, for example `action-provenance/1.0 Level 3`. A claim at a level asserts every requirement of that level and of the levels below it. Where a requirement holds only for some editions, plans or configurations of a product, the claim states the limitation; for the Governed Runtime Profile this is a requirement of the specification (section 4.2).

## How to test a claim

A claim can be tested without the implementer's cooperation for document formats, and with access to a test tenant for runtime guarantees:

- **Records and attestations.** Validate exported documents against the JSON Schemas in [`schema/`](../schema) and check them with the reference implementation (`validate`, `validateAttestation`, `verify`, `verifyAttestation`, `verifyChain`). Verifying a keyed MAC requires the sealing key, so the implementer has to provide either a verification service or a key for a test tenant.
- **Implementations of the algorithms.** Run the [test vectors](../test-vectors) against the implementation's canonical serialisation, digests, MACs, chain verification, coverage evaluation and level reporting.
- **Runtime guarantees.** Follow the conformance review procedure in section 5 of the [Governed Runtime Profile](../specs/governed-runtime-profile.md), and review the evidence listed for each guarantee in its section 3.

## Implementation report format

An implementation report is a Markdown file in [`implementations/`](implementations), named after the implementation (lowercase, hyphenated). It contains:

1. **Implementation.** Product or library name, version or release train, and the implementer's legal name and country.
2. **Relationship to the maintainers.** Whether the implementer maintains, edits or contributes to these standards.
3. **Claims.** A table with one row per specification: identifier, level claimed, and any limitation by edition, plan or configuration.
4. **Per-specification notes.** For each specification, how the implementation meets the level, and which OPTIONAL features it does not implement (for example asymmetric signatures).
5. **Recording enforcement.** For Action Provenance Record Level 3 claims, how the runtime ensures every action is recorded, as recommended in the specification's security considerations.
6. **Governed Runtime Profile statement.** For runtimes, the conformance statement in the JSON form defined in section 4.3 of the profile.
7. **Evidence and contact.** Where a reviewer can obtain evidence (trust centre, documentation, test tenant), and a contact for questions about the report.
8. **Date.** The date the claims were stated. A report is updated, with a new date, when the implementation or its claims change.

An implementer that is implementing a specification but does not yet claim a level can record an implementation status in the same place. A status names the implementation and the specifications being implemented, and claims no level.

A template for a report:

````markdown
# Implementation report: <Implementation name>

| | |
|---|---|
| Implementation | <name and version> |
| Implementer | <legal name, country> |
| Relationship to the maintainers | <none / contributor / maintainer> |
| Claims stated | <YYYY-MM-DD> |
| Contact | <URL or address> |

## Claims

| Specification | Level | Limitations |
|---|---|---|
| `action-provenance/1.0` | <1, 2 or 3> | <none, or the limitation> |
| `action-approval/1.0` | <1, 2 or 3> | <none, or the limitation> |
| `governed-runtime/1.0` | <1, 2 or 3> | <none, or the limitation> |

## Action Provenance Record
<how the level is met; OPTIONAL features not implemented; how recording is enforced>

## Action Approval Attestation
<how the level is met>

## Governed Runtime Profile
<how each guarantee is met, and any limitation>

```json
{ "spec": "governed-runtime/1.0", "runtime": { "name": "...", "version": "...", "vendor": "..." }, "level": 3,
  "guarantees": { "GR-1": "yes", "...": "..." },
  "records": { "provenance": "action-provenance/1.0 Level 3", "approval": "action-approval/1.0 Level 3" },
  "statedAt": "YYYY-MM-DD", "evidence": "https://..." }
```

## Evidence
<where a reviewer can obtain evidence>
````

## Submitting or updating a report

1. Open a pull request that adds or changes `conformance/implementations/<name>.md` and adds a row to the table below. If you prefer to discuss a report first, open an issue with the *Implementation report* template.
2. The pull request is reviewed for format and completeness only: that each claim names a specification identifier and a level, that limitations are stated, and that the report follows the structure above. The maintainers do not assess whether the claims are true.
3. By submitting a report you confirm that you are authorised to make the claims on the implementer's behalf and that they are accurate on the stated date.
4. A report can be withdrawn by its implementer at any time. The maintainers may remove a report that its implementer no longer maintains, or that is shown in a public issue to be materially inaccurate and is not corrected.

## Implementations

| Implementation | Implementer | Action Provenance Record | Action Approval Attestation | Governed Runtime Profile | Report |
|---|---|---|---|---|---|
| Renly | Renly (XiPlatform Pty Ltd, Australia), maintainer of these standards | Implementing; no level claimed | Implementing; no level claimed | Implementing; no level claimed | [Implementation status](implementations/renly.md) |

The reference implementation in [`src/`](../src) is a library, not a runtime. It produces and checks documents at every level of the two document specifications, using keyed MACs; it makes no Governed Runtime Profile claim.
