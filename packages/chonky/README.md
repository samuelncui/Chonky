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

Sort by name starts ascending; Sort by size and Sort by date start descending.
Selecting the active sort action toggles its direction. Custom sort actions start
ascending unless they set `initialSortOrder: SortOrder.DESC`.
Invalid modification dates are treated as missing for display and sorting.

Enter, including keypad Enter, opens the focused openable file when selection is
empty; otherwise, the default Open selection action opens the openable selection.

File lists use list/listitem semantics. Selectable rows expose a native, named
checkbox as their selection tab stop; row actions remain sibling controls.
Space toggles selection, and the keyboard context menu targets the focused file.
Mouse row selection retains Ctrl/Cmd and Shift behavior. Grid checkboxes overlay
the card so they do not reduce the space for previews and file names. Thumbnails use native
images with contained sizing, including URLs containing quotes or non-ASCII text.

Each browser uses a private Redux context. Caller components in children, toolbar
and footer slots keep the enclosing application's ordinary `useSelector`,
`useDispatch` and `useStore` context. Multiple browser instances own independent
selection and navigation state.

### Styling boundaries

Chonky uses MUI's `StyledEngineProvider injectFirst` and a per-browser theme, plus
the shared `@emotion/css` cache for its generated classes. Overlapping generated
classes compose in base, variant/state, then caller order through Emotion's `cx`.
Plain classes with no conflicting declarations still use `classnames`. Existing
`chonky-*` hooks and `theme`/`muiThemeOptions` overrides remain supported; generated
hashes are not customization hooks. External styles still follow the CSS cascade,
including specificity and `!important`; caller class order alone cannot override it.
Avoid blanket important button colors that mask disabled, active and focus states.
Portaled MUI controls retain the browser theme; application-owned portal content
may restore its own app theme at that boundary.

`ChonkyActions.EnableCompactView` remains experimental and opt-in. Ordinary file
lists support its compact entries, native selection, and focus/selection indicators.
Grouped and sparse projections use List view. Compact does not provide List view's
status/detail presentation or Grid view's thumbnail/DnD preview indicators.

`disableDragAndDrop` prevents drag starts and resulting moves when a shared DnD
provider is supplied, including moves from a drag started before disabling it.
Dragging a selected file moves only draggable members of the selection;
selected files marked `draggable: false` stay in place.

An action in `fileActions` with a built-in action ID replaces that action's
definition. Requests from browser controls, internal effects, and refs honor
the registered definition, including its effect and visibility rules.

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

For ordinary lists and grouping supplied through `groups`, the built-in Select
All action selects visible, selectable files, respecting the current Filter
and Show hidden files option. A ref's `setFileSelection` accepts file IDs
directly and can select supplied files hidden by a filter.

For an in-memory folder tree, the exported `fileMap.useFileMap` hook provides `files`,
`folderChain`, navigation and move/reset methods, plus a `fileActionHandler` for
OpenFiles and MoveFiles. Moves update folder membership, child counts and each
file's `parentId` without mutating the caller's `baseFileMap`. Reset restores
that map and the initial folder. The Ordinary files example uses this hook and
its `setFileMap` method for custom note creation and fixture loading.

See the [live demo](https://samuelncui.github.io/Chonky/) and the
[repository](https://github.com/samuelncui/Chonky) for the runnable example
and development instructions.

## License

MIT

## Presentation extensions

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
  Long content scrolls within the file-list pane, including when a sparse list has zero rows.

These options do not require application-specific data, services or filesystem operations.

## Grouped lists

`grouping` and `GroupedFileList` are distinct integrations: `grouping` renders
headers and members together, while `GroupedFileList` renders caller-controlled
headers around only the active group's supplied files. The demo's "loaded group"
option selects `GroupedFileList`; `single` is a mode of `grouping`.
"Identical files" names the example's content; its copies are ordinary files,
and Chonky does not decide which files have identical content.

Filter is the UI label for file-name search; exported search action names and
i18n IDs retain their existing spelling. `FileActionButton.group` organizes
action menus, while `state.group` identifies a file group. Sparse **rows** include
headers and unloaded positions; **files** and action `fileIds` identify members.

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

### Sparse continuous grouping

For a large caller-managed list, pass `mode: 'continuous'` with `sparse` instead
of `groups`. `totalCount` is the number of rows in the caller's current display
projection, including group headers; `rows` contains only loaded positions.

```tsx
grouping={{
  mode: 'continuous',
  sparse: {
    totalCount: 100_000,
    rows: [
      { index: 0, kind: 'group', group: { id: 'coast', name: 'Coast', memberCount: 60_000 } },
      { index: 1, kind: 'file', group: { id: 'coast', name: 'Coast', memberCount: 60_000 }, fileId: 'original' },
    ],
    onRangeChanged: (startIndex, endIndex) => loadVisibleRows(startIndex, endIndex),
    onToggleGroup: (groupId) => toggleGroupInProjection(groupId),
  },
}}
```

Range indices are inclusive. Each loaded file row refers to an entry in `files`;
its group metadata also identifies its action context when the header is outside
the loaded range. Use unique file IDs and indices, with indices between zero and
`totalCount - 1`. `memberCount` is the group's full member count. Set `expanded`
on a group to control its header chevron; it defaults to `true`. The caller updates
`totalCount` and `rows` after a collapse, removal, or other projection change.
Unloaded positions render visible, inert loading placeholders. The toolbar
reports the projection's total **rows** (including headers), not just loaded
files. Chonky does not sort or filter the caller-managed projection, so its
built-in Filter and Show hidden files controls are hidden in sparse mode. The
caller must provide a server-backed search and update the projection if search
is needed. Hidden file rows included by the caller remain selectable. The sparse
API has no failed-page state; the caller owns page errors and retry controls.
Selection, Select All, and group action `fileIds` cover loaded file rows only.
Keep a selected file's row in `rows` while it must remain
selectable across range changes. The existing `groups` form retains its behavior.
Toggling another sparse group's header preserves the active group and selection.
Collapsing the active group clears its selection and range anchor.

Sparse Shift anchors use stable file IDs and virtual positions. Loading or evicting
other rows does not move the anchor; selecting a range covers loaded members only.
An absent anchor cannot extend a range until it is available again. Changing the
anchor's virtual position/group, the sort, filter, folder, or active group resets
it. Callers replacing an entire sparse projection reset/remount the browser (as in
the sparse example); the library cannot infer changes to unloaded rows. Cache-only
changes do not run ordinary file sorting/search or allocate the total row count.
