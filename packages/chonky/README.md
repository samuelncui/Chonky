# `@samuelncui/chonky`

Chonky is a file browser component for React. It supports file selection,
drag-and-drop, list and grid views, keyboard shortcuts, search, sorting, custom
actions, and custom icons.

This maintained fork updates the inactive upstream project for current React
applications. See the repository's [fork rationale](https://github.com/samuelncui/Chonky#why-this-fork)
and [changelog](https://github.com/samuelncui/Chonky/blob/master/CHANGELOG.md).

## Requirements

- React and React DOM 19.2.x
- Node.js 22.12 or later

## Installation

```shell
npm install @samuelncui/chonky @samuelncui/chonky-icon-fontawesome
```

## Usage

```tsx
import { FullFileBrowser } from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

export function FileBrowser() {
  return <FullFileBrowser files={[]} iconComponent={ChonkyIconFA} />;
}
```

`FileToolbar` uses the wrapping `responsive` layout by default. When composing
the browser manually, use its `inline` layout to keep the filter, summary,
children, and action regions on one row:

```tsx
<FileToolbar layout="inline" />
```

Use a browser ref when an external result needs to be selected and scrolled
into view:

```tsx
import { useRef } from 'react';
import { FullFileBrowser, type FileBrowserHandle } from '@samuelncui/chonky';

export function RevealableBrowser() {
  const browser = useRef<FileBrowserHandle>(null);
  return (
    <>
      <button onClick={() => browser.current?.revealFile('report')}>Show report</button>
      <FullFileBrowser ref={browser} files={[{ id: 'report', name: 'Report.pdf' }]} />
    </>
  );
}
```

`revealFile` only acts when selection is enabled and the target file is both
displayed and selectable. Otherwise, the current selection and viewport remain
unchanged.

See the [repository](https://github.com/samuelncui/Chonky) for the runnable
example and development instructions.

## License

MIT

## Presentation extensions (unreleased)

- `FileData.status` supplies an accessible label, color and optional supplemental marker;
  `FileData.details` adds contextual lines. Lists with details measure row heights.
- `GroupedFileList` takes `groups`, `activeGroupId` and `onGroupChange`. The caller supplies
  the active group's files to its surrounding `FileBrowser`. Headers are not selectable
  files; changing the active group clears selection. `beforeFiles` and `afterFiles`
  accept loading, paging or other caller controls.
- `FileNavbar.rootContent` replaces the root breadcrumb content. `FileNavbar.path`
  supplies the Copy path value; intermediate breadcrumbs fold when space is limited.
- `FileBrowser.footer`, also accepted by `FullFileBrowser`, holds optional content below
  the independently scrolling browser body. Footer inputs retain ordinary editing.
- `FileList.emptyPlaceholder` supplies custom content for an empty, non-loading list.

These options do not require application-specific data, services or filesystem operations.
