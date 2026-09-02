import React, { useImperativeHandle } from 'react';
import { useChonkyDispatch, useChonkyReduxStore } from '../redux/store';

import { reduxActions } from '../redux/reducers';
import { selectSelectionMap, selectors } from '../redux/selectors';
import { thunkRequestFileAction } from '../redux/thunks/dispatchers.thunks';
import { FileAction } from '../types/action.types';
import { FileBrowserHandle } from '../types/file-browser.types';
import { ChonkyDispatch } from '../types/redux.types';

export const useFileBrowserHandle = (ref: React.Ref<FileBrowserHandle>) => {
  const store = useChonkyReduxStore();
  const dispatch: ChonkyDispatch = useChonkyDispatch();

  useImperativeHandle(
    ref,
    () => ({
      getFileSelection(): Set<string> {
        const selectionMap = selectSelectionMap(store.getState());
        const selectionSet = new Set(Object.keys(selectionMap));
        return selectionSet;
      },
      setFileSelection(selection, reset = true): void {
        const fileIds = Array.from(selection);
        dispatch(reduxActions.selectFiles({ fileIds, reset }));
      },
      revealFile(id): void {
        const displayFileIds = selectors.getDisplayFileIds(store.getState());
        if (!displayFileIds.includes(id)) return;

        dispatch(reduxActions.selectFiles({ fileIds: [id], reset: true }));
        dispatch(reduxActions.revealFile(id));
      },
      async requestFileAction<Action extends FileAction>(
        action: Action,
        payload: Action['__payloadType'],
      ): Promise<void> {
        return Promise.resolve(dispatch(thunkRequestFileAction(action, payload)));
      },
    }),
    [store, dispatch],
  );
};
