/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React, { CSSProperties, UIEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChonkyDispatch, useChonkySelector } from '../../redux/store';
import { VirtuosoGrid, VirtuosoGridHandle } from 'react-virtuoso';

import { reduxActions } from '../../redux/reducers';
import { selectFileViewConfig, selectRevealFileRequest, selectors } from '../../redux/selectors';
import { FileViewConfigGrid } from '../../types/file-view.types';
import { makeGlobalChonkyStyles, useIsMobileBreakpoint } from '../../util/styles';
import { SmartFileEntry } from './FileEntry';

export interface FileListGridProps {
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}

interface StyleState {
  entryHeight: number;
  entryWidth: number;
  gutter: number;
  mobile: boolean;
}

export const GridContainer: React.FC<FileListGridProps> = React.memo(({ onScroll }) => {
  const dispatch = useChonkyDispatch();
  const viewConfig = useChonkySelector(selectFileViewConfig) as FileViewConfigGrid;
  const displayFileIds = useChonkySelector(selectors.getDisplayFileIds);
  const revealFileRequest = useChonkySelector(selectRevealFileRequest);
  const virtuosoRef = useRef<VirtuosoGridHandle>(null);

  useEffect(() => {
    if (!revealFileRequest || revealFileRequest.handled) return;
    const index = displayFileIds.indexOf(revealFileRequest.fileId);
    if (index >= 0) virtuosoRef.current?.scrollToIndex({ index, align: 'center' });
    dispatch(reduxActions.acknowledgeRevealFile(revealFileRequest.revision));
  }, [dispatch, displayFileIds, revealFileRequest]);

  const getFileId = useCallback((index: number) => displayFileIds[index] ?? null, [displayFileIds]);
  const getItemKey = useCallback((index: number) => getFileId(index) ?? `loading-file-${index}`, [getFileId]);
  const renderItem = useCallback(
    (index: number) => <SmartFileEntry fileId={getFileId(index)} displayIndex={index} fileViewMode={viewConfig.mode} />,
    [getFileId, viewConfig.mode],
  );

  const mobile = useIsMobileBreakpoint();
  const styleState = useMemo<StyleState>(
    () => ({
      entryHeight: viewConfig.entryHeight,
      entryWidth: viewConfig.entryWidth,
      gutter: mobile ? 5 : 8,
      mobile,
    }),
    [mobile, viewConfig.entryHeight, viewConfig.entryWidth],
  );
  const classes = useStyles(styleState);

  return (
    <VirtuosoGrid
      ref={virtuosoRef}
      className={classes.gridContainer}
      listClassName={classes.gridList}
      itemClassName={classes.gridItem}
      style={containerStyle}
      totalCount={displayFileIds.length}
      computeItemKey={getItemKey}
      itemContent={renderItem}
      onScroll={onScroll}
    />
  );
});

const containerStyle: CSSProperties = {
  height: '100%',
  width: '100%',
};

const useStyles = makeGlobalChonkyStyles(() => ({
  gridContainer: {},
  gridList: {
    alignContent: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
  },
  gridItem: {
    boxSizing: 'border-box',
    height: ({ entryHeight, gutter }: StyleState) => entryHeight + gutter,
    paddingBottom: ({ gutter }: StyleState) => gutter,
    paddingRight: ({ gutter }: StyleState) => gutter,
    width: ({ entryWidth, gutter, mobile }: StyleState) => (mobile ? '50%' : entryWidth + gutter),
  },
}));
