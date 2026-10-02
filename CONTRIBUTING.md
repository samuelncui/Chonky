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

## Publishing

Both npm packages use the same version. Create a GitHub release whose tag is
`v<version>` after CI passes. The Publish workflow validates the versions,
checks the packages and browser behavior, builds both tarballs, and publishes the core package before the icon package
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

To verify the deployed site with the same browser suite:

```bash
CHONKY_DEMO_URL=https://samuelncui.github.io/Chonky/ \
  pnpm exec playwright test --config=playwright.pages.config.ts
```
