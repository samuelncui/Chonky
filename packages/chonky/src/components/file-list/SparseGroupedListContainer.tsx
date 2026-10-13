import React, { UIEvent, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { listComponents, useListContainerStyles } from './ListContainer';

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
  const sparse = grouping?.sparse;
  const rows = sparse?.rows;
  const onRangeChanged = sparse?.onRangeChanged;
  const handleRangeChanged = useCallback(
    ({ startIndex, endIndex }: ListRange) => {
      onRangeChanged?.(startIndex, endIndex);
    },
    [onRangeChanged],
  );
  const rowByIndex = useMemo(() => new Map(rows?.map((row) => [row.index, row])), [rows]);
  const displayIndexById = useMemo(() => new Map(displayFileIds.map((id, index) => [id, index])), [displayFileIds]);

  useEffect(() => {
    if (!reveal || reveal.handled) return;
    const row = rows?.find((candidate) => candidate.kind === 'file' && candidate.fileId === reveal.fileId);
    if (row) virtuoso.current?.scrollToIndex({ index: row.index, align: 'center' });
    dispatch(reduxActions.acknowledgeRevealFile(reveal.revision));
  }, [dispatch, reveal, rows]);

  if (!sparse) return null;
  return (
    <Virtuoso
      ref={virtuoso}
      className={classes.listContainer}
      components={listComponents}
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
          />
        );
      }}
    />
  );
};

const usePlaceholderStyles = makeLocalChonkyStyles((theme) => ({
  placeholder: {
    boxSizing: 'border-box',
    background: theme.palette.action.hover,
    pointerEvents: 'none',
    userSelect: 'none',
  },
}));
