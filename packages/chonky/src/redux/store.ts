import { createContext, useCallback, useEffect, useLayoutEffect } from 'react';
import { createDispatchHook, createSelectorHook, createStoreHook, type ReactReduxContextValue } from 'react-redux';

import { configureStore } from '@reduxjs/toolkit';

import { ChonkyDispatch, ChonkyStore, RootState } from '../types/redux.types';
import { useStaticValue } from '../util/hooks-helpers';
import { rootReducer } from './reducers';
import { initialRootState } from './state';
import { useStoreWatchers } from './watchers';

// Library state must not shadow the host application's Redux context in caller slots.
export const ChonkyReduxContext = createContext<ReactReduxContextValue | null>(null);
export const useChonkyDispatch = createDispatchHook(ChonkyReduxContext).withTypes<ChonkyDispatch>();
export const useChonkySelector = createSelectorHook(ChonkyReduxContext).withTypes<RootState>();
export const useChonkyReduxStore = createStoreHook(ChonkyReduxContext).withTypes<ChonkyStore>();

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
  // Controlled rows and breadcrumbs must match direct presentation props before
  // paint, including the transition from initial loading to a populated folder.
  useLayoutEffect(() => {
    dispatch(actionCreator(payload));
  }, [dispatch, actionCreator, payload]);
};
