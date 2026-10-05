# Implementation Practices

- Before changing code, verify the relevant best practices against the existing architecture and supported framework or library APIs.
- Solve problems through the appropriate architectural boundary and supported APIs. Never use hacks or workarounds for problems that should be solved with established best practices.
- During review, verify that the implementation follows those practices and addresses the underlying behavior, including all affected entry points.

## Verification

Use affected native runners during development and retain unaffected results under the
[test maintenance policy](CONTRIBUTING.md#test-maintenance). Reserve the full candidate gate
for final integration; a new commit alone does not invalidate independent evidence.

## Release and Demo publication

- For every release request, execute the [Release SOP](CONTRIBUTING.md#release-sop), including source/history and content review, exact-source checks and review fixes.
- Obtain exact-source push approval before GitHub CI; tag, Release, npm and Pages approval are separate. Tests verifies and seals one candidate on `master`; Publish and Demo require its run ID and reuse its exact files under [candidate verification](CONTRIBUTING.md#automated-release-checks).
- Keep source checks before the core and icon `pnpm pack` steps; their prepack hooks build each package once. Preserve the development-browser and production `/Chonky/` checks. Consumers verify candidate identity and checksums without rebuilding, retesting or choosing replacement source.
- Dispatch Publish only at the approved version tag and Demo at the approved commit's ref. Protect the `npm` and `github-pages` environments with required reviewers. Candidate creation or source-push approval does not authorize publication or deployment.
- Preserve published history and versions. The SOP's local backup and squash procedure applies only to unpublished work; do not publish backup refs.
