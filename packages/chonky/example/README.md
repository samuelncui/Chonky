# Interactive showcase

The example consumes the packages' built public exports. From the repository root:

```sh
pnpm build
pnpm --filter @samuelncui/chonky-example dev
```

Open `http://127.0.0.1:4173/`. Navigation uses query-relative links, so the same
build works under the GitHub Pages project path `/Chonky/` when built with
`vite build --base=/Chonky/`.

| Example         | Demonstrated behavior                                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary files  | `fileMap.useFileMap` navigation, moves and reset, custom note creation, metadata previews, filtering, sorting, list/grid views, native checkbox selection, quoted-URL and optional asynchronous thumbnails, context actions, ref selection/reveal, responsive/inline toolbars, and 5,000 virtualized files.                     |
| Identical files | Continuous/single grouping, selection within a group, registered keep/delete header and context actions, filtering while retaining full group membership, 1,000 groups / 5,000 files, and ref reveal. The API selector also demonstrates controlled `GroupedFileList` with caller-loaded copies and `beforeFiles`/`afterFiles`. |
| Sparse paging   | 20,000 files, indexed loading placeholders, a two-page cache, pinned selected rows, collapse, caller filter/order, simulated errors/retry, and reveal of a pinned file after cache eviction.                                                                                                                                    |
| Presentation    | Status labels and supplemental markers, measured detail rows, custom root breadcrumb, folded ancestors, explicit Copy path, host Redux footer/toolbar editing, light/dark switching, custom empty content with an action, ref reveal, and custom descending initial priority sorting.                                           |

All fixtures are deterministic and run in memory without a backend or remote
media. Reset or reload restores the starting data. File previews contain fixture
metadata. Open actions in the grouping and presentation examples explicitly
report the `OpenFiles` event; applications supply their own file contents.

Ordinary files uses the exported `fileMap.useFileMap` hook for its folder tree.
Custom note creation and the opt-in 5,000-file fixture update that same map through
`setFileMap`. In Photos, Generate photo thumbnail enables a `thumbnailGenerator`
that resolves holiday-snapshot.jpg's local preview after a simulated 250 ms delay.
Switch to Grid to see it; disabling the option restores its file icon. The other
photo retains its quoted-URL image. Reset restores the small fixture and disables
generation.

Presentation starts with three files. Load 60 review files adds an opt-in queue
for scrolling and offscreen reveal; Reset demo restores the small sample.
The Presentation empty folder includes expandable directory-error details and a
Retry directory action. Long empty content scrolls within the file-list pane.

Sparse sorting, filtering, collapse, failures, and retry belong to the caller.
Applying a projection resets its cache and selection. The demo simulates page
loads with a 250 ms delay and keeps selected rows available after their cached
page is evicted. Chonky's sparse total includes group headers; Select All and
action membership include loaded file rows only. Built-in sort controls are
disabled in this example because they do not reorder the caller's projection.

Reveal requires a displayed, selectable file. In grouped lists, collapsed or
filtered-out targets are not revealed. Reset restores the expansion/filter state.

Browser acceptance lives in `e2e/`. Every test navigates relative to its configured
base URL, allowing the same tests to run at the development root and `/Chonky/`.
