import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileToolbar,
  type FileData,
  type FileActionHandler,
  type FileBrowserHandle,
  type SparseFileRow,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const memberCount = 20_000;
const pageSize = 100;
const maxPages = 2;
const fileAt = (number: number): FileData => ({ id: `sparse-${number}`, name: `File ${number}.txt` });
const disabledActions = [
  ChonkyActions.SortFilesByName.id,
  ChonkyActions.SortFilesBySize.id,
  ChonkyActions.SortFilesByDate.id,
  ChonkyActions.ToggleShowFoldersFirst.id,
];

const SparseBrowser = ({ query, descending }: { query: string; descending: boolean }) => {
  const browser = useRef<FileBrowserHandle>(null);
  const members = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const result = Array.from({ length: memberCount }, (_, index) => index + 1).filter((number) =>
      fileAt(number).name.toLowerCase().includes(normalizedQuery),
    );
    return descending ? result.reverse() : result;
  }, [query, descending]);
  const group = useMemo(() => ({ id: 'large', name: 'Large group', memberCount: members.length }), [members.length]);
  const rowAt = useCallback(
    (index: number): SparseFileRow =>
      index === 0
        ? { index, kind: 'group', group }
        : { index, kind: 'file', group, fileId: `sparse-${members[index - 1]}` },
    [group, members],
  );
  const indexById = useMemo(() => new Map(members.map((number, index) => [`sparse-${number}`, index + 1])), [members]);
  const [collapsed, setCollapsed] = useState(false);
  const [pages, setPages] = useState<Map<number, SparseFileRow[]>>(new Map());
  const [selected, setSelected] = useState<FileData[]>([]);
  const [rangeStart, setRangeStart] = useState(0);
  const [failedPages, setFailedPages] = useState<Set<number>>(new Set());
  const [result, setResult] = useState(
    'Scroll to load a page. Select a file, scroll away, then reveal it from its pinned row.',
  );
  const range = useRef({ start: 0, end: 0 });
  const pending = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = pending.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const loadRange = useCallback(
    (start: number, end: number) => {
      range.current = { start, end };
      setRangeStart(start);
      if (!members.length || collapsed) return;
      for (
        let page = Math.floor(start / pageSize);
        page <= Math.floor(Math.min(end, members.length) / pageSize);
        page++
      ) {
        if (pages.has(page) || pending.current.has(page) || failedPages.has(page)) continue;
        const timer = setTimeout(() => {
          pending.current.delete(page);
          setPages((current) => {
            const next = new Map(current);
            next.set(
              page,
              Array.from({ length: Math.min(pageSize, members.length + 1 - page * pageSize) }, (_, offset) =>
                rowAt(page * pageSize + offset),
              ),
            );
            while (next.size > maxPages) next.delete(next.keys().next().value!);
            return next;
          });
        }, 250);
        pending.current.set(page, timer);
      }
    },
    [collapsed, failedPages, members.length, pages, rowAt],
  );
  // Retry and cache changes must also load holes in a range that has not moved.
  useEffect(() => {
    loadRange(range.current.start, range.current.end);
  }, [loadRange]);

  const rows = useMemo(() => {
    const byIndex = new Map<number, SparseFileRow>([[0, rowAt(0)]]);
    for (const page of pages.values()) for (const row of page) byIndex.set(row.index, row);
    for (const file of selected) {
      const index = indexById.get(file.id);
      if (index !== undefined) byIndex.set(index, rowAt(index));
    }
    if (collapsed) for (const index of byIndex.keys()) if (index > 0) byIndex.delete(index);
    return [...byIndex.values()].map((row) => ({ ...row, group: { ...group, expanded: !collapsed } }));
  }, [collapsed, group, indexById, pages, rowAt, selected]);
  const files = useMemo(
    () => rows.flatMap((row) => (row.kind === 'file' ? [fileAt(Number(row.fileId.slice('sparse-'.length)))] : [])),
    [rows],
  );
  const selectedCached = selected.every((file) => pages.has(Math.floor(indexById.get(file.id)! / pageSize)));
  const grouping = useMemo(
    () => ({
      mode: 'continuous' as const,
      sparse: {
        totalCount: members.length ? (collapsed ? 1 : members.length + 1) : 0,
        rows: members.length ? rows : [],
        onRangeChanged: loadRange,
        onToggleGroup: () => setCollapsed((value) => !value),
      },
    }),
    [collapsed, loadRange, members.length, rows],
  );
  const onAction = useCallback<FileActionHandler>((data) => {
    if (data.id === ChonkyActions.ChangeSelection.id) setSelected(data.state.selectedFiles);
    if (data.id === ChonkyActions.OpenFiles.id)
      setResult(
        `OpenFiles event: ${data.payload.files.map((file) => file.name).join(', ')}. The caller supplies file content.`,
      );
  }, []);
  const simulateError = () => {
    const page = Math.floor(range.current.start / pageSize);
    const timer = pending.current.get(page);
    if (timer) clearTimeout(timer);
    pending.current.delete(page);
    setFailedPages((current) => new Set([...current, page]));
    setPages((current) => {
      const next = new Map(current);
      next.delete(page);
      return next;
    });
  };

  return (
    <>
      <div className="demo-controls">
        <button className="demo-button" disabled={!members.length || collapsed} onClick={simulateError}>
          Simulate page error
        </button>
        <button
          className="demo-button"
          disabled={!selected.length || collapsed}
          onClick={() => browser.current?.revealFile(selected[0].id)}
        >
          Reveal selected file
        </button>
      </div>
      {[...failedPages].map((page) => (
        <div key={page} className="demo-error" role="alert">
          Page {page + 1} failed (simulated). Its unloaded rows remain inert.{' '}
          <button
            className="demo-button"
            onClick={() =>
              setFailedPages((current) => {
                const next = new Set(current);
                next.delete(page);
                return next;
              })
            }
          >
            Retry page {page + 1}
          </button>
        </div>
      ))}
      <div className="demo-stats">
        <span>
          Range start: <output data-testid="sparse-range-start">{rangeStart}</output>
        </span>
        <span>
          Cache pages: <output data-testid="sparse-cache-pages">{pages.size}</output> / 2
        </span>
        <span>
          Selected: <output data-testid="sparse-selection-count">{selected.length}</output>
        </span>
        <span>
          Selected page cached:{' '}
          <output data-testid="sparse-selected-cached">{selected.length ? String(selectedCached) : '—'}</output>
        </span>
      </div>
      <div className="demo-browser">
        <FileBrowser
          ref={browser}
          files={files}
          grouping={grouping}
          onFileAction={onAction}
          iconComponent={ChonkyIconFA}
          disableDragAndDrop
          disableDefaultFileActions={disabledActions}
          clearSelectionOnOutsideClick={false}
          defaultSortActionId={null}
        >
          <FileToolbar />
          <FileList
            emptyPlaceholder={
              <div className="demo-empty">
                <strong>No matching files.</strong>
                <p>Clear the caller filter and apply the projection, or reset the demo.</p>
              </div>
            }
          />
          <FileContextMenu />
        </FileBrowser>
      </div>
      <p className="demo-result" role="status">
        {result}
      </p>
    </>
  );
};

export const SparseDemo = () => {
  const [query, setQuery] = useState('');
  const [descending, setDescending] = useState(false);
  const [projection, setProjection] = useState({ query: '', descending: false, generation: 0 });
  return (
    <section aria-labelledby="sparse-title">
      <h1 id="sparse-title">Sparse paging</h1>
      <p className="demo-description">
        20,000 files, 100 rows per simulated page, and a two-page cache. Selected rows stay pinned even after their page
        is evicted. Everything runs locally with a deterministic 250 ms loading delay.
      </p>
      <form
        className="demo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          setProjection((current) => ({ query: query.trim(), descending, generation: current.generation + 1 }));
        }}
      >
        <label>
          Caller filter{' '}
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. File 20000" />
        </label>
        <label>
          Caller order{' '}
          <select
            value={descending ? 'descending' : 'ascending'}
            onChange={(event) => setDescending(event.target.value === 'descending')}
          >
            <option value="ascending">Number ascending</option>
            <option value="descending">Number descending</option>
          </select>
        </label>
        <button className="demo-button" type="submit">
          Apply projection
        </button>
        <button
          className="demo-button"
          type="button"
          onClick={() => {
            setQuery('');
            setDescending(false);
            setProjection((current) => ({ query: '', descending: false, generation: current.generation + 1 }));
          }}
        >
          Reset demo
        </button>
      </form>
      <p className="demo-help">
        The caller owns sorting, filtering, collapse, failed pages, and retry; Chonky renders the supplied projection.
        Apply replaces the projection and clears selection. Toolbar totals include group headers. Select All and group
        actions cover loaded rows only, including pinned selections; they do not select all 20,000 files.
      </p>
      <SparseBrowser key={projection.generation} query={projection.query} descending={projection.descending} />
    </section>
  );
};
