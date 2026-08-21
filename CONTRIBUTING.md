# Contributing to Chonky

## Development setup

Use Node.js 24 and Corepack. The repository pins pnpm in `package.json`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm e2e
```

During development, run the main package build in watch mode:

```bash
pnpm --filter @samuelncui/chonky dev
```

The browser tests run against the example application in
`packages/chonky/example`. Before submitting a change, run `pnpm check` and
`pnpm e2e`.

## Publishing

Both npm packages use the same version. Create a GitHub release whose tag is
`v<version>` after CI passes. The Publish workflow validates the versions,
builds both tarballs, and publishes the core package before the icon package
through npm trusted publishing.

Configure each npm package with the GitHub repository `samuelncui/Chonky` and
workflow filename `publish.yml` as its trusted publisher. The workflow uses
OIDC and does not require an npm token in GitHub secrets.
