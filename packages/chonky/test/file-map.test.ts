import { act, renderHook } from '@testing-library/react';

import { ChonkyActions, fileMap } from '../src';

const baseFileMap: fileMap.CustomFileMap<fileMap.CustomFileData> = {
  root: { id: 'root', name: 'Root', isDir: true, childrenIds: ['source', 'destination'], childrenCount: 2 },
  source: { id: 'source', name: 'Source', isDir: true, parentId: 'root', childrenIds: ['file'], childrenCount: 1 },
  destination: {
    id: 'destination',
    name: 'Destination',
    isDir: true,
    parentId: 'root',
    childrenIds: [],
    childrenCount: 0,
  },
  file: { id: 'file', name: 'File.txt', parentId: 'source' },
};

describe('fileMap.useFileMap', () => {
  it('opens the target folder through its action handler and resets navigation', () => {
    const { result } = renderHook(() => fileMap.useFileMap({ baseFileMap, initialFolderId: 'source' }));
    expect(result.current.data.files).toEqual([baseFileMap.file]);
    expect(result.current.data.folderChain.map((file) => file?.id)).toEqual(['root', 'source']);

    act(() =>
      result.current.fileActionHandler({
        id: ChonkyActions.OpenFiles.id,
        action: ChonkyActions.OpenFiles,
        payload: { targetFile: baseFileMap.destination, files: [baseFileMap.file] },
        state: { instanceId: 'file-map', selectedFiles: [], selectedFilesForAction: [], contextMenuTriggerFile: null },
      }),
    );
    expect(result.current.data.currentFolderId).toBe('destination');
    expect(result.current.data.files).toEqual([]);
    expect(result.current.data.folderChain.map((file) => file?.id)).toEqual(['root', 'destination']);

    act(() => result.current.methods.resetFileMap());
    expect(result.current.data.currentFolderId).toBe('source');
    expect(result.current.data.files).toEqual([baseFileMap.file]);
  });

  it('moves files and updates folder membership without mutating the caller map, then resets', () => {
    const { result } = renderHook(() => fileMap.useFileMap({ baseFileMap, initialFolderId: 'source' }));
    act(() =>
      result.current.fileActionHandler({
        id: ChonkyActions.MoveFiles.id,
        action: ChonkyActions.MoveFiles,
        payload: { files: [baseFileMap.file], source: baseFileMap.source, destination: baseFileMap.destination },
        state: {
          instanceId: 'file-map',
          selectedFiles: [baseFileMap.file],
          selectedFilesForAction: [baseFileMap.file],
          contextMenuTriggerFile: null,
        },
      }),
    );
    expect(result.current.data.files).toEqual([]);
    expect(result.current.data.fileMap.source.childrenCount).toBe(0);
    expect(result.current.data.fileMap.destination.childrenIds).toEqual(['file']);
    expect(result.current.data.fileMap.destination.childrenCount).toBe(1);
    expect(result.current.data.fileMap.file.parentId).toBe('destination');
    expect(baseFileMap.source.childrenIds).toEqual(['file']);
    expect(baseFileMap.destination.childrenIds).toEqual([]);
    expect(baseFileMap.file.parentId).toBe('source');

    act(() => result.current.methods.setCurrentFolderId('destination'));
    expect(result.current.data.files.map((file) => file?.id)).toEqual(['file']);
    expect(result.current.data.folderChain.map((file) => file?.id)).toEqual(['root', 'destination']);
    act(() => result.current.methods.resetFileMap());
    expect(result.current.data.currentFolderId).toBe('source');
    expect(result.current.data.files).toEqual([baseFileMap.file]);
    expect(result.current.data.fileMap.destination.childrenIds).toEqual([]);
  });
});

it('settles queued moves against current membership and preserves current file metadata', () => {
  const map: fileMap.CustomFileMap<fileMap.CustomFileData> = {
    ...baseFileMap,
    source: { ...baseFileMap.source, childrenIds: ['file', 'other'], childrenCount: 2 },
    other: { id: 'other', name: 'Other', parentId: 'source' },
  };
  const { result } = renderHook(() => fileMap.useFileMap({ baseFileMap: map, initialFolderId: 'source' }));
  act(() => {
    result.current.methods.setFileMap((current) => ({
      ...current,
      file: { ...current.file, name: 'Renamed.txt', size: 42 },
    }));
    result.current.methods.moveFiles([map.file], map.source, map.destination);
    result.current.methods.moveFiles([map.other], map.source, map.destination);
  });
  expect(result.current.data.fileMap.source.childrenIds).toEqual([]);
  expect(result.current.data.fileMap.source.childrenCount).toBe(0);
  expect(result.current.data.fileMap.destination.childrenIds).toEqual(['file', 'other']);
  expect(result.current.data.fileMap.destination.childrenCount).toBe(2);
  expect(result.current.data.fileMap.file).toMatchObject({ name: 'Renamed.txt', size: 42, parentId: 'destination' });
  expect(result.current.data.fileMap.other.parentId).toBe('destination');
  act(() => result.current.methods.moveFiles([map.file], map.source, map.destination));
  expect(result.current.data.fileMap.destination.childrenIds).toEqual(['file', 'other']);
});
