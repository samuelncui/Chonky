import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';

import { configureStore } from '@reduxjs/toolkit';

import { ChonkyDispatch, ChonkyStore, RootState } from '../types/redux.types';
import { useStaticValue } from '../util/hooks-helpers';
import { rootReducer } from './reducers';
import { initialRootState } from './state';
import { useStoreWatchers } from './watchers';

export const useChonkyDispatch = useDispatch.withTypes<ChonkyDispatch>();
export const useChonkySelector = useSelector.withTypes<RootState>();
export const useChonkyReduxStore = useStore.withTypes<ChonkyStore>();

export const useChonkyStore = (chonkyInstanceId: string) => {
  const store = useStaticValue(() => {
    const preloadedState: RootState = {
      ...initialRootState,
      instanceId: chonkyInstanceId,
    };

    return configureStore({
      preloadedState: preloadedState as any,
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
        }),
      devTools: { name: `chonky_${chonkyInstanceId}` },
    });
  });
  useStoreWatchers(store);
  return store;
};

/**
 * Hook that can be used with parametrized selectors.
 */
export const useParamSelector = <Args extends Array<any>, Value>(
  parametrizedSelector: (...args: Args) => (state: RootState) => Value,
  ...selectorParams: Args
) => {
  const selector = useCallback(
    (state: RootState) => parametrizedSelector(...selectorParams)(state),
    // eslint-disable-next-line
    [parametrizedSelector, ...selectorParams],
  );
  return useChonkySelector(selector);
};

/**
 * DTE - DispatchThunkEffect. This method is used to decrease code duplication in
 * main Chonky method.
 */
export const useDTE = <Args extends Array<any>>(actionCreator: (...args: Args) => any, ...selectorParams: Args) => {
  const dispatch = useChonkyDispatch();
  useEffect(
    () => {
      dispatch(actionCreator(...selectorParams));
    },
    // eslint-disable-next-line
    [dispatch, actionCreator, ...selectorParams],
  );
};

export const usePropReduxUpdate = <Payload extends any>(actionCreator: (payload: Payload) => any, payload: Payload) => {
  const dispatch = useChonkyDispatch();
  useEffect(() => {
    dispatch(actionCreator(payload));
  }, [dispatch, actionCreator, payload]);
};
