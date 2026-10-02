import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { ChonkyActions } from '../src/action-definitions';
import { reduxActions } from '../src/redux/reducers';
import { useChonkyReduxStore } from '../src/redux/store';
import { ChonkyDndFileEntryItem, ChonkyDndFileEntryType } from '../src/types/dnd.types';
import { FileData } from '../src/types/file.types';
import { useDndHoverOpen, useFileDrag, useFileDrop } from '../src/util/dnd';

const { dragSpec, dropSpec } = vi.hoisted(() => ({
  dragSpec: { current: null as any },
  dropSpec: { current: null as any },
}));
vi.mock('../src/util/dnd-fallback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../src/util/dnd-fallback')>()),
  useDragIfAvailable: (spec: any) => {
    dragSpec.current = spec;
    return [{ isDragging: false }, () => null, () => null];
  },
  useDropIfAvailable: (spec: any) => {
    dropSpec.current = spec;
    return [{ isOver: false, isOverCurrent: false, canDrop: false }, () => null];
  },
}));

describe('drag payloads', () => {
  it.each([true, false])(
    'drags the unselected file instead of the old selection (selectable %s)',
    async (selectable) => {
      const oldSelection = { id: 'old', name: 'Destination', isDir: true };
      const draggedFile = { id: 'new', name: 'New.txt', selectable };
      const destination = oldSelection;
      const onFileAction = vi.fn();
      const { result } = renderHook(
        () => {
          useFileDrag(draggedFile);
          return useChonkyReduxStore();
        },
        {
          wrapper: ({ children }) => (
            <FileBrowser files={[oldSelection, draggedFile]} onFileAction={onFileAction} disableDragAndDropProvider>
              {children}
            </FileBrowser>
          ),
        },
      );
      act(() => result.current.dispatch(reduxActions.selectFiles({ fileIds: ['old'], reset: true })));
      let item!: ChonkyDndFileEntryItem;
      await act(async () => {
        item = dragSpec.current.item();
      });
      await act(async () => {
        dragSpec.current.end(item, { getDropResult: () => ({ dropTarget: destination, dropEffect: 'move' }) });
      });
      await waitFor(() =>
        expect(onFileAction).toHaveBeenCalledWith(
          expect.objectContaining({
            id: ChonkyActions.MoveFiles.id,
            payload: expect.objectContaining({ files: [draggedFile], destination }),
          }),
        ),
      );
    },
  );

  it('preserves a multiselection when dragging one of its members', async () => {
    const files: FileData[] = [
      { id: 'a', name: 'A.txt' },
      { id: 'b', name: 'B.txt' },
    ];
    const { result } = renderHook(
      () => {
        useFileDrag(files[0]);
        return useChonkyReduxStore();
      },
      {
        wrapper: ({ children }) => (
          <FileBrowser files={files} disableDragAndDropProvider>
            {children}
          </FileBrowser>
        ),
      },
    );
    act(() => result.current.dispatch(reduxActions.selectFiles({ fileIds: ['a', 'b'], reset: true })));
    let item!: ChonkyDndFileEntryItem;
    await act(async () => {
      item = dragSpec.current.item();
    });
    expect(item.payload.selectedFiles).toEqual(files);
  });

  it('respects changing drag permissions with an available drag hook', () => {
    const file: FileData = { id: 'file', name: 'File.txt' };
    let disabled = false;
    const { rerender } = renderHook(({ file }) => useFileDrag(file), {
      initialProps: { file },
      wrapper: ({ children }) => (
        <FileBrowser files={[file]} disableDragAndDrop={disabled} disableDragAndDropProvider>
          {children}
        </FileBrowser>
      ),
    });
    expect(dragSpec.current.canDrag()).toBe(true);
    disabled = true;
    rerender({ file });
    expect(dragSpec.current.canDrag()).toBe(false);
    disabled = false;
    rerender({ file: { ...file, draggable: false } });
    expect(dragSpec.current.canDrag()).toBe(false);
    rerender({ file });
    expect(dragSpec.current.canDrag()).toBe(true);
  });

  it('leaves non-draggable selected files out of the drag and move payloads', async () => {
    const files: FileData[] = [
      { id: 'a', name: 'A.txt' },
      { id: 'b', name: 'B.txt', draggable: false },
      { id: 'c', name: 'C.txt' },
    ];
    const destination = { id: 'destination', name: 'Destination', isDir: true };
    const onFileAction = vi.fn();
    const { result } = renderHook(
      () => {
        useFileDrag(files[0]);
        return useChonkyReduxStore();
      },
      {
        wrapper: ({ children }) => (
          <FileBrowser files={files} onFileAction={onFileAction} disableDragAndDropProvider>
            {children}
          </FileBrowser>
        ),
      },
    );
    act(() => result.current.dispatch(reduxActions.selectFiles({ fileIds: ['a', 'b', 'c'], reset: true })));
    let item!: ChonkyDndFileEntryItem;
    await act(async () => {
      item = dragSpec.current.item();
    });
    expect(item.payload.selectedFiles).toEqual([files[0], files[2]]);
    await act(async () => {
      dragSpec.current.end(item, { getDropResult: () => ({ dropTarget: destination, dropEffect: 'move' }) });
    });
    expect(onFileAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ChonkyActions.MoveFiles.id,
        payload: expect.objectContaining({ files: [files[0], files[2]], destination }),
      }),
    );
    expect(Object.keys(result.current.getState().selectionMap)).toEqual(['a', 'b', 'c']);
  });

  it('does not move files when the source browser disables DnD during a drag', async () => {
    const file = { id: 'file', name: 'File.txt' };
    const destination = { id: 'destination', name: 'Destination', isDir: true };
    const onFileAction = vi.fn();
    let disabled = false;
    const { rerender } = renderHook(() => useFileDrag(file), {
      wrapper: ({ children }) => (
        <FileBrowser
          files={[file]}
          onFileAction={onFileAction}
          disableDragAndDrop={disabled}
          disableDragAndDropProvider
        >
          {children}
        </FileBrowser>
      ),
    });
    let item!: ChonkyDndFileEntryItem;
    await act(async () => {
      item = dragSpec.current.item();
    });
    disabled = true;
    rerender();
    await act(async () => {
      dragSpec.current.end(item, { getDropResult: () => ({ dropTarget: destination, dropEffect: 'move' }) });
    });
    expect(onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.MoveFiles.id)).toHaveLength(0);
  });

  it.each([true, false])('respects disableDragAndDrop %s with an available drop hook', (disabled) => {
    const file = { id: 'destination', name: 'Destination', isDir: true };
    const item: ChonkyDndFileEntryItem = {
      type: ChonkyDndFileEntryType,
      payload: {
        sourceInstanceId: 'source',
        source: { id: 'source', name: 'Source', isDir: true },
        draggedFile: { id: 'file', name: 'File.txt' },
        selectedFiles: [],
      },
    };
    const monitor = { isOver: () => true };
    renderHook(() => useFileDrop({ file }), {
      wrapper: ({ children }) => (
        <FileBrowser files={[]} disableDragAndDrop={disabled} disableDragAndDropProvider>
          {children}
        </FileBrowser>
      ),
    });
    expect(dropSpec.current.canDrop(item, monitor)).toBe(!disabled);
  });

  it.each([true, false])('respects disableDragAndDrop %s when hovering a folder', async (disabled) => {
    vi.useFakeTimers();
    try {
      const file = { id: 'destination', name: 'Destination', isDir: true };
      const onFileAction = vi.fn();
      renderHook(() => useDndHoverOpen(file, { dndIsOver: true, dndCanDrop: false, dndIsDragging: false }), {
        wrapper: ({ children }) => (
          <FileBrowser files={[]} onFileAction={onFileAction} disableDragAndDrop={disabled} disableDragAndDropProvider>
            {children}
          </FileBrowser>
        ),
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });
      const opens = onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.OpenFiles.id);
      expect(opens).toHaveLength(disabled ? 0 : 1);
    } finally {
      vi.useRealTimers();
    }
  });
});
