# Implementation status: Renly

| | |
|---|---|
| Implementation | Renly, a governed runtime for AI agents |
| Implementer | Renly (XiPlatform Pty Ltd, Australia) |
| Relationship to the maintainers | Renly publishes and maintains the Governed Runtime Standards. |
| Status | Implementing all three specifications. No conformance level is claimed. |
| Date | 2026-10-15 |
| Contact | https://renly.ai/contact |

## Status

The Governed Runtime Standards grew out of Renly's work on evidence records and human approval for actions taken by AI agents. Renly is implementing the three specifications in its runtime: the Action Provenance Record for every action, the Action Approval Attestation for every approval, and the guarantees of the Governed Runtime Profile.

Renly does not claim conformance to any of the three specifications at any level. This status replaces the conformance statements published alongside version 1.0 of the specifications on 2026-09-03.

## Conformance report

Renly will publish a conformance report in this directory, in the format described in [conformance/README.md](../README.md), when it meets a level of a specification for every tenant and every agent, as section 4.2 of the [Governed Runtime Profile](../../specs/governed-runtime-profile.md) requires.

The report will name the specification and level of each claim, state any limitation, and include the evidence a reviewer needs to test it: exported records and attestations that validate and verify with the reference implementation and the [test vectors](../../test-vectors), and access to a test tenant for the conformance review procedure in section 5 of the profile.
