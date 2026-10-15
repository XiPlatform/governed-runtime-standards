# Governance

This document describes how the Governed Runtime Standards are maintained: who decides, how changes are made, what each version guarantees, and how the standards would move to a neutral home.

## Scope

This governance covers the contents of this repository:

- the specifications in [`specs/`](specs): the Action Provenance Record, the Action Approval Attestation and the Governed Runtime Profile;
- the JSON Schemas in [`schema/`](schema), which are normative parts of their specifications;
- the reference implementation in [`src/`](src), the test suite, the test vectors and the examples;
- the conformance directory in [`conformance/`](conformance), which is informative.

The standards are published under the Apache License 2.0 by Renly (XiPlatform Pty Ltd, Australia), which is also implementing them in its own agent runtime. The process below is designed so that this relationship is visible and does not decide outcomes on its own.

## Roles

- **Editors** are responsible for the text of the specifications and the schemas. They triage issues, decide on errata, clarifications and proposals, and publish revisions. The current editor is Saif Ehsan (Renly).
- **Maintainers** are responsible for the reference implementation, the test suite, the test vectors, continuous integration and the repository. The current maintainer is Renly (XiPlatform Pty Ltd).
- **Contributors** are anyone who opens an issue, comments, or submits a pull request.
- **Implementers** are organisations or individuals who implement one or more of the specifications, and may submit an implementation report (see [`conformance/`](conformance)).

New editors and maintainers are appointed by the existing editors, with preference for people with implementation experience from organisations other than the publisher. Appointments are recorded in this file.

## Decision process

1. **Issue first.** Every change to normative text, a schema or an expected test-vector value starts as an issue, so that the reasoning is recorded before the change. Issues are typed as a clarification, an erratum or a proposal (see [CONTRIBUTING.md](CONTRIBUTING.md)).
2. **Comment period.** Before a normative change is merged, the issue stays open for comment for at least 14 days for an erratum or clarification, and at least 30 days for a proposal accepted into a new version. Editorial changes that do not alter meaning, such as typographical fixes, need no comment period.
3. **Decision.** The editors decide by consensus, taking into account the comments received and the experience of implementers. The decision and its rationale are recorded in the issue. Disagreements that remain are recorded alongside the decision.
4. **Interest.** Where a decision affects whether the publisher's own implementation conforms, the issue says so.
5. **Reconsideration.** Anyone may ask for a decision to be reconsidered by opening a new issue that references it and gives new information.

## Versioning and stability policy

Each specification has an identifier of the form `name/MAJOR.MINOR`, for example `action-provenance/1.0`, carried in the `spec` member of every document. A specification and its schema are versioned together.

### What version 1.0 freezes

For each specification, version 1.0 fixes:

- the members, their types, and which members are REQUIRED;
- the registered values of each enumeration and open vocabulary;
- the canonical form, the digest algorithm, the MAC construction and the chain construction;
- the coverage algorithm of the Action Approval Attestation;
- the conformance levels and the requirements of each level, and the twelve guarantees of the Governed Runtime Profile.

### Errata and clarifications

An **erratum** corrects text that contradicts itself, the schema, another specification, or its evident intent. A **clarification** resolves an ambiguity without changing which documents or runtimes conform under the reading the editors consider intended. Both are applied to the current version, do not change its identifier, and are listed in the specification's change history and in [CHANGELOG.md](CHANGELOG.md), each with an identifier such as `APR-1.0-E1`.

An erratum that would make a previously conforming document or runtime non-conforming is made only when the text was clearly in error, for example when it permitted something its own schema forbids, and the change history says so.

### Minor versions

A minor version (for example 1.1) adds OPTIONAL members only, as section 9 of the Action Provenance Record states; the same policy applies to all three specifications. It does not remove or rename members, change which members are REQUIRED, change the requirements of an existing conformance level, or change the canonical form or any proof. New registered values for open vocabularies, and registered signature algorithms, are expected to be introduced in minor versions. A document declares the version it conforms to, and consumers reject identifiers they do not recognise, so a consumer that understands only 1.0 does not misread a 1.1 document.

### Major versions

A major version (for example 2.0) may change REQUIRED members, remove deprecated members or values, or change algorithms. Major versions are expected to be rare, and a previous major version remains published and usable.

### Deprecation

A member, value or feature is deprecated in a minor version, with a note in the specification explaining what replaces it. Deprecated items remain valid until the next major version, and documents that use them remain conforming to the version they declare.

### Schemas and identifiers

The schema for a version is published at a stable URL (for example `https://renly.ai/spec/action-provenance/1.0/schema.json`) and changes only through an erratum recorded in the change history.

### Reference implementation

The reference implementation follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Its major version tracks the major version of the specifications. Where the reference implementation or the test vectors disagree with the specification text, the text prevails and the disagreement is handled as an erratum in one or the other.

## Conformance claims

Implementations may claim conformance at Level 1, 2 or 3 as defined in each specification. Claims are self-declared; the maintainers do not certify, test or endorse them. The test suite and the test vectors are the reference for how the structural rules are applied, and the Governed Runtime Profile describes how a reviewer tests a runtime claim. The publisher's own implementation status is kept in [`conformance/`](conformance) with any other, and any conformance report it publishes is held to the same format and rules.

## Licensing and contributions

The specifications, schemas, reference implementation, test vectors and examples are licensed under the [Apache License 2.0](LICENSE). Contributions are accepted under the same licence, including its patent licence (sections 3 and 5 of the licence), as described in [CONTRIBUTING.md](CONTRIBUTING.md). No contributor licence agreement is required.

## Moving to a neutral home

The publisher intends to move the standards to a neutral home once they have independent adoption, for example when at least two implementers unrelated to the publisher have submitted implementation reports, or when implementers ask for it.

The move would work as follows:

1. The editors open an issue proposing the move, the candidate venue and the reasons, and invite comment from implementers and contributors for at least 60 days.
2. Candidate venues are open foundations or standards bodies with a public process and an intellectual property policy compatible with the Apache License 2.0, for example a working group or community group of an established standards organisation, or a project hosted by an open source foundation.
3. On agreement, the repository, the specification names and the editorial role transfer to the venue under its process. Existing identifiers such as `action-provenance/1.0` keep their meaning, and the publisher intends to keep the published schema URLs resolving, by redirect if necessary.
4. The decision is recorded in this file.

## Code of conduct and security

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Security issues are reported privately as described in [SECURITY.md](SECURITY.md).

## Changes to this document

Changes to this governance document follow the decision process above, with a comment period of at least 14 days.
