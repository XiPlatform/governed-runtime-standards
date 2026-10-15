# Security policy

The Governed Runtime Standards define documents whose purpose is to be trusted as evidence. A weakness in a specification can matter as much as a bug in code, so both are in scope.

## Reporting a vulnerability

Please report suspected vulnerabilities privately by email to **security@renly.ai**, with "governed-runtime-standards" in the subject line. Do not open a public issue, pull request or discussion for a suspected vulnerability.

Please include:

- which specification, schema, file or function is affected, and the version or commit;
- a description of the issue and its impact, for example a way to make a modified record verify, to execute a proposal that a grant does not cover, or to make a non-conforming document validate at a higher level;
- steps or a minimal example to reproduce it;
- whether you intend to publish your findings, and on what timeline.

## What happens next

We aim to acknowledge a report within five business days, to keep you informed while we investigate, and to agree a disclosure date with you. We normally ask that details are not published for up to 90 days, or until a correction is released, whichever is sooner.

Corrections are released as follows:

- **Specifications and schemas:** an erratum to the current version, recorded in the specification's change history and in [CHANGELOG.md](CHANGELOG.md). Where implementers need to act, the erratum says so.
- **Reference implementation:** a patch release, recorded in [CHANGELOG.md](CHANGELOG.md).

Reporters are credited in the changelog unless they prefer not to be.

## Scope

In scope:

- the specifications and JSON Schemas in this repository, including the canonical form, the integrity proofs, the chain construction and the coverage algorithm;
- the reference implementation in [`src/`](src);
- the test vectors and examples, where they would lead an implementation to accept something it should reject.

Out of scope:

- the published test keys in [`test-vectors/`](test-vectors), which are public by design;
- vulnerabilities in products that implement these standards, including Renly's own products. Report those to the product's vendor; for Renly, the contact is published at https://renly.ai/.well-known/security.txt.

## Supported versions

| Component | Supported |
|---|---|
| Specifications, version 1.0 | Yes |
| Reference implementation, 1.x | Yes |
