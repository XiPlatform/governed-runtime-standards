# Changelog

All notable changes to the Governed Runtime Standards and the reference implementation are recorded in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). The reference implementation follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Specification identifiers such as `action-provenance/1.0` are versioned separately, as described in [GOVERNANCE.md](GOVERNANCE.md): errata and clarifications do not change them. Each specification also lists its own changes in its change history (Appendix A).

## [Unreleased]

No changes yet.

## [1.0.0] - 2026-10-15

Version 1.0 of the three specifications was first published on 2026-09-03. This release carries version 1.0 of each specification with the errata and clarifications listed below, together with the reference implementation, test vectors, and project governance. No member, enumeration, coverage rule, guarantee or conformance level was added, removed or renamed.

### Specifications

- **Action Provenance Record 1.0** (`action-provenance/1.0`): specification, JSON Schema 2020-12, three conformance levels (attributable, governed, verifiable), canonical form, content digest, HMAC-SHA256 MAC, optional signature, and per-scope chains.
- **Action Approval Attestation 1.0** (`action-approval/1.0`): specification, JSON Schema 2020-12, single, session and standing scopes, the coverage algorithm, and three conformance levels (bound, scoped, verifiable).
- **Governed Runtime Profile 1.0** (`governed-runtime/1.0`): twelve guarantees, three conformance levels, the conformance statement format, and the conformance review procedure.

### Added

- Reference implementation `governed-runtime` 1.0.0 (TypeScript, ESM, Node.js 18 or later, no runtime dependencies): validation with level reporting, canonicalisation, digests, MAC sealing and verification, per-scope chains, and approval coverage.
- Test vectors in `test-vectors/` for canonical serialisation, content digests, MACs under a published test key, chains, approval coverage and conformance levels, with a generator script and a test suite that checks the reference implementation against them.
- Schema tests that validate every example and every test-vector document against the JSON Schemas.
- `conformance/`: how implementations self-declare conformance, the implementation report format, how to submit a report, and the publisher's implementation status.
- In each specification: Status of This Document, conformance classes, how to claim conformance, Security Considerations, Privacy Considerations, references split into normative and informative, and a change history.
- Project documents: governance and stability policy, contribution guide, security policy, code of conduct, citation metadata, issue templates for clarifications, errata, proposals and implementation reports, a pull request template, and continuous integration on Node.js 18, 20 and 22.

### Changed

- The specifications are restructured into a conventional standards layout and renumbered. Each specification's change history maps the old section numbers to the new ones.
- Implementation statements are no longer part of the specifications. The sections previously titled "Conformance statement for Renly" are removed, and those statements are withdrawn. Renly's implementation status is in `conformance/implementations/renly.md`: Renly is implementing the standards and claims no conformance level.
- The Governed Runtime Profile's audit procedure is renamed "Conformance review procedure" and states its scope, prerequisites and expected effort. Its steps are unchanged.
- Examples use a neutral evaluator name (`semantic`) and a neutral extension namespace (`com.example`).
- The JSON Schema for the Action Provenance Record uses `com.example` as the example namespace in the description of `extensions`. The description is not used in validation.

### Fixed

Errata and clarifications to version 1.0 of the specifications. Each is described in the change history of its specification.

- `APR-1.0-C1`, `AAA-1.0-C1`, `GRP-1.0-C1`: BCP 14 is cited as RFC 2119 together with RFC 8174, so the key words are normative only in capitals.
- `APR-1.0-C2`: `action.kind` MUST be a registered value or begin with `x-`, stating the open-vocabulary rule as a requirement, as the reference implementation already applied it.
- `APR-1.0-C3`, `AAA-1.0-C2`: removing the `integrity` member before digesting applies to records and attestations only; other content, such as tool arguments for `argsDigest`, keeps every member.
- `APR-1.0-C4`: the HMAC key is an octet string, and a textual evidence secret is used as its UTF-8 encoding.
- `APR-1.0-C5`: how a chain link proof is computed, and that a contiguous segment of a chain can be verified.
- `APR-1.0-E1`, `AAA-1.0-E2`: the Agent Action Capsule is correctly identified as an individual Internet-Draft; the SCITT architecture is cited as RFC 9943; the OpenTelemetry generative AI conventions are cited at their current location.
- `AAA-1.0-E1`: the delegation guidance suggested `approver.onBehalfOf`, which the attestation schema does not permit; the delegating party is recorded in `extensions`.
- `GRP-1.0-E1`: GR-4 and GR-9 used "MAY" in negative sentences; both are restated with "MUST NOT", with the same meaning.
- `GRP-1.0-C3`: the relationship to the Australian Government's Policy for the responsible use of AI in government is updated to version 2.0 of that policy.

Reference implementation:

- `validate` and `validateAttestation` now recompute the content digest at Level 3. Level 3 requires the content digest to be present and correct; previously only its format was checked, so a document changed after sealing could be reported at Level 3. `verify` and `verifyAttestation` were not affected.
- The test toolchain is pinned to Vite 6 so that the test suite runs on Node.js 18.

