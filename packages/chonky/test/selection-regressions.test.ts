import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import { ChonkyActions } from '../src';
import { reduxActions, rootReducer } from '../src/redux/reducers';
import { selectors, selectDisplayGroups, selectSelectedFileIds } from '../src/redux/selectors';
import { thunkUpdateRawFileActions } from '../src/redux/thunks/file-actions.thunks';
import { thunkRequestFileAction } from '../src/redux/thunks/dispatchers.thunks';
import { SortOrder } from '../src/types/sort.types';
import { SparseFileRow } from '../src/types/grouping.types';

const makeStore = () =>
  configureStore({ reducer: rootReducer, middleware: (get) => get({ serializableCheck: false }) });
const group = { id: '__proto__', name: 'Group', memberCount: 999_999 };
const row = (id: string, index: number): SparseFileRow => ({ kind: 'file', fileId: id, index, group });
const grouping = (rows: SparseFileRow[]) => ({
  mode: 'continuous' as const,
  sparse: { totalCount: 1_000_000, rows, onRangeChanged: vi.fn(), onToggleGroup: vi.fn() },
});

it('retains a sparse range anchor by ID across preceding loads and evictions, but resets reordered anchors', async () => {
  const store = makeStore();
  const files = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
  store.dispatch(reduxActions.setRawFiles(files));
  store.dispatch(reduxActions.setFileActions([ChonkyActions.MouseClickFile]));
  store.dispatch(reduxActions.setGrouping(grouping([row('c', 900_000)])));
  const click = (id: string, shiftKey = false) =>
    store.dispatch(
      thunkRequestFileAction(ChonkyActions.MouseClickFile, {
        clickType: 'single',
        file: files.find((file) => file.id === id)!,
        fileDisplayIndex: selectors.getDisplayFileIds(store.getState()).indexOf(id),
        shiftKey,
        ctrlKey: false,
        altKey: false,
      }) as any,
    );
  await click('c');
  store.dispatch(reduxActions.setGrouping(grouping([row('a', 1), row('b', 500_000), row('c', 900_000)])));
  await click('a', true);
  expect(new Set(selectSelectedFileIds(store.getState()))).toEqual(new Set(['a', 'b', 'c']));
  store.dispatch(reduxActions.setGrouping(grouping([row('b', 500_000), row('c', 900_000)])));
  expect(selectors.getLastClickIndex(store.getState())).toBe(1);
  store.dispatch(reduxActions.setGrouping(grouping([row('b', 500_000)])));
  expect(selectors.getLastClickIndex(store.getState())).toBeNull();
  store.dispatch(reduxActions.setGrouping(grouping([row('b', 500_000), row('c', 800_000)])));
  expect(selectors.getLastClickIndex(store.getState())).toBeNull();
  await click('b');
  store.dispatch(reduxActions.setSort({ actionId: 'sort', order: SortOrder.DESC }));
  expect(selectors.getLastClickIndex(store.getState())).toBeNull();
  await click('b');
  store.dispatch(reduxActions.activateGroup('different'));
  expect(selectors.getLastClickIndex(store.getState())).toBeNull();
});

it('does no ordinary sort or search for sparse cache-only changes', () => {
  const store = makeStore();
  const sortKeySelector = vi.fn((file) => file?.name);
  store.dispatch(reduxActions.setFileActions([{ id: 'sort', sortKeySelector }]));
  store.dispatch(reduxActions.setSort({ actionId: 'sort', order: SortOrder.ASC }));
  store.dispatch(reduxActions.setGrouping(grouping([row('c', 900_000)])));
  for (let index = 0; index < 10; index++) {
    store.dispatch(
      reduxActions.setRawFiles([
        { id: 'c', name: 'c' },
        { id: 'a', name: 'a' },
      ]),
    );
    store.dispatch(reduxActions.setGrouping(grouping([row('c', 900_000), row('a', index)])));
    expect(selectors.getDisplayFileIds(store.getState())).toEqual(['a', 'c']);
    expect(selectDisplayGroups(store.getState())).toEqual([]);
  }
  expect(sortKeySelector).not.toHaveBeenCalled();
});

it('treats prototype names as ordinary file and group IDs through filtering, selection and collapse', () => {
  const store = makeStore();
  const ids = ['constructor', 'toString', '__proto__', 'normal'];
  store.dispatch(reduxActions.setRawFiles(ids.map((id) => ({ id, name: id }))));
  expect(selectors.getDisplayFileIds(store.getState())).toEqual(ids);
  store.dispatch(reduxActions.setGrouping({ groups: [{ id: '__proto__', name: 'Group', fileIds: ids }] }));
  expect(selectors.getDisplayFileIds(store.getState())).toEqual(ids);
  store.dispatch(reduxActions.selectFiles({ fileIds: ids, reset: true }));
  expect(selectSelectedFileIds(store.getState())).toEqual(ids);
  store.dispatch(reduxActions.toggleGroup('__proto__'));
  expect(selectors.getDisplayFileIds(store.getState())).toEqual([]);
  store.dispatch(reduxActions.toggleGroup('__proto__'));
  expect(selectors.getDisplayFileIds(store.getState())).toEqual(ids);
});

it('keeps prototype-named actions, options and menu groups as ordinary caller IDs', () => {
  const store = makeStore();
  const ids = ['__proto__', 'constructor', 'toString'];
  store.dispatch(
    thunkUpdateRawFileActions(
      ids.map((id) => ({
        id,
        option: { id, defaultValue: true },
        button: { name: id, group: id, toolbar: true, contextMenu: true },
      })),
      true,
    ) as any,
  );
  for (const id of ids) {
    expect(store.getState().fileActionMap[id].id).toBe(id);
    expect(store.getState().optionMap[id]).toBe(true);
    expect(store.getState().toolbarItems).toContainEqual({ name: id, icon: null, sortOrder: -1, fileActionIds: [id] });
  }
});

it('resets an anchor when full grouping moves it to another group', () => {
  const store = makeStore();
  store.dispatch(reduxActions.setRawFiles([{ id: 'a', name: 'a' }]));
  store.dispatch(reduxActions.setGrouping({ groups: [{ id: 'first', name: 'First', fileIds: ['a'] }] }));
  store.dispatch(reduxActions.setLastClickIndex({ index: 0, fileId: 'a' }));
  store.dispatch(reduxActions.setGrouping({ groups: [{ id: 'second', name: 'Second', fileIds: ['a'] }] }));
  expect(selectors.getLastClickIndex(store.getState())).toBeNull();
});
