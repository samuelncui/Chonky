import { useCallback, useMemo } from 'react';
import { useChonkyDispatch, useChonkySelector } from '../redux/store';
import { Nullable } from 'tsdef';

import { ChonkyActions } from '../action-definitions/index';
import {
  selectFileActionData,
  selectFileViewConfig,
  selectForceEnableOpenParent,
  selectOptionValue,
  selectParentFolder,
  getFileActionState,
  selectGrouping,
  selectSortActionId,
  selectSortOrder,
} from '../redux/selectors';
import { useParamSelector } from '../redux/store';
import { thunkRequestFileAction } from '../redux/thunks/dispatchers.thunks';
import { ChonkyIconName } from '../types/icons.types';
import { CustomVisibilityState } from '../types/action.types';
import { SortOrder } from '../types/sort.types';
import { FileHelper } from './file-helper';

export const useFileActionTrigger = (fileActionId: string, groupId?: string) => {
  const dispatch: any = useChonkyDispatch();
  const fileAction = useParamSelector(selectFileActionData, fileActionId);
  return useCallback(
    () => dispatch(thunkRequestFileAction(fileAction, undefined, groupId)),
    [dispatch, fileAction, groupId],
  );
};

export const useFileActionProps = (
  fileActionId: string,
  groupId?: string,
): { icon: Nullable<ChonkyIconName | string>; active: boolean; disabled: boolean; hidden: boolean } => {
  const parentFolder = useChonkySelector(selectParentFolder);
  const forceEnableOpenParent = useChonkySelector(selectForceEnableOpenParent);
  const fileViewConfig = useChonkySelector(selectFileViewConfig);

  const sortActionId = useChonkySelector(selectSortActionId);
  const sortOrder = useChonkySelector(selectSortOrder);

  const action = useParamSelector(selectFileActionData, fileActionId);
  // @ts-ignore
  const optionValue = useParamSelector(selectOptionValue, action?.option?.id);

  const grouping = useChonkySelector(selectGrouping);
  const actionSelectionEmpty = useChonkySelector(
    (state) => !action || getFileActionState(state, action, groupId).selectedFilesForAction.length === 0,
  );
  const visibility = useChonkySelector((state) =>
    action?.customVisibility?.(getFileActionState(state, action, groupId)),
  );

  return useMemo(() => {
    if (!action) return { icon: null, active: false, disabled: true, hidden: true };

    let icon = action.button?.icon ?? null;
    if (action.sortKeySelector) {
      if (sortActionId === action.id) {
        if (sortOrder === SortOrder.ASC) {
          icon = ChonkyIconName.sortAsc;
        } else {
          icon = ChonkyIconName.sortDesc;
        }
      } else {
        icon = ChonkyIconName.placeholder;
      }
    } else if (action.option) {
      if (optionValue) {
        icon = ChonkyIconName.toggleOn;
      } else {
        icon = ChonkyIconName.toggleOff;
      }
    }

    const isSortButtonAndCurrentSort = action.id === sortActionId;
    const isFileViewButtonAndCurrentView = action.fileViewConfig === fileViewConfig;
    const isOptionAndEnabled = action.option ? !!optionValue : false;

    const customDisabled = visibility === CustomVisibilityState.Disabled;
    const customActive = visibility === CustomVisibilityState.Active;
    const active = isSortButtonAndCurrentSort || isFileViewButtonAndCurrentView || isOptionAndEnabled || customActive;

    let disabled: boolean = (!!action.requiresSelection && actionSelectionEmpty) || customDisabled;

    if (action.id === ChonkyActions.OpenParentFolder.id) {
      // We treat `open_parent_folder` file action as a special case as it
      // requires the parent folder to be present to work, unless the
      // forceOpenParent prop is set, which forces the action to be available.
      disabled = disabled || (!forceEnableOpenParent && !FileHelper.isOpenable(parentFolder));
    }

    const hidden =
      visibility === CustomVisibilityState.Hidden ||
      (!!grouping?.sparse && action.id === ChonkyActions.ToggleHiddenFiles.id) ||
      (!!grouping && !!action.fileViewConfig && action.fileViewConfig.mode !== 'list');
    return { icon, active, disabled, hidden };
  }, [
    parentFolder,
    fileViewConfig,
    sortActionId,
    sortOrder,
    action,
    optionValue,
    actionSelectionEmpty,
    forceEnableOpenParent,
    visibility,
    grouping,
  ]);
};
