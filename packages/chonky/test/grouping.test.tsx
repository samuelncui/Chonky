import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileList } from '../src/components/file-list/FileList';
import { ChonkyActions } from '../src/action-definitions';
import { CustomVisibilityState, FileAction } from '../src/types/action.types';
import { FileGrouping } from '../src/types/grouping.types';
import { reduxActions, rootReducer } from '../src/redux/reducers';
import {
  getFileActionState,
  selectDisplayGroups,
  selectExpandedGroups,
  selectSelectedFileIds,
  selectors,
} from '../src/redux/selectors';
import { thunkRequestFileAction } from '../src/redux/thunks/dispatchers.thunks';

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return (
      <div data-testid="virtual-list" data-total-count={props.totalCount}>
        {Array.from({ length: props.totalCount }, (_, index) => (
          <React.Fragment key={props.computeItemKey(index)}>{props.itemContent(index)}</React.Fragment>
        ))}
      </div>
    );
  }),
  VirtuosoGrid: forwardRef((_props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return <div data-testid="virtual-grid" />;
  }),
}));

const files = [
  { id: 'source-z', name: 'Zebra' },
  { id: 'archive-b', name: 'Beta' },
  { id: 'source-a', name: 'Alpha' },
  { id: 'archive-a', name: 'Aardvark' },
];

const grouping: FileGrouping = {
  groups: [
    { id: 'archive', name: 'Archive', fileIds: ['archive-b', 'archive-a'] },
    { id: 'source', name: 'Source', fileIds: ['source-z', 'source-a'] },
  ],
};

const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

const setFilesAndGrouping = (store: ReturnType<typeof makeStore>, configuredGrouping = grouping) => {
  store.dispatch(reduxActions.setRawFiles(files));
  store.dispatch(reduxActions.setGrouping(configuredGrouping));
};

const clickFile = (store: ReturnType<typeof makeStore>, fileId: string, index: number, modifiers = {}) => {
  const file = files.find((candidate) => candidate.id === fileId)!;
  return store.dispatch(
    thunkRequestFileAction(ChonkyActions.MouseClickFile, {
      clickType: 'single',
      file,
      fileDisplayIndex: index,
      altKey: false,
      ctrlKey: false,
      shiftKey: false,
      ...modifiers,
    }) as any,
  );
};

describe('grouped file lists', () => {
  it('keeps caller group order while sorting and filtering only each group’s members', () => {
    let state = rootReducer(undefined, reduxActions.setRawFiles(files));
    state = rootReducer(state, reduxActions.setGrouping(grouping));
    state = rootReducer(state, reduxActions.setFileActions([ChonkyActions.SortFilesByName]));
    state = rootReducer(
      state,
      reduxActions.setSort({ actionId: ChonkyActions.SortFilesByName.id, order: 'asc' as any }),
    );

    expect(selectDisplayGroups(state).map((group) => [group.id, group.fileIds])).toEqual([
      ['archive', ['archive-a', 'archive-b']],
      ['source', ['source-a', 'source-z']],
    ]);
    expect(selectors.getDisplayFileIds(state)).toEqual(['archive-a', 'archive-b', 'source-a', 'source-z']);

    state = rootReducer(state, reduxActions.setSearchString('alpha'));
    expect(selectDisplayGroups(state).map((group) => [group.id, group.fileIds])).toEqual([['source', ['source-a']]]);
    expect(selectors.getDisplayFileIds(state)).toEqual(['source-a']);
  });

  it('uses only file positions for selection, clears the old group and range anchor on a cross-group shift click', () => {
    const store = makeStore();
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([ChonkyActions.MouseClickFile]));

    clickFile(store, 'archive-a', 1);
    expect(selectSelectedFileIds(store.getState())).toEqual(['archive-a']);
    expect(store.getState().lastClick).toEqual({ fileId: 'archive-a', index: 1 });

    clickFile(store, 'source-a', 3, { shiftKey: true });
    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['archive-b', 'archive-a', 'source-z', 'source-a']);
    expect(selectSelectedFileIds(store.getState())).toEqual(['source-a']);
    expect(store.getState().activeGroupId).toBe('source');
    expect(store.getState().lastClick).toEqual({ fileId: 'source-a', index: 3 });
  });

  it('selects an ordinary range within one expanded group', () => {
    const store = makeStore();
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([ChonkyActions.MouseClickFile]));

    clickFile(store, 'archive-b', 0);
    clickFile(store, 'archive-a', 1, { shiftKey: true });
    expect(selectSelectedFileIds(store.getState())).toEqual(['archive-b', 'archive-a']);
    expect(store.getState().lastClick).toEqual({ fileId: 'archive-b', index: 0 });
  });

  it('allows Ctrl multiselect only within the active group', () => {
    const store = makeStore();
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([ChonkyActions.MouseClickFile]));

    clickFile(store, 'archive-a', 1);
    clickFile(store, 'archive-b', 0, { ctrlKey: true });
    expect(selectSelectedFileIds(store.getState()).sort()).toEqual(['archive-a', 'archive-b']);

    clickFile(store, 'source-a', 3, { ctrlKey: true });
    expect(selectSelectedFileIds(store.getState())).toEqual(['source-a']);
  });

  it('selects all only in an active group and never when no group is active', async () => {
    const store = makeStore();
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([ChonkyActions.SelectAllFiles]));

    await store.dispatch(thunkRequestFileAction(ChonkyActions.SelectAllFiles, undefined) as any);
    expect(selectSelectedFileIds(store.getState())).toEqual([]);

    store.dispatch(reduxActions.activateGroup('archive'));
    await store.dispatch(thunkRequestFileAction(ChonkyActions.SelectAllFiles, undefined) as any);
    expect(selectSelectedFileIds(store.getState()).sort()).toEqual(['archive-a', 'archive-b']);
  });

  it('keeps a reducer or ref-style selection in the first selected group', () => {
    const store = makeStore();
    setFilesAndGrouping(store);

    store.dispatch(reduxActions.selectFiles({ fileIds: ['source-a', 'archive-a'], reset: true }));
    expect(store.getState().activeGroupId).toBe('source');
    expect(selectSelectedFileIds(store.getState())).toEqual(['source-a']);
  });

  it('scopes group actions to that group, preserves the payload, and removes deleted selections', async () => {
    const store = makeStore();
    const handler = vi.fn();
    const action: FileAction = { id: 'header_action', button: { name: 'Header action', toolbar: true } };
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([action]));
    store.dispatch(reduxActions.setExternalFileActionHandler(handler));
    store.dispatch(reduxActions.selectFiles({ fileIds: ['archive-a'], reset: true }));

    const payload = { source: 'header' };
    await store.dispatch(thunkRequestFileAction(action, payload, 'archive') as any);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'header_action',
        payload,
        state: expect.objectContaining({
          selectedFiles: [expect.objectContaining({ id: 'archive-a' })],
          group: { id: 'archive', fileIds: ['archive-b', 'archive-a'] },
        }),
      }),
    );

    store.dispatch(reduxActions.setRawFiles(files.filter((file) => file.id !== 'archive-a')));
    expect(selectSelectedFileIds(store.getState())).toEqual([]);
    expect(getFileActionState(store.getState(), action, 'archive').group).toEqual({
      id: 'archive',
      fileIds: ['archive-b'],
    });
  });

  it('keeps filtered-out members in group context and never inherits a different group’s selection', async () => {
    const store = makeStore();
    const handler = vi.fn();
    const action: FileAction = {
      id: 'filtered_header_action',
      fileFilter: (file) => file?.id === 'archive-b',
      button: { name: 'Filtered header action', toolbar: true },
    };
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([action]));
    store.dispatch(reduxActions.setExternalFileActionHandler(handler));
    store.dispatch(reduxActions.selectFiles({ fileIds: ['archive-b', 'archive-a'], reset: true }));
    store.dispatch(reduxActions.setSearchString('aardvark'));

    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['archive-a']);
    await store.dispatch(thunkRequestFileAction(action, undefined, 'archive') as any);
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          selectedFilesForAction: [expect.objectContaining({ id: 'archive-b' })],
          group: { id: 'archive', fileIds: ['archive-b', 'archive-a'] },
        }),
      }),
    );

    await store.dispatch(thunkRequestFileAction(action, undefined, 'source') as any);
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          selectedFiles: [],
          selectedFilesForAction: [],
          group: { id: 'source', fileIds: ['source-z', 'source-a'] },
        }),
      }),
    );
  });

  it('does not dispatch an action whose visibility disables it, including direct requests', async () => {
    const store = makeStore();
    const handler = vi.fn();
    const action: FileAction = {
      id: 'disabled_header_action',
      customVisibility: () => CustomVisibilityState.Disabled,
      button: { name: 'Disabled action', toolbar: true },
    };
    setFilesAndGrouping(store);
    store.dispatch(reduxActions.setFileActions([action]));
    store.dispatch(reduxActions.setExternalFileActionHandler(handler));

    await store.dispatch(thunkRequestFileAction(action, { ignored: true }, 'archive') as any);
    expect(handler).not.toHaveBeenCalled();
    expect(store.getState().activeGroupId).toBeUndefined();
  });

  it('dispatches a zero-selection header action against another single group without changing the open group', async () => {
    const store = makeStore();
    const handler = vi.fn();
    const action: FileAction = {
      id: 'single_group_header_action',
      button: { name: 'Single group action', toolbar: true },
    };
    setFilesAndGrouping(store, { ...grouping, mode: 'single', activeGroupId: 'archive' });
    store.dispatch(reduxActions.setFileActions([action]));
    store.dispatch(reduxActions.setExternalFileActionHandler(handler));

    await store.dispatch(thunkRequestFileAction(action, undefined, 'source') as any);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        state: expect.objectContaining({
          selectedFiles: [],
          group: { id: 'source', fileIds: ['source-z', 'source-a'] },
        }),
      }),
    );
    expect(store.getState().activeGroupId).toBe('archive');
    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['archive-b', 'archive-a']);
  });

  it('collapses continuous and single groups without putting headers in the display rows', () => {
    let state = rootReducer(undefined, reduxActions.setRawFiles(files));
    state = rootReducer(state, reduxActions.setGrouping(grouping));
    state = rootReducer(state, reduxActions.toggleGroup('archive'));
    expect(selectExpandedGroups(state).find((group) => group.id === 'archive')?.expanded).toBe(false);
    expect(selectors.getDisplayFileIds(state)).toEqual(['source-z', 'source-a']);

    state = rootReducer(state, reduxActions.toggleGroup('source'));
    expect(selectors.getDisplayFileIds(state)).toEqual([]);

    state = rootReducer(state, reduxActions.setGrouping({ ...grouping, mode: 'single', activeGroupId: 'archive' }));
    expect(selectors.getDisplayFileIds(state)).toEqual(['archive-b', 'archive-a']);
    state = rootReducer(state, reduxActions.toggleGroup('archive'));
    expect(selectors.getDisplayFileIds(state)).toEqual([]);
  });

  it('renders header actions as disabled or hidden and clicking an enabled action does not collapse its group', async () => {
    const onFileAction = vi.fn();
    const disabledAction: FileAction = {
      id: 'disabled_action',
      customVisibility: () => CustomVisibilityState.Disabled,
      button: { name: 'Disabled header action', toolbar: true },
    };
    const hiddenAction: FileAction = {
      id: 'hidden_action',
      customVisibility: () => CustomVisibilityState.Hidden,
      button: { name: 'Hidden header action', toolbar: true },
    };
    const enabledAction: FileAction = {
      id: 'enabled_action',
      button: { name: 'Enabled header action', toolbar: true },
    };
    render(
      <FileBrowser
        files={files}
        grouping={{ ...grouping, actionIds: [disabledAction.id, hiddenAction.id, enabledAction.id] }}
        fileActions={[disabledAction, hiddenAction, enabledAction]}
        onFileAction={onFileAction}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );

    const archiveToggle = await screen.findByRole('button', { name: 'Archive' });
    for (const button of screen.getAllByRole('button', { name: 'Disabled header action' })) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    expect(screen.queryAllByRole('button', { name: 'Hidden header action' })).toHaveLength(0);
    expect(archiveToggle.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(screen.getAllByRole('button', { name: 'Enabled header action' })[0]);
    await waitFor(() =>
      expect(onFileAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'enabled_action',
          state: expect.objectContaining({ group: expect.objectContaining({ id: 'archive' }) }),
        }),
      ),
    );
    expect(archiveToggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('notifies the controlled grouping callback when ref selection activates a group', async () => {
    const ref = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    const onGroupChange = vi.fn();
    render(
      <FileBrowser ref={ref} files={files} grouping={{ ...grouping, onGroupChange }} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );

    await screen.findByRole('button', { name: 'Archive' });
    ref.current?.setFileSelection(new Set(['archive-a']));
    await waitFor(() => expect(onGroupChange).toHaveBeenLastCalledWith('archive'));
    ref.current?.setFileSelection(new Set(['source-a']));
    await waitFor(() => expect(onGroupChange).toHaveBeenLastCalledWith('source'));
  });
});
