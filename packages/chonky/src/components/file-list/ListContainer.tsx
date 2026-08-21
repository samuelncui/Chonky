/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React, { CSSProperties, UIEvent, useCallback } from 'react';
import { useChonkySelector } from '../../redux/store';
import { Virtuoso } from 'react-virtuoso';

import { selectFileViewConfig, selectors } from '../../redux/selectors';
import { FileViewMode } from '../../types/file-view.types';
import { SmartFileEntry } from './FileEntry';

export interface FileListListProps {
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}

export const ListContainer: React.FC<FileListListProps> = React.memo(({ onScroll }) => {
  const viewConfig = useChonkySelector(selectFileViewConfig);
  const displayFileIds = useChonkySelector(selectors.getDisplayFileIds);

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
  width: '100%',
};
