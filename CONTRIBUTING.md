# Contributing to Chonky

## Development setup

Use Node.js 24 and Corepack. The repository pins pnpm in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm candidate
```

During development, run the main package build in watch mode:

```bash
pnpm --filter @samuelncui/chonky dev
```

The browser tests run against the demo application in
`packages/chonky/example`. `pnpm check` checks formatting, lint, unit tests and
source/test types without building. Both the icon and example source typechecks
read source exports; the icon declaration build checks the core's built public declarations.

`pnpm candidate` runs those checks, then `pnpm pack:candidate` packs the core
before the icon package. Each prepack hook builds its package once. It then runs
`pnpm e2e` against the built public exports on the development server and
`pnpm e2e:pages` against the production `/Chonky/` build, including navigation,
reloads and assets. Tarballs are fresh outputs in `output/candidate/packages/`.
`pnpm build` remains available for development without packing.

The Tests workflow runs this candidate gate once for pull requests and trusted
`master` runs. Only trusted `master` push/manual runs can seal a reusable artifact
after the source and artifact content scans. During iteration, use the affected
native checks and retain unaffected evidence; do not repeat full gates for the
same unchanged inputs.

## Test maintenance

During development, run affected Vitest files, Node tool tests and type checks; add browser checks
when their boundary changes. Diagnose failures and rerun only the failed boundary and affected
callers after the final relevant edit. Batch related edits before expensive runs. Finish review
before one final `pnpm candidate` gate, normally in Tests CI; do not duplicate unchanged full runs
locally and in CI. A new commit alone does not invalidate independent results: review relevant
source, dependencies, configuration, fixtures and environment before reusing them. Unknown impact
requires broader checks. Native output and a concise command/result summary suffice for routine
checks; releases and performance comparisons retain their existing evidence formats.

For workflow edits, validate GitHub syntax and expression contexts before pushing with
`go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 -shellcheck= -pyflakes=`.
Existing shell checks own script diagnostics; this check does not rebuild packages.

Maintain tests and safe fixtures with their implementation, using the existing runners. Remove
obsolete assertions and same-boundary duplicates, and preserve the distinct boundaries below.
Reusable scripts stay in the repository; supply private hosts, paths and inputs through parameters.
Keep credentials and sensitive reports outside tracked source and public artifacts. Automated
checks do not grant source-push, Demo or publication permission or replace required visual review.

Measure baseline and candidate serially on the same idle host, with the same runtime/browser,
fixtures and native runner settings. Use one benchmark invocation per source and the runner's
calibration; investigate anomalies before repeating affected measurements. Do not add a fixed
sample quota, repeat unchanged comparisons or silently replace the accepted baseline.

## Test boundaries

Tests in `packages/chonky/test/` use jsdom. They cover state transitions,
action payloads and component integration; their virtualizer and DnD mocks do
not verify browser layout or native drag events. The Playwright tests consume
the built public exports through all four examples with real virtualization,
layout, keyboard events and drag-and-drop.

| Behavior                                                                             | Unit/component tests                                       | Browser tests                                                                        |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Browser composition, toolbar, filtering, selection and reveal guards                 | `component-hierarchy.test.tsx`, `file-list.test.tsx`       | `file-browser.spec.ts`, `showcase.spec.ts`                                           |
| Built-in/custom sorting, Strict Mode and modification dates                          | `sorting.test.tsx`, `library-regressions.test.tsx`         | `file-browser.spec.ts`, `presentation.spec.ts`                                       |
| Registered action overrides, handler/effect failures and keyboard opening            | `action-dispatch.test.tsx`, `library-regressions.test.tsx` | `file-browser.spec.ts`                                                               |
| Drag permissions and move payloads                                                   | `dnd.test.tsx`                                             | `file-browser.spec.ts`                                                               |
| Full grouping, selection scope, actions, collapse and reveal                         | `grouping.test.tsx`, `library-regressions.test.tsx`        | `grouping.spec.ts`                                                                   |
| Sparse ranges, placeholders, loaded selection and action membership                  | `sparse-grouping.test.tsx`                                 | `sparse-grouping.spec.ts`                                                            |
| Status accessibility, details, breadcrumbs, footer, loading and caller-loaded groups | `presentation.test.tsx`, `library-regressions.test.tsx`    | `presentation.spec.ts`, `grouping.spec.ts`                                           |
| Thumbnail refresh/cancellation and exported file-map navigation/moves/reset          | `library-regressions.test.tsx`, `file-map.test.ts`         | `file-browser.spec.ts` (async enable/disable/reset and ordinary folder interactions) |

Unit filenames above are relative to `packages/chonky/test/`; browser filenames
are relative to `e2e/`. Assertions at these different boundaries are intentional:
a correct selection reducer does not prove that a browser click reaches it, and
a virtualizer mock cannot prove that an offscreen file becomes visible.
`pnpm e2e:pages` deliberately replays the same suite against the production
build under `/Chonky/` to verify asset paths, navigation and reloads.

For focused checks, run `pnpm --filter @samuelncui/chonky exec vitest run test/<file>`
or, after `pnpm build`, `pnpm exec playwright test e2e/<file>`.
`integration-boundaries.test.tsx` covers all three host Redux hooks in caller
slots, two independent browser stores, native selection semantics and thumbnail
URLs. `selection-regressions.test.ts` covers sparse anchors, prototype-named IDs
and the sparse selector's bypass of ordinary sorting. `style-composition.test.tsx`
reproduces disabled breadcrumb precedence across themes. Browser checks exercise
native keyboard context menus, checkbox shortcuts, quoted-URL image loading,
wrapped Grid preview and checkbox bounds on desktop and mobile,
bounded sparse rendered rows, and stable style-rule counts after repeated theme
switches and remounts.

Browser acceptance currently covers Chromium only. Global defaults, custom
formatters and cross-browser DnD have no dedicated regression tests; the examples use per-browser props and the default formatting.

## Release SOP

Run this procedure for each new release. Published commits, tags and npm versions stay intact;
later local improvements belong to a subsequent release.

1. **Review behavior and consumers.** Compare the final source with the public baseline. Review
   exported APIs, terminology, package documentation, the [examples](packages/chonky/example),
   and [test boundaries](#test-boundaries). Keep the Demo representative of current supported
   behavior, including grouping, sparse paging and presentation. Inspect packages, helpers, tests
   and temporary files for runtime, build, test or Demo consumers before removing dead code.
   Resolve unintended capability removals and stale or duplicated instructions.
2. **Audit public content and history.** Review tracked source, documentation, licenses, dependency
   metadata and Demo fixtures for credentials, private services, personal paths and real user data.
   Use [Gitleaks 8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)
   with [rules from the same tag](https://github.com/gitleaks/gitleaks/blob/v8.30.1/config/gitleaks.toml).
   Verify the tool and rule-file checksums against fixed expected values before use; pin and
   checksum-verify any project overrides too. Do not use an unpinned latest version or rules.
   Use a complete Git history checkout for scanning plus manual review, including all history
   reachable from the proposed release and unpublished intermediate commits and messages before
   squashing. Record scanner/rules, inspected ranges and coverage gaps. Keep raw scanner reports
   private and share only redacted summaries. Findings in already published history need a separate
   remediation decision, not a history rewrite. The approved historical findings are recorded in
   [.gitleaksignore](.gitleaksignore) as exact full `commit:file:rule:line` fingerprints. Pass that file
   only to the Git history scan; use an explicitly empty ignore file for current source and npm/Demo
   artifact scans. Never exempt a whole commit, file or rule. Adding an exception needs approval
   for the specific published finding; the same file and rule in new commits remain fully scanned.
3. **Prepare clean exact inputs.** Recheck `origin/master` against the current public tip. Preserve
   unpublished commits and working changes in a recoverable local backup before squashing only
   the reviewed unpublished range into a release commit whose parent is that rechecked tip.
   With no unpublished range, do not squash; never publish backup refs or rewrite published history.
   Reconcile and review again if the tip moves. Freeze a clean exact commit and matching package
   versions. Use an isolated checkout and the frozen lockfile from [development setup](#development-setup);
   do not use ignored local output as package or Demo input.
4. **Finish review, then run the final gate.** Review and fix with affected local checks until no
   unresolved, unaccepted finding remains, following [test maintenance](#test-maintenance).
   The Tests workflow runs `pnpm candidate` and the [automated release checks](#automated-release-checks)
   once on the final source. Reuse unaffected evidence with its original identity and the reason it
   remains valid; refresh changed boundaries after a fix. Preserve the
   [test limitations](#test-boundaries), including Chromium-only browser acceptance, and report
   exact failures, skips and unrun checks. An intentional local full gate does not require a
   duplicate CI run unless it protects a distinct boundary.
5. **Approve source push before CI.** The [Tests workflow](.github/workflows/tests.yml) needs
   the proposed source on GitHub. Obtain explicit approval for that exact source push before
   pushing, then wait for CI. For source review, use an approved branch and a pull request targeting
   `master`. A pull request can test a merge commit and never produces a publishable candidate;
   verify the final approved commit through a successful Tests run on `master`.
   A `master` push automatically [deploys Pages](#demo-deployment) after Tests succeeds, so its
   approval must cover the exact source and Demo. Record that run ID and attempt. Source-push
   approval does not authorize tags, Release creation or npm publication.
6. **Review packages and approve publication.** Download the immutable candidate from the
   successful [Tests workflow](.github/workflows/tests.yml) and inspect both tarballs, exports/types,
   dependency metadata, documentation, licenses and bundled content, including source maps where
   present. Apply the content audit to packaged files as well as source, including shipped generated
   code and dependency sources; do not blanket-exclude them.
   Record the manifest, package integrity and exact production Pages files. Obtain explicit approval
   for that source/version, candidate run ID, Release text and package publication, with
   [Demo deployment](#demo-deployment) separately included when requested. Publish and Demo reuse
   that candidate; they never build or retest it. Never republish a shipped npm version.
7. **Verify delivery and clean owned resources.** Check the public tag and both npm versions against
   the approved source and package integrity. For an approved Pages deployment, verify the exact
   source and Demo artifact through the [deployment procedure](#demo-deployment). Record actual
   results and accepted limitations privately or as redacted CI summaries. Clean only resources owned by the
   release run, and retain the local backup until delivery is confirmed.

### Automated release checks

Tests checks out the exact event commit with complete history, scans source, reachable history and
commit messages, and runs the native release regression tests plus `pnpm candidate`. Trusted
`master` runs also verify clean source, matching versions and the squash boundary before and after
the gate. Both tarballs and the exact production Pages directory pass the content scans before sealing.

A successful trusted push/manual Tests run uploads one immutable
`chonky-candidate-<run-id>-<attempt>` artifact, retained for 30 days. It contains only
`packages/chonky.tgz`, `packages/chonky-icon-fontawesome.tgz`, `pages/` and `manifest.json`.
The manifest records repository, Tests workflow/ref, event, run/attempt, source commit, reviewed
baseline, matching package version, lockfile SHA-256, every file's SHA-256 and each tarball's SHA-512.
Pull requests and other refs cannot produce reusable candidates.

Publish and Demo use a specific candidate run ID and check out its exact commit with
complete history. The shared candidate action checks the run through the GitHub API: same repository
and head repository, Tests workflow ID/path, `master`, trusted event, successful completion, exact
commit and current run attempt. It selects the immutable artifact by ID and rejects missing,
duplicate, expired, incomplete or mismatched inputs. After downloading, it checks source cleanliness,
baseline, versions, lockfile, manifest identity and the complete file inventory and checksums.
Consumers never install package dependencies, rebuild, pack, scan content again or rerun test suites.
They cannot choose a newer ref, previous attempt, PR artifact or local replacement. A missing or
expired candidate requires a new approved Tests run on the same source; no fallback is allowed.

Before an approved source push or publication, explicitly configure the repository Actions variable
`RELEASE_BASE_COMMIT` with the full SHA of the reviewed, rechecked public tip from step 3. The gate
accepts that unchanged commit or one non-merge commit whose sole parent is the baseline. A candidate
push must also report that baseline as its previous tip. Missing or stale baselines block publication;
the workflows never select or advance a baseline, create backups, squash commits or rewrite refs.
Keep the same baseline for candidate creation and its Pages/npm runs. Selecting a new baseline is a
separate review decision, never a workaround for rejected unpublished history.

For local checks, use the same isolated checkout and explicitly selected full SHAs:

```bash
bash scripts/install-gitleaks.sh /tmp/chonky-scanner
export GITLEAKS_BIN=/tmp/chonky-scanner/gitleaks
export RELEASE_COMMIT=<approved-full-commit-sha>
export RELEASE_BASE_COMMIT=<reviewed-public-tip-sha>
node scripts/verify-release.mjs v<version>
node scripts/check-content.mjs source . HEAD
pnpm test:release
```

Before squashing, `node scripts/check-content.mjs source . <base>..<tip>` audits the unpublished
range and its messages, including dirty/nonignored new source. That audit is not clean-source
acceptance. After `pnpm pack:candidate`, run
`node scripts/check-content.mjs artifacts output/candidate/packages`, and after `pnpm e2e:pages` run
`node scripts/check-content.mjs artifacts packages/chonky/example/dist`.

The installer checks fixed scanner archive and upstream-rule hashes; every scan rechecks the
executable, upstream rules and project override hashes. Update these pins together when intentionally
changing the scanner or rules. Scans remove upstream global exclusions for generated/dependency
files, ignore inline suppression comments, and inspect compressed npm contents via private scan
copies. Only history diffs read the approved exact fingerprints; source, messages and artifacts use
an empty ignore file. Reports stay in private temporary directories and are deleted, never uploaded;
failures expose only rule counts. Missing tools and skipped scanner tests cannot pass release gates.
These checks supplement manual content/consumer review, pre-squash backup and audit, exact-source
approval, and delivery verification; they cannot recognize every kind of real user data or prove
that a baseline was reviewed. Publication approvals in the SOP remain required.

## Publishing

Both npm packages use the same version. After [Release SOP](#release-sop) acceptance
and explicit publication approval, publish a GitHub Release whose tag is `v<version>`
after candidate CI passes. Include `<!-- candidate_run_id: ID -->` in the Release notes with the
approved Tests run ID. The published Release automatically triggers Publish; it never chooses
the latest run. A missing, ambiguous or invalid ID fails explicitly. Manual dispatch at that version
tag remains available with `candidate_run_id`; a branch dispatch is rejected. The tag must resolve
to the candidate commit and match both versions. Publish verifies and publishes the candidate's core tarball before
the icon tarball through npm trusted publishing. Release creation does not trigger publication.

Configure each npm package with the GitHub repository `samuelncui/Chonky` and
workflow filename `publish.yml` as its trusted publisher. Enable `npm publish`
under the publisher's allowed actions; stage-only permission cannot run this
workflow's direct publish steps. The workflow grants OIDC write permission only to the publish job and does
not require an npm token in GitHub secrets.

## Demo deployment

After a trusted `master` Tests run succeeds, Demo automatically verifies that run's candidate,
uploads only its `pages/` files and deploys with the official GitHub Pages actions. Failed runs,
pull requests and runs for a superseded commit do not deploy. Manual dispatch remains available
at an approved commit's branch or tag with `candidate_run_id`. Enable GitHub Actions as the Pages
publishing source. Write permissions and deployment concurrency remain confined to the deploy job;
ineligible runs cannot cancel a valid deployment. Package Releases do not themselves deploy a Demo.

Deploy only the exact source commit and Demo content covered by explicit approval. Before approval,
inspect the candidate's scanned production `/Chonky/` output for public content. Select a branch
or tag resolving to the approved commit and verify the candidate run, manifest and uploaded
Pages artifact. A ref that has moved to another commit is rejected; do not substitute a newer
`master` or dirty local build.
Obtain approval covering the exact source and Demo before a `master` push or manual dispatch.
Earlier package or Pages approval does not authorize later Demo changes.

To verify the deployed site with the same browser suite:

```bash
CHONKY_DEMO_URL=https://samuelncui.github.io/Chonky/ \
  pnpm exec playwright test --config=playwright.pages.config.ts
```
