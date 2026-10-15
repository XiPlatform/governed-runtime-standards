# Contributing

Thank you for your interest in the Governed Runtime Standards. Comments from implementers, reviewers and users are what improve a specification, and objections are as welcome as contributions.

This document describes how to raise an issue, how changes are made, the style used in the specifications, how to run the checks, and the terms under which contributions are made. Decisions are made as described in [GOVERNANCE.md](GOVERNANCE.md). Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Issue types

Open an issue using the template that matches what you want to raise:

| Type | Use it when | Possible outcome |
|---|---|---|
| **Clarification** | The text is ambiguous, or you are unsure how a rule applies to a case. | An answer in the issue, and where the text could be clearer, a clarification to the current version. |
| **Erratum** | The text contradicts itself, a schema, another specification, the test vectors or the reference implementation, or cites something incorrectly. | A correction to the current version, recorded in the change history and the changelog. |
| **Proposal** | You want a new member, value, feature or guarantee, or a change that the current version cannot accept. | Consideration for a future minor or major version. |
| **Implementation report** | You implement a specification and want to declare the level you conform at. | A report in [`conformance/implementations/`](conformance/implementations), usually by pull request. |

For a bug in the reference implementation that is not a question about the specification, open an issue without a template and include a minimal example.

Do not report security vulnerabilities in public issues; follow [SECURITY.md](SECURITY.md).

## Process

1. **Open an issue first** for any change to normative text, a schema, the coverage algorithm, or an expected value in the test vectors. Editorial fixes (typographical errors, broken links, formatting) can go straight to a pull request.
2. **Discuss.** The editors label the issue, and it stays open for comment for the period set in [GOVERNANCE.md](GOVERNANCE.md).
3. **Pull request.** Reference the issue. A change to a specification includes, where applicable:
   - the change to the specification text and to its schema;
   - an entry in the specification's change history (Appendix A) and in [CHANGELOG.md](CHANGELOG.md);
   - a test in [`test/`](test), and a worked example or a test vector for any change to a schema or a normative rule.
4. **Review and merge.** The editors review and merge, and record the decision in the issue.

## Specification style

- Use the BCP 14 key words (MUST, SHOULD, MAY and the others) only for requirements, in capitals, and phrase each requirement so that it can be tested. Avoid the same words in lower case where they could be mistaken for requirements.
- Prefer one requirement per sentence, stated positively where possible ("MUST NOT execute unless").
- Use Australian English spelling, as the existing text does: organisation, serialise, behaviour, licence (noun).
- Write member names, values and identifiers in code format: `approval.decision`, `auto`, `action-provenance/1.0`.
- Use neutral, precise language. Specifications describe behaviour; they do not describe products or make comparative claims.
- Use example domains (`example.com`, `example.net`, `northwind.example`) and fictional people and organisations in examples. Never include real personal information, credentials or keys.
- Cite other work with a reference key, such as [RFC8785], and add it to the normative or informative references.

## Reference implementation

- Keep the library free of runtime dependencies. Development dependencies are acceptable when they are needed for tests or tooling.
- Keep the public API backwards compatible within a major version.
- Support Node.js 18 and later.
- Run the checks before opening a pull request:

  ```bash
  npm ci
  npm run typecheck
  npm test
  ```

- If a change is meant to alter an output in [`test-vectors/`](test-vectors), regenerate the vectors with `npm run test-vectors`, explain the change in the pull request, and link the issue that agreed it. A change to an expected normative value is a change to the specification, not only to the code.

## Licensing of contributions

This project is licensed under the [Apache License 2.0](LICENSE). By submitting a contribution, you agree that it is licensed under the Apache License 2.0, as set out in section 5 of the licence, including the patent licence in section 3.

Please also sign off each commit to certify the [Developer Certificate of Origin 1.1](https://developercertificate.org/), which states that you have the right to submit the contribution under the project's licence:

```bash
git commit -s -m "Clarify the coverage rule for session grants"
```

This adds a `Signed-off-by` line with your name and email address to the commit message.
