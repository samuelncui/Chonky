import React, { UIEvent, useCallback, useContext, useMemo } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import { useChonkySelector } from '../../redux/store';

import { ChonkyActions } from '../../action-definitions/index';
import {
  selectCurrentFolder,
  selectFileViewConfig,
  selectGrouping,
  selectDisplayGroups,
  selectors,
} from '../../redux/selectors';
import { FileViewMode } from '../../types/file-view.types';
import { ChonkyIconName } from '../../types/icons.types';
import { useFileDrop } from '../../util/dnd';
import { ChonkyIconContext } from '../../util/icon-helper';
import { c, getStripeGradient, makeGlobalChonkyStyles, makeLocalChonkyStyles } from '../../util/styles';
import { FileListEmpty } from './FileListEmpty';
import { GridContainer } from './GridContainer';
import { GroupedListContainer } from './GroupedListContainer';
import { SparseGroupedListContainer } from './SparseGroupedListContainer';
import { ListContainer } from './ListContainer';

export interface FileListProps {
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  /** Optional content for an empty list, such as a loading or directory-read error state. */
  emptyPlaceholder?: React.ReactNode;
  /** Panel state, separate from file rows. Refreshing/paging preserve the current list. */
  loading?: 'initial' | 'refreshing' | 'more';
  loadingLabel?: string;
}

interface StyleState {
  dndCanDrop: boolean;
  dndIsOverCurrent: boolean;
}

export const FileList: React.FC<FileListProps> = React.memo((props: FileListProps) => {
  const displayFileIds = useChonkySelector(selectors.getDisplayFileIds);
  const viewConfig = useChonkySelector(selectFileViewConfig);

  const grouping = useChonkySelector(selectGrouping);
  const groups = useChonkySelector(selectDisplayGroups);
  const currentFolder = useChonkySelector(selectCurrentFolder);
  const { drop, dndCanDrop, dndIsOverCurrent } = useFileDrop({ file: currentFolder });
  const dropRef = useCallback(
    (element: HTMLDivElement | null) => {
      drop(element);
    },
    [drop],
  );
  const styleState = useMemo<StyleState>(() => ({ dndCanDrop, dndIsOverCurrent }), [dndCanDrop, dndIsOverCurrent]);

  const localClasses = useLocalStyles(styleState);
  const classes = useStyles(viewConfig);
  const { onScroll, emptyPlaceholder, loading, loadingLabel = 'Loading files' } = props;

  const list = useMemo(() => {
    if (loading === 'initial') return null;
    if (grouping?.sparse) {
      return grouping.sparse.totalCount > 0 ? (
        <SparseGroupedListContainer onScroll={onScroll} />
      ) : (
        (emptyPlaceholder ?? <FileListEmpty height={viewConfig.entryHeight} />)
      );
    }
    if (grouping && groups.length) return <GroupedListContainer onScroll={onScroll} />;
    if (displayFileIds.length === 0) return emptyPlaceholder ?? <FileListEmpty height={viewConfig.entryHeight} />;
    if (viewConfig.mode === FileViewMode.List) return <ListContainer onScroll={onScroll} />;
    return <GridContainer onScroll={onScroll} />;
  }, [
    displayFileIds.length,
    emptyPlaceholder,
    loading,
    onScroll,
    viewConfig.entryHeight,
    viewConfig.mode,
    grouping,
    groups.length,
  ]);

  const ChonkyIcon = useContext(ChonkyIconContext);
  return (
    <div
      ref={dropRef}
      className={c([classes.fileListWrapper, localClasses.fileListWrapper])}
      role="list"
      aria-busy={!!loading}
    >
      <div className={localClasses.dndDropZone}>
        <div className={localClasses.dndDropZoneIcon}>
          <ChonkyIcon icon={dndCanDrop ? ChonkyIconName.dndCanDrop : ChonkyIconName.dndCannotDrop} />
        </div>
      </div>
      {list}
      {loading && (
        <div className={loading === 'initial' ? classes.initialLoading : classes.refreshLoading}>
          <CircularProgress size={loading === 'initial' ? 24 : 16} aria-label={loadingLabel} />
        </div>
      )}
    </div>
  );
});
FileList.displayName = 'FileList';

const useLocalStyles = makeLocalChonkyStyles((theme) => ({
  fileListWrapper: {
    minHeight: ChonkyActions.EnableGridView.fileViewConfig.entryHeight + 2,
    position: 'relative',
    background: (state: StyleState) => {
      if (!state.dndIsOverCurrent) return 'none';
      if (state.dndCanDrop) {
        return getStripeGradient(theme.dnd.fileListCanDropMaskOne, theme.dnd.fileListCanDropMaskTwo);
      }
      return getStripeGradient(theme.dnd.fileListCannotDropMaskOne, theme.dnd.fileListCannotDropMaskTwo);
    },
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: -theme.margins.rootLayoutMargin,
      right: -theme.margins.rootLayoutMargin,
      borderTop: `solid 1px ${theme.palette.divider}`,
      pointerEvents: 'none',
      zIndex: 1,
    },
  },
  dndDropZone: {
    display: (state: StyleState) =>
      // When we cannot drop, we don't show an indicator at all
      state.dndIsOverCurrent && state.dndCanDrop ? 'block' : 'none',
    borderRadius: theme.gridFileEntry.borderRadius,
    pointerEvents: 'none',
    position: 'absolute',
    height: '100%',
    width: '100%',
    zIndex: 2,
  },
  dndDropZoneIcon: {
    backgroundColor: (state: StyleState) => (state.dndCanDrop ? theme.dnd.canDropMask : theme.dnd.cannotDropMask),
    color: (state: StyleState) => (state.dndCanDrop ? theme.dnd.canDropColor : theme.dnd.cannotDropColor),
    borderRadius: theme.gridFileEntry.borderRadius,
    transform: 'translateX(-50%) translateY(-50%)',
    position: 'absolute',
    textAlign: 'center',
    lineHeight: '60px',
    fontSize: '2em',
    left: '50%',
    height: 60,
    top: '50%',
    width: 60,
  },
}));

const useStyles = makeGlobalChonkyStyles(() => ({
  initialLoading: {
    height: '100%',
    display: 'grid',
    placeItems: 'center',
  },
  refreshLoading: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    pointerEvents: 'none',
  },
  fileListWrapper: {
    height: '100%',
    maxHeight: '100%',
  },
}));
