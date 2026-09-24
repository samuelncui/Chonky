/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import hotkeys from 'hotkeys-js';
import React, { useEffect } from 'react';
import { useChonkyDispatch, useChonkySelector } from '../../redux/store';

import { ChonkyActions } from '../../action-definitions';
import { selectFileActionData, selectGrouping } from '../../redux/selectors';
import { useParamSelector } from '../../redux/store';
import { thunkRequestFileAction } from '../../redux/thunks/dispatchers.thunks';
import { ChonkyDispatch } from '../../types/redux.types';

export interface HotkeyListenerProps {
  fileActionId: string;
  browserRef: React.RefObject<HTMLDivElement | null>;
}

export const HotkeyListener: React.FC<HotkeyListenerProps> = React.memo((props) => {
  const { fileActionId, browserRef } = props;

  const dispatch: ChonkyDispatch = useChonkyDispatch();
  const fileAction = useParamSelector(selectFileActionData, fileActionId);
  const sparse = !!useChonkySelector(selectGrouping)?.sparse;

  useEffect(() => {
    if (!fileAction || !fileAction.hotkeys || fileAction.hotkeys.length === 0) {
      return;
    }

    const hotkeysStr = fileAction.hotkeys.join(',');
    const hotkeyCallback = (event: KeyboardEvent) => {
      if (!browserRef.current?.contains(document.activeElement)) return;
      if (
        sparse &&
        (fileAction.id === ChonkyActions.FocusSearchInput.id || fileAction.id === ChonkyActions.ToggleHiddenFiles.id)
      )
        return;
      event.preventDefault();
      dispatch(thunkRequestFileAction(fileAction, undefined));
    };
    hotkeys(hotkeysStr, hotkeyCallback);
    return () => hotkeys.unbind(hotkeysStr, hotkeyCallback);
  }, [dispatch, fileAction, browserRef, sparse]);

  return null;
});
