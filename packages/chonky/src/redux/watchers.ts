import { useEffect } from 'react';

import { Store } from '@reduxjs/toolkit';

import { ChonkyActions } from '../action-definitions';
import { RootState } from '../types/redux.types';
import { FileSelection } from '../types/selection.types';
import { selectSelectedFileIds, selectSelectionMap } from './selectors';
import { thunkRequestFileAction } from './thunks/dispatchers.thunks';

export const useStoreWatchers = (store: Store<RootState>) => {
  useEffect(() => {
    let previousSelection = selectSelectionMap(store.getState());
    let previousGroup = store.getState().activeGroupId;
    return store.subscribe(() => {
      const state = store.getState();
      if (state.activeGroupId !== previousGroup) {
        previousGroup = state.activeGroupId;
        state.grouping?.onGroupChange?.(previousGroup);
      }
      const selectionMap: FileSelection = selectSelectionMap(store.getState());

      // We don't check for deep equality here as we expect the
      // reducers to prevent all unnecessary updates.
      if (selectionMap === previousSelection) return;
      previousSelection = selectionMap;

      // Notify users the selection has changed.
      const selectedFilesIds = selectSelectedFileIds(store.getState());
      const selection = new Set<string>(selectedFilesIds);
      store.dispatch(
        thunkRequestFileAction(ChonkyActions.ChangeSelection, {
          selection,
        }) as any,
      );
    });
  }, [store]);
};
