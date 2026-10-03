# Contributing to Chonky

## Development setup

Use Node.js 24 and Corepack. The repository pins pnpm in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm e2e
pnpm e2e:pages
```

During development, run the main package build in watch mode:

```bash
pnpm --filter @samuelncui/chonky dev
```

The browser tests run against the demo application in
`packages/chonky/example`. Before submitting a change, run `pnpm check`,
`pnpm e2e` and `pnpm e2e:pages`. The last command tests the production build
under `/Chonky/`, including relative navigation and assets.

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
4. **Run gates and finish review.** Run `pnpm check`, `pnpm e2e` and `pnpm e2e:pages` against the
   final source, plus the [automated release checks](#automated-release-checks) for the intended tag. Review and
   fix until no unresolved, unaccepted finding remains; source fixes require a new clean commit and
   verification of the final source. Preserve the [test limitations](#test-boundaries), including
   Chromium-only browser acceptance, and report exact failures, skips and unrun checks.
5. **Approve source push before CI.** The [Tests workflow](.github/workflows/tests.yml) needs
   the proposed source on GitHub. Obtain explicit approval for that exact source push before
   pushing, then wait for CI. For source review without Pages deployment, use an approved branch
   and a pull request targeting `master`. Record the tested checkout; a pull request can test a
   merge commit, so verify that acceptance covers the final approved tree. A push to `master`
   also [deploys Pages](#demo-deployment) and needs approval for that exact source and Demo before
   the push. Source-push approval does not authorize tags, Release creation or npm publication.
6. **Review packages and approve publication.** Use the pack steps in the
   [Publish workflow](.github/workflows/publish.yml) and inspect both tarballs, exports/types,
   dependency metadata, documentation, licenses and bundled content, including source maps where
   present. Apply the content audit to packaged files as well as source, including shipped generated
   code and dependency sources; do not blanket-exclude them.
   Packing rebuilds the packages; inspect fresh outputs and record their integrity.
   Obtain explicit approval for the exact source/version, Release text and package publication,
   with [Demo deployment](#demo-deployment) separately included when requested. The Publish workflow
   rebuilds and packs from the release tag, so retain its commit, package integrity and actual results;
   local checks alone do not certify its rebuilt tarballs. Never republish a shipped npm version.
7. **Verify delivery and clean owned resources.** Check the public tag and both npm versions against
   the approved source and package integrity. For an approved Pages deployment, verify the exact
   source and Demo artifact through the [deployment procedure](#demo-deployment). Record actual
   results and accepted limitations privately or as redacted CI summaries. Clean only resources owned by the
   release run, and retain the local backup until delivery is confirmed.

### Automated release checks

The Publish and Demo workflows check out the event's exact commit with complete history. Before
building, they verify source identity, cleanliness, matching versions and the squash boundary, then
scan source, reachable history and commit messages. They run `pnpm test:release`, `pnpm check`,
`pnpm e2e` and `pnpm e2e:pages`. After the last build/pack, they recheck source identity and scan
the actual tarballs or Pages directory before publishing/uploading; Publish also scans its Demo
output. Package SHA-512 hashes and artifact inventory SHA-256 hashes identify the checked inputs.
The Tests workflow runs the same content scans and release regression tests on proposed source.

Before an approved source push or publication, explicitly configure the repository Actions variable
`RELEASE_BASE_COMMIT` with the full SHA of the reviewed, rechecked public tip from step 3. The gate
accepts that unchanged commit or one non-merge commit whose sole parent is the baseline. A Pages
push must also report that baseline as its previous tip. Missing or stale baselines block publication;
the workflows never select or advance a baseline, create backups, squash commits or rewrite refs.
Keep the baseline for the same approved candidate's Pages/npm runs. Selecting a new baseline is a
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
acceptance. After packing both packages into a fresh directory, run
`node scripts/check-content.mjs artifacts <package-directory>`, and after `pnpm e2e:pages` run
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
and explicit publication approval, create a GitHub release whose tag is `v<version>`
after CI passes. The Publish workflow runs the automated release checks,
builds and scans both tarballs, and publishes the core package before the icon package
through npm trusted publishing.

Configure each npm package with the GitHub repository `samuelncui/Chonky` and
workflow filename `publish.yml` as its trusted publisher. Enable `npm publish`
under the publisher's allowed actions; stage-only permission cannot run this
workflow's direct publish steps. The workflow uses OIDC and does not require
an npm token in GitHub secrets.

## Demo deployment

The Demo workflow builds and tests the static demo after pushes to `master`
and manual dispatches. It uploads only `packages/chonky/example/dist` and
deploys it with the official GitHub Pages actions. Enable GitHub Actions as
the Pages publishing source in repository settings. Deployment uses the
`github-pages` environment and grants write permissions only to the deploy job.

Deploy only the exact source commit and Demo content covered by explicit approval. Before approval,
inspect and scan the production `/Chonky/` output built by `pnpm e2e:pages` for public content.
A push to `master` automatically deploys Pages, so obtain that approval before the push. For manual
dispatch, select a branch or tag resolving to the approved commit and verify the run's commit
and uploaded Demo artifact. The workflow builds and tests that checkout; a package Release
does not itself deploy its tag's Demo. Do not substitute a newer `master` or dirty local build.
Earlier package or Pages approval does not authorize later Demo changes.

To verify the deployed site with the same browser suite:

```bash
CHONKY_DEMO_URL=https://samuelncui.github.io/Chonky/ \
  pnpm exec playwright test --config=playwright.pages.config.ts
```
