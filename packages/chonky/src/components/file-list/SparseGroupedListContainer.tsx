import React, { UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListRange, Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { reduxActions } from '../../redux/reducers';
import {
  selectFileMap,
  selectFileViewConfig,
  selectGrouping,
  selectRevealFileRequest,
  selectors,
} from '../../redux/selectors';
import { useChonkyDispatch, useChonkySelector } from '../../redux/store';
import { FileViewMode } from '../../types/file-view.types';
import { makeLocalChonkyStyles } from '../../util/styles';
import { SmartFileEntry } from './FileEntry';
import { GroupHeader } from './GroupedListContainer';
import { useListContainerStyles } from './ListContainer';

/** Virtual indices belong to the caller's display projection, including unloaded rows. */
export const SparseGroupedListContainer = ({ onScroll }: { onScroll?: (event: UIEvent<HTMLDivElement>) => void }) => {
  const dispatch = useChonkyDispatch();
  const classes = useListContainerStyles();
  const placeholderClasses = usePlaceholderStyles();
  const grouping = useChonkySelector(selectGrouping);
  const view = useChonkySelector(selectFileViewConfig);
  const fileMap = useChonkySelector(selectFileMap);
  const displayFileIds = useChonkySelector(selectors.getDisplayFileIds);
  const reveal = useChonkySelector(selectRevealFileRequest);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [visibleRange, setVisibleRange] = useState<ListRange | null>(null);
  const sparse = grouping?.sparse;
  const rows = sparse?.rows;
  const onRangeChanged = sparse?.onRangeChanged;
  const handleRangeChanged = useCallback(
    ({ startIndex, endIndex }: ListRange) => {
      setVisibleRange((current) =>
        current?.startIndex === startIndex && current.endIndex === endIndex ? current : { startIndex, endIndex },
      );
      onRangeChanged?.(startIndex, endIndex);
    },
    [onRangeChanged],
  );
  const rowByIndex = useMemo(() => new Map(rows?.map((row) => [row.index, row])), [rows]);
  const displayIndexById = useMemo(() => new Map(displayFileIds.map((id, index) => [id, index])), [displayFileIds]);
  const hasVisiblePlaceholder = useMemo(() => {
    if (!visibleRange) return false;
    for (let index = visibleRange.startIndex; index <= visibleRange.endIndex; index++) {
      const row = rowByIndex.get(index);
      if (row?.kind === 'group' || (row?.kind === 'file' && fileMap[row.fileId])) continue;
      return true;
    }
    return false;
  }, [fileMap, rowByIndex, visibleRange]);

  useEffect(() => {
    if (!reveal || reveal.handled) return;
    const row = rows?.find((candidate) => candidate.kind === 'file' && candidate.fileId === reveal.fileId);
    if (row) virtuoso.current?.scrollToIndex({ index: row.index, align: 'center' });
    dispatch(reduxActions.acknowledgeRevealFile(reveal.revision));
  }, [dispatch, reveal, rows]);

  if (!sparse) return null;
  return (
    <>
      <span className={placeholderClasses.loadingStatus} role="status" aria-live="polite" aria-atomic="true">
        {hasVisiblePlaceholder ? 'Loading files' : ''}
      </span>
      <Virtuoso
        ref={virtuoso}
        className={classes.listContainer}
        style={{ height: '100%' }}
        totalCount={sparse.totalCount}
        defaultItemHeight={view.entryHeight}
        computeItemKey={(index) => {
          const row = rowByIndex.get(index);
          return row?.kind === 'group'
            ? `group-${row.group.id}`
            : row?.kind === 'file' && fileMap[row.fileId]
              ? `file-${row.fileId}`
              : `placeholder-${index}`;
        }}
        rangeChanged={handleRangeChanged}
        onScroll={onScroll}
        itemContent={(index) => {
          const row = rowByIndex.get(index);
          if (row?.kind === 'group') {
            return (
              <GroupHeader
                group={row.group}
                expanded={row.group.expanded ?? true}
                onToggle={() => {
                  dispatch(reduxActions.toggleGroup(row.group.id));
                  sparse.onToggleGroup(row.group.id);
                }}
              />
            );
          }
          if (row?.kind === 'file' && fileMap[row.fileId]) {
            return (
              <div style={{ minHeight: view.entryHeight }}>
                <SmartFileEntry
                  fileId={row.fileId}
                  displayIndex={displayIndexById.get(row.fileId) ?? -1}
                  fileViewMode={FileViewMode.List}
                />
              </div>
            );
          }
          return (
            <div
              className={placeholderClasses.placeholder}
              aria-hidden="true"
              data-chonky-sparse-placeholder
              style={{ height: view.entryHeight }}
            >
              Loading…
            </div>
          );
        }}
      />
    </>
  );
};

const usePlaceholderStyles = makeLocalChonkyStyles((theme) => ({
  loadingStatus: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    paddingLeft: theme.margins.rootLayoutMargin + 8,
    color: theme.palette.text.disabled,
    background: theme.palette.action.hover,
    pointerEvents: 'none',
    userSelect: 'none',
  },
}));
