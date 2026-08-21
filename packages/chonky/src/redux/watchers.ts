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
    return store.subscribe(() => {
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
