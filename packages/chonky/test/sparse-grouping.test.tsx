import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { createRef, forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileToolbar } from '../src/components/external/FileToolbar';
import { FileList } from '../src/components/file-list/FileList';
import { ChonkyActions, OptionIds } from '../src/action-definitions';
import { reduxActions, rootReducer } from '../src/redux/reducers';
import { getFileActionState, selectHiddenFileIdMap, selectSelectedFileIds, selectors } from '../src/redux/selectors';
import { thunkRequestFileAction } from '../src/redux/thunks/dispatchers.thunks';
import { FileAction } from '../src/types/action.types';
import { FileBrowserHandle } from '../src/types/file-browser.types';
import { SparseFileGrouping } from '../src/types/grouping.types';

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    const [position, setPosition] = useState(0);
    const start = Math.min(position, Math.max(props.totalCount - 4, 0));
    const end = Math.min(start + 3, props.totalCount - 1);
    const { rangeChanged } = props;
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    useEffect(() => {
      if (end >= start) rangeChanged?.({ startIndex: start, endIndex: end });
    }, [end, rangeChanged, start]);
    return (
      <div data-testid="virtual-list" data-total-count={props.totalCount}>
        <button type="button" onClick={() => setPosition(999_996)}>
          Jump
        </button>
        {Array.from({ length: Math.max(0, end - start + 1) }, (_, offset) => {
          const index = start + offset;
          return <React.Fragment key={props.computeItemKey(index)}>{props.itemContent(index)}</React.Fragment>;
        })}
      </div>
    );
  }),
}));

const files = [
  { id: 'near', name: 'Near' },
  { id: 'far', name: 'Far' },
];

describe('sparse grouped file lists', () => {
  it('renders distant loaded rows without materializing gaps and keeps placeholders inert', async () => {
    const near = { id: 'near-group', name: 'Near group', memberCount: 1 };
    const far = { id: 'far-group', name: 'Far group', memberCount: 1 };
    const onRangeChanged = vi.fn();
    const ref = createRef<FileBrowserHandle>();
    const grouping: SparseFileGrouping = {
      mode: 'continuous',
      sparse: {
        totalCount: 1_000_000,
        rows: [
          { index: 0, kind: 'group', group: near },
          { index: 1, kind: 'file', group: near, fileId: 'near' },
          { index: 999_998, kind: 'group', group: far },
          { index: 999_999, kind: 'file', group: far, fileId: 'far' },
        ],
        onRangeChanged,
        onToggleGroup: vi.fn(),
      },
    };
    const { container } = render(
      <FileBrowser ref={ref} files={files} grouping={grouping} disableDragAndDrop>
        <FileToolbar>
          <span data-testid="toolbar-extension">extension</span>
        </FileToolbar>
        <FileList />
      </FileBrowser>,
    );

    expect(screen.getByTestId('virtual-list').getAttribute('data-total-count')).toBe('1000000');
    expect(screen.getByText('1,000,000 rows')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Filter' })).toBeNull();
    expect(screen.getByTestId('toolbar-extension').textContent).toBe('extension');
    await waitFor(() => expect(onRangeChanged).toHaveBeenCalledWith(0, 3));
    expect(screen.getByRole('status').textContent).toBe('Loading files');
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(container.querySelectorAll('[data-chonky-sparse-placeholder]')).toHaveLength(2);
    expect(container.querySelector('[data-chonky-sparse-placeholder]')?.textContent).toBe('Loading…');
    fireEvent.click(container.querySelector('[data-chonky-sparse-placeholder]')!);
    expect(ref.current?.getFileSelection()).toEqual(new Set());

    fireEvent.click(screen.getByRole('button', { name: 'Jump' }));
    await waitFor(() => expect(onRangeChanged).toHaveBeenCalledWith(999_996, 999_999));
    expect(screen.getByRole('button', { name: 'Far group' })).toBeTruthy();
    expect(container.querySelector('[data-chonky-file-id="far"]')).toBeTruthy();
    expect(container.querySelector('[data-chonky-file-id="near"]')).toBeNull();
    expect(container.querySelectorAll('[data-chonky-sparse-placeholder]')).toHaveLength(2);
    fireEvent.click(container.querySelector('[data-chonky-sparse-placeholder]')!);
    expect(ref.current?.getFileSelection()).toEqual(new Set());
    fireEvent.click(container.querySelector('[data-chonky-file-id="far"]')!);
    expect(ref.current?.getFileSelection()).toEqual(new Set(['far']));
  });

  it('clears the single loading status when the visible placeholders load', async () => {
    const group = { id: 'near-group', name: 'Near group', memberCount: 1 };
    const onRangeChanged = vi.fn();
    const onToggleGroup = vi.fn();
    const { rerender } = render(
      <FileBrowser
        files={[]}
        grouping={{ mode: 'continuous', sparse: { totalCount: 2, rows: [], onRangeChanged, onToggleGroup } }}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Loading files'));

    rerender(
      <FileBrowser
        files={[files[0]]}
        grouping={{
          mode: 'continuous',
          sparse: {
            totalCount: 2,
            rows: [
              { index: 0, kind: 'group', group },
              { index: 1, kind: 'file', group, fileId: 'near' },
            ],
            onRangeChanged,
            onToggleGroup,
          },
        }}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('keeps caller-included hidden rows selectable even when Show hidden files is off', async () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    const group = { id: 'archive', name: 'Archive', memberCount: 1 };
    store.dispatch(reduxActions.setRawFiles([{ id: 'hidden', name: 'Hidden', isHidden: true }]));
    store.dispatch(
      reduxActions.setGrouping({
        mode: 'continuous',
        activeGroupId: 'archive',
        sparse: {
          totalCount: 2,
          rows: [
            { index: 0, kind: 'group', group },
            { index: 1, kind: 'file', group, fileId: 'hidden' },
          ],
          onRangeChanged: vi.fn(),
          onToggleGroup: vi.fn(),
        },
      }),
    );
    store.dispatch(reduxActions.setOptionDefaults({ [OptionIds.ShowHiddenFiles]: false }));
    store.dispatch(reduxActions.setFileActions([ChonkyActions.SelectAllFiles]));

    expect(selectHiddenFileIdMap(store.getState())).toHaveProperty('hidden');
    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['hidden']);
    await store.dispatch(thunkRequestFileAction(ChonkyActions.SelectAllFiles, undefined) as any);
    expect(selectSelectedFileIds(store.getState())).toEqual(['hidden']);
  });

  it('uses a loaded member for action state even without its header row', async () => {
    const action: FileAction = { id: 'loaded_action', button: { name: 'Loaded action', toolbar: true } };
    const handler = vi.fn();
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    const group = { id: 'archive', name: 'Archive', memberCount: 200 };
    store.dispatch(reduxActions.setRawFiles(files));
    store.dispatch(
      reduxActions.setGrouping({
        mode: 'continuous',
        sparse: {
          totalCount: 1000,
          rows: [{ index: 700, kind: 'file', group, fileId: 'far' }],
          onRangeChanged: vi.fn(),
          onToggleGroup: vi.fn(),
        },
      }),
    );
    store.dispatch(reduxActions.setFileActions([action]));
    store.dispatch(reduxActions.setExternalFileActionHandler(handler));
    store.dispatch(reduxActions.selectFiles({ fileIds: ['far'], reset: true }));
    store.dispatch(reduxActions.showContextMenu({ triggerFileId: 'far', mouseX: 0, mouseY: 0 }));

    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['far']);
    expect(getFileActionState(store.getState(), action, 'archive')).toMatchObject({
      selectedFiles: [{ id: 'far' }],
      contextMenuTriggerFile: { id: 'far' },
      group: { id: 'archive', fileIds: ['far'] },
    });
    await store.dispatch(thunkRequestFileAction(action, undefined, 'archive') as any);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ state: expect.objectContaining({ group: { id: 'archive', fileIds: ['far'] } }) }),
    );
    store.dispatch(reduxActions.selectAllFiles());
    expect(selectSelectedFileIds(store.getState())).toEqual(['far']);
  });

  it('selects only loaded members in a range spanning unloaded positions', async () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
    });
    const group = { id: 'archive', name: 'Archive', memberCount: 998 };
    store.dispatch(reduxActions.setRawFiles(files));
    store.dispatch(
      reduxActions.setGrouping({
        mode: 'continuous',
        sparse: {
          totalCount: 1000,
          rows: [
            { index: 1, kind: 'file', group, fileId: 'near' },
            { index: 999, kind: 'file', group, fileId: 'far' },
          ],
          onRangeChanged: vi.fn(),
          onToggleGroup: vi.fn(),
        },
      }),
    );
    store.dispatch(reduxActions.setFileActions([ChonkyActions.MouseClickFile]));
    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['near', 'far']);

    const click = (index: number, shiftKey: boolean) =>
      store.dispatch(
        thunkRequestFileAction(ChonkyActions.MouseClickFile, {
          clickType: 'single',
          file: files[index],
          fileDisplayIndex: index,
          altKey: false,
          ctrlKey: false,
          shiftKey,
        }) as any,
      );
    await click(0, false);
    await click(1, true);
    expect(selectSelectedFileIds(store.getState())).toEqual(['near', 'far']);
  });

  it('keeps header and toolbar actions scoped, then delegates collapse and clears selection', async () => {
    const ref = createRef<FileBrowserHandle>();
    const onFileAction = vi.fn();
    const onToggleGroup = vi.fn();
    const action: FileAction = {
      id: 'archive_action',
      requiresSelection: true,
      button: { name: 'Archive action', toolbar: true },
    };
    const group = { id: 'archive', name: 'Archive', memberCount: 200, actionIds: [action.id] };
    const grouping: SparseFileGrouping = {
      mode: 'continuous',
      sparse: {
        totalCount: 2,
        rows: [
          { index: 0, kind: 'group', group },
          { index: 1, kind: 'file', group, fileId: 'far' },
        ],
        onRangeChanged: vi.fn(),
        onToggleGroup,
      },
    };
    const { rerender } = render(
      <FileBrowser
        ref={ref}
        files={files}
        grouping={grouping}
        fileActions={[action]}
        onFileAction={onFileAction}
        disableDragAndDrop
      >
        <FileToolbar />
        <FileList />
      </FileBrowser>,
    );

    expect(screen.getByText('200 files')).toBeTruthy();
    act(() => ref.current?.setFileSelection(new Set(['far'])));
    const headerActions = screen.getByRole('group', { name: 'Archive actions' });
    fireEvent.click(within(headerActions).getByRole('button', { name: 'Archive action' }));
    await waitFor(() =>
      expect(onFileAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: action.id,
          state: expect.objectContaining({ group: { id: 'archive', fileIds: ['far'] } }),
        }),
      ),
    );
    const toolbarAction = screen
      .getAllByRole('button', { name: 'Archive action' })
      .find((button) => !headerActions.contains(button));
    fireEvent.click(toolbarAction!);
    await waitFor(() => expect(onFileAction.mock.calls.filter(([data]) => data.id === action.id)).toHaveLength(2));
    expect(ref.current?.getFileSelection()).toEqual(new Set(['far']));
    expect(screen.getByRole('button', { name: 'Archive' }).getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onToggleGroup).toHaveBeenCalledWith('archive');
    expect(ref.current?.getFileSelection()).toEqual(new Set());
    const collapsedGroup = { ...group, expanded: false };
    rerender(
      <FileBrowser
        ref={ref}
        files={files}
        grouping={{
          mode: 'continuous',
          sparse: {
            ...grouping.sparse,
            totalCount: 1,
            rows: [{ index: 0, kind: 'group', group: collapsedGroup }],
          },
        }}
        fileActions={[action]}
        onFileAction={onFileAction}
        disableDragAndDrop
      >
        <FileToolbar />
        <FileList />
      </FileBrowser>,
    );
    expect(screen.getByRole('button', { name: 'Archive' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Far')).toBeNull();
  });
});
