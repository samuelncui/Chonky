import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChonkyActions,
  FileBrowser,
  FileList,
  FileToolbar,
  type FileData,
  type FileActionHandler,
  type SparseFileRow,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const memberCount = 20_000;
const pageSize = 100;
const maxPages = 2;
const group = { id: 'large', name: 'Large group', memberCount };
const rowAt = (index: number): SparseFileRow =>
  index === 0 ? { index, kind: 'group', group } : { index, kind: 'file', group, fileId: `sparse-${index}` };
const fileAt = (index: number): FileData => ({ id: `sparse-${index}`, name: `File ${index}` });

export const SparseDemo = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [pages, setPages] = useState<Map<number, SparseFileRow[]>>(new Map());
  const [selected, setSelected] = useState<FileData[]>([]);
  const [rangeStart, setRangeStart] = useState(0);
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
      setRangeStart(start);
      for (let page = Math.floor(start / pageSize); page <= Math.floor(end / pageSize); page++) {
        if (pages.has(page) || pending.current.has(page)) continue;
        const timer = setTimeout(() => {
          pending.current.delete(page);
          setPages((current) => {
            const next = new Map(current);
            next.set(
              page,
              Array.from({ length: Math.min(pageSize, memberCount + 1 - page * pageSize) }, (_, offset) =>
                rowAt(page * pageSize + offset),
              ),
            );
            while (next.size > maxPages) next.delete(next.keys().next().value!);
            return next;
          });
        }, 150);
        pending.current.set(page, timer);
      }
    },
    [pages],
  );

  const rows = useMemo(() => {
    const byIndex = new Map<number, SparseFileRow>();
    for (const page of pages.values()) for (const row of page) byIndex.set(row.index, row);
    for (const file of selected) {
      const index = Number(file.id.slice('sparse-'.length));
      byIndex.set(index, rowAt(index));
    }
    if (collapsed) for (const index of byIndex.keys()) if (index > 0) byIndex.delete(index);
    return [...byIndex.values()].map((row) => ({ ...row, group: { ...group, expanded: !collapsed } }));
  }, [collapsed, pages, selected]);

  const files = useMemo(() => rows.flatMap((row) => (row.kind === 'file' ? [fileAt(row.index)] : [])), [rows]);
  const selectedCached = selected.every((file) =>
    pages.has(Math.floor(Number(file.id.slice('sparse-'.length)) / pageSize)),
  );
  const grouping = useMemo(
    () => ({
      mode: 'continuous' as const,
      sparse: {
        totalCount: collapsed ? 1 : memberCount + 1,
        rows,
        onRangeChanged: loadRange,
        onToggleGroup: () => setCollapsed((value) => !value),
      },
    }),
    [collapsed, loadRange, rows],
  );
  const onAction = useCallback<FileActionHandler>((data) => {
    if (data.id === ChonkyActions.ChangeSelection.id) setSelected(data.state.selectedFiles);
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h1>Sparse grouping example</h1>
      <p>
        Range start: <output data-testid="sparse-range-start">{rangeStart}</output> · Cache pages:{' '}
        <output data-testid="sparse-cache-pages">{pages.size}</output> · Selected:{' '}
        <output data-testid="sparse-selection-count">{selected.length}</output> · Selected page cached:{' '}
        <output data-testid="sparse-selected-cached">{String(selectedCached)}</output>
      </p>
      <div style={{ height: 560 }}>
        <FileBrowser
          files={files}
          grouping={grouping}
          onFileAction={onAction}
          iconComponent={ChonkyIconFA}
          disableDragAndDrop
          folderChain={[{ id: 'sparse-root', name: 'Sparse grouping', isDir: true }]}
        >
          <FileToolbar />
          <FileList />
        </FileBrowser>
      </div>
    </main>
  );
};
