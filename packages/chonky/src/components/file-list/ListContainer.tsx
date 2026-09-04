/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React, { CSSProperties, UIEvent, useCallback, useEffect, useRef } from 'react';
import { useChonkyDispatch, useChonkySelector } from '../../redux/store';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { reduxActions } from '../../redux/reducers';
import { selectFileViewConfig, selectRevealFileRequest, selectors } from '../../redux/selectors';
import { FileViewMode } from '../../types/file-view.types';
import { makeGlobalChonkyStyles } from '../../util/styles';
import { SmartFileEntry } from './FileEntry';

export interface FileListListProps {
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}

export const ListContainer: React.FC<FileListListProps> = React.memo(({ onScroll }) => {
  const classes = useStyles();
  const dispatch = useChonkyDispatch();
  const viewConfig = useChonkySelector(selectFileViewConfig);
  const displayFileIds = useChonkySelector(selectors.getDisplayFileIds);
  const revealFileRequest = useChonkySelector(selectRevealFileRequest);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useEffect(() => {
    if (!revealFileRequest || revealFileRequest.handled) return;
    const index = displayFileIds.indexOf(revealFileRequest.fileId);
    if (index >= 0) virtuosoRef.current?.scrollToIndex({ index, align: 'center' });
    dispatch(reduxActions.acknowledgeRevealFile(revealFileRequest.revision));
  }, [dispatch, displayFileIds, revealFileRequest]);

  const getFileId = useCallback((index: number) => displayFileIds[index] ?? null, [displayFileIds]);
  const getItemKey = useCallback((index: number) => getFileId(index) ?? `loading-file-${index}`, [getFileId]);
  const renderItem = useCallback(
    (index: number) => (
      <div style={{ height: viewConfig.entryHeight }}>
        <SmartFileEntry fileId={getFileId(index)} displayIndex={index} fileViewMode={FileViewMode.List} />
      </div>
    ),
    [getFileId, viewConfig.entryHeight],
  );

  return (
    <Virtuoso
      ref={virtuosoRef}
      className={classes.listContainer}
      style={containerStyle}
      totalCount={displayFileIds.length}
      fixedItemHeight={viewConfig.entryHeight}
      computeItemKey={getItemKey}
      itemContent={renderItem}
      onScroll={onScroll}
    />
  );
});

const containerStyle: CSSProperties = {
  height: '100%',
};

const useStyles = makeGlobalChonkyStyles((theme) => ({
  listContainer: {
    width: `calc(100% + ${theme.margins.rootLayoutMargin * 2}px)`,
    marginLeft: -theme.margins.rootLayoutMargin,
  },
}));
