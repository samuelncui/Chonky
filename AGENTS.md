# Implementation Practices

- Before changing code, verify the relevant best practices against the existing architecture and supported framework or library APIs.
- Solve problems through the appropriate architectural boundary and supported APIs. Never use hacks or workarounds for problems that should be solved with established best practices.
- During review, verify that the implementation follows those practices and addresses the underlying behavior, including all affected entry points.

## Release and Demo publication

- For every release request, execute the [Release SOP](CONTRIBUTING.md#release-sop), including source/history and content review, exact-source checks and review fixes.
- Obtain exact-source push approval before GitHub CI; tag, Release and npm publication approval is separate. A push to `master` also triggers Pages and needs approval before the push for the exact source and Demo under [Demo deployment](CONTRIBUTING.md#demo-deployment).
- Preserve published history and versions. The SOP's local backup and squash procedure applies only to unpublished work; do not publish backup refs.
