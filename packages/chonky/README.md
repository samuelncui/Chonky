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

## Grouped lists (unreleased)

Pass `grouping` to `FileBrowser` (or `FullFileBrowser`) to render `FileList` as
one measured, virtualized list with group headers and ordinary file rows:

```tsx
<FileBrowser
  files={files}
  fileActions={actions}
  onFileAction={onFileAction}
  grouping={{
    groups: [{ id: 'coast', name: 'Summer coast', fileIds: ['original', 'copy'] }],
    mode: 'continuous', // or 'single'
    activeGroupId,
    onGroupChange: setActiveGroupId,
    actionIds: ['keep_only_this', 'delete_selected'],
  }}
>
  <FileToolbar />
  <FileList />
  <FileContextMenu />
</FileBrowser>
```

Group IDs must be unique and each file ID must belong to one group. Files not
assigned to a group are not displayed in this mode. Missing members are omitted;
groups with no visible members are hidden. Group order follows `groups`, while
ordinary sorting and filtering apply to members. A filtered header shows the
visible/total member count. Grouping uses list rows; grid and compact view actions
are unavailable until grouping is removed. The legacy `GroupedFileList` remains
available for callers that load only one group's files at a time.

`mode` defaults to `continuous`, with all groups initially expanded. `single`
expands only the active group. Headers toggle expansion; actions do not toggle
panels. `activeGroupId` can synchronize an external active group, and
`onGroupChange` reports changes from file selection, header toggles and imperative
selection. Without these props, active-group state is managed internally.

Selection belongs to one group. Clicking or selecting another group's file clears
the previous selection and range anchor. Shift and Ctrl/Cmd selection work within
the group. Select All uses visible members of the active group; it selects nothing
before a group is active. An imperative selection spanning groups keeps only the
first selectable file's group. `revealFile` retains its existing displayed-file
contract: collapsed or filtered-out members are not revealed.

`actionIds` references registered `FileAction` definitions; an individual group's
`actionIds` overrides the default. Buttons use existing action labels, icons,
localization, `requiresSelection`, `fileFilter`, effects and handlers. The optional
`state.group` contains `{ id, fileIds }`; `fileIds` includes all supplied members
still present in `files`, including filtered-out members. Selection and context-menu
state are scoped to the target group. The action payload is unchanged. The caller
owns grouping criteria and any filesystem or business operation.

`customVisibility(state)` now receives the same action state as the handler, so
callers can define selection requirements without adding a second action system:

```tsx
const keepAction = defineFileAction({
  id: 'keep_only_this',
  requiresSelection: true,
  button: { name: 'Keep only this', contextMenu: true },
  customVisibility: (state) =>
    state.group && state.selectedFilesForAction.length === 1
      ? CustomVisibilityState.Default
      : CustomVisibilityState.Disabled,
});
```

Existing zero-argument visibility callbacks remain valid. Hidden and disabled
states are rechecked when dispatching, including shortcuts and ref requests.
Callbacks should be pure. Group operations must distinguish full group membership
from the selected/filtered files when deciding their target set.
