# Changelog

Notable changes to the `@samuelncui/chonky` packages are documented here.

## 0.3.1 - 2026-08-21

- Add compatibility requirements and a 0.2.7 migration guide.
- Link both npm packages to the maintained fork and its changelog.

## 0.3.0 - 2026-08-21

Version 0.3.0 modernizes the library and its package toolchain.

### Breaking changes

- Require React and React DOM 19.2.x.
- Require Node.js 22.12 or later.
- Support imports from the package entry points only. Package-internal and
  `dist` deep imports are no longer exported.
- Remove the internal Redux reducers, store, selectors, and thunks from the
  public API.
- Publish compiled output and declarations without TypeScript source files.

### Changed

- Upgrade to MUI 9, Redux Toolkit 2, React Redux 9, and React Intl 10.
- Replace JSS with Emotion while retaining the stable `chonky-*` CSS classes.
- Replace the previous list and grid virtualization with React Virtuoso.
- Build ESM and CommonJS packages with Vite and TypeScript 6.
- Use pnpm 10 and Node.js 24 for repository development.
- Add unit tests, Playwright browser tests, package validation, and npm trusted
  publishing.

### Migrating from 0.2.7

1. Upgrade the application to React and React DOM 19.2.x and use Node.js 22.12
   or later.
2. Upgrade both packages together:

   ```shell
   npm install @samuelncui/chonky@^0.3.1 \
     @samuelncui/chonky-icon-fontawesome@^0.3.1
   ```

3. Import public APIs from `@samuelncui/chonky` and
   `@samuelncui/chonky-icon-fontawesome`. Replace deep imports and imports of
   Redux internals with component props, file actions, or `FileBrowserHandle`.
4. Keep style overrides on the public theme API or stable `chonky-*` classes,
   and verify any MUI-specific overrides against MUI 9.
