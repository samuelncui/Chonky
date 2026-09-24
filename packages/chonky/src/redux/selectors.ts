import { sort } from 'fast-sort';
import FuzzySearch from 'fuzzy-search';
import { Nilable, Nullable } from 'tsdef';

import { createSelector } from '@reduxjs/toolkit';

import { ChonkyActions } from '../action-definitions';
import { FileActionState } from '../types/action-handler.types';
import { FileAction } from '../types/action.types';
import { OptionIds } from '../action-definitions/option-ids';
import { FileArray, FileData, FileFilter } from '../types/file.types';
import { RootState } from '../types/redux.types';
import { FileSortKeySelector, SortOrder } from '../types/sort.types';
import { FileHelper } from '../util/file-helper';

// Raw selectors
export const selectInstanceId = (state: RootState) => state.instanceId;
export const selectExternalFileActionHandler = (state: RootState) => state.externalFileActionHandler;

export const selectFileActionMap = (state: RootState) => state.fileActionMap;
export const selectFileActionIds = (state: RootState) => state.fileActionIds;
export const selectFileActionData = (fileActionId: string) => (state: RootState) =>
  selectFileActionMap(state)[fileActionId];
export const selectToolbarItems = (state: RootState) => state.toolbarItems;
export const selectContextMenuItems = (state: RootState) => state.contextMenuItems;

export const selectFolderChain = (state: RootState) => state.folderChain;
export const selectCurrentFolder = (state: RootState) => {
  const folderChain = selectFolderChain(state);
  const currentFolder = folderChain.length > 0 ? folderChain[folderChain.length - 1] : null;
  return currentFolder;
};
export const selectParentFolder = (state: RootState) => {
  const folderChain = selectFolderChain(state);
  const parentFolder = folderChain.length > 1 ? folderChain[folderChain.length - 2] : null;
  return parentFolder;
};

export const selectFiles = (state: RootState) => state.files;
export const selectFileMap = (state: RootState) => state.fileMap;
export const selectCleanFileIds = (state: RootState) => state.cleanFileIds;
export const selectFileData = (fileId: Nullable<string>) => (state: RootState) =>
  fileId ? selectFileMap(state)[fileId] : null;

export const selectFocusSearchInput = (state: RootState) => state.focusSearchInput;
export const selectSearchString = (state: RootState) => state.searchString;

export const selectSelectionMap = (state: RootState) => state.selectionMap;
export const selectSelectedFileIds = (state: RootState) => Object.keys(selectSelectionMap(state));
export const selectSelectionSize = (state: RootState) => selectSelectedFileIds(state).length;
export const selectIsFileSelected = (fileId: Nullable<string>) => (state: RootState) =>
  !!fileId && !!selectSelectionMap(state)[fileId];
export const selectSelectedFiles = (state: RootState) => {
  const fileMap = selectFileMap(state);
  return Object.keys(selectSelectionMap(state)).map((id) => fileMap[id]);
};
export const selectSelectedFilesForAction = (fileActionId: string) => (state: RootState) => {
  const { fileActionMap } = state;
  const action = fileActionMap[fileActionId];
  if (!action || !action.requiresSelection) return undefined;

  return getSelectedFiles(state, action.fileFilter);
};
export const selectSelectedFilesForActionCount = (fileActionId: string) => (state: RootState) =>
  getSelectedFilesForAction(state, fileActionId)?.length;
export const selectDisableSelection = (state: RootState) => state.disableSelection;
export const selectRevealFileRequest = (state: RootState) => state.revealFileRequest;
export const selectForceEnableOpenParent = (state: RootState) => state.forceEnableOpenParent;
export const selectHideToolbarInfo = (state: RootState) => state.hideToolbarInfo;

export const selectGrouping = (state: RootState) => state.grouping;
export const selectActiveGroupId = (state: RootState) => state.activeGroupId;
const selectCollapsedGroupIds = (state: RootState) => state.collapsedGroupIds;
const selectFileGroupMap = (state: RootState) => state.fileGroupMap;
export const selectFileViewConfig = (state: RootState) =>
  state.grouping ? ChonkyActions.EnableListView.fileViewConfig : state.fileViewConfig;

export const selectSortActionId = (state: RootState) => state.sortActionId;
export const selectSortOrder = (state: RootState) => state.sortOrder;

export const selectOptionMap = (state: RootState) => state.optionMap;
export const selectOptionValue = (optionId: string) => (state: RootState) => selectOptionMap(state)[optionId];

export const selectThumbnailGenerator = (state: RootState) => state.thumbnailGenerator;
export const selectDoubleClickDelay = (state: RootState) => state.doubleClickDelay;
export const selectIsDnDDisabled = (state: RootState) => state.disableDragAndDrop;
export const selectClearSelectionOnOutsideClick = (state: RootState) => state.clearSelectionOnOutsideClick;

export const selectContextMenuMounted = (state: RootState) => state.contextMenuMounted;
export const selectContextMenuConfig = (state: RootState) => state.contextMenuConfig;
export const selectContextMenuTriggerFile = (state: RootState) => {
  const config = selectContextMenuConfig(state);
  if (!config || !config.triggerFileId) return null;
  const fileMap = selectFileMap(state);
  return fileMap[config.triggerFileId] ?? null;
};

// Raw selectors
const getFileActionMap = (state: RootState) => state.fileActionMap;
const getOptionMap = (state: RootState) => state.optionMap;
const getFileMap = (state: RootState) => state.fileMap;
const getFileIds = (state: RootState) => state.fileIds;
const getCleanFileIds = (state: RootState) => state.cleanFileIds;
const getSortActionId = (state: RootState) => state.sortActionId;
const getSortOrder = (state: RootState) => state.sortOrder;
const getSearchString = (state: RootState) => state.searchString;
const _getLastClick = (state: RootState) => state.lastClick;

// Memoized selectors
const makeGetAction = (fileActionSelector: (state: RootState) => Nullable<string>) =>
  createSelector([getFileActionMap, fileActionSelector], (fileActionMap, fileActionId) =>
    fileActionId && fileActionMap[fileActionId] ? fileActionMap[fileActionId] : null,
  );
const makeGetOptionValue = (optionId: string, defaultValue: any = undefined) =>
  createSelector([getOptionMap], (optionMap) => {
    const value = optionMap[optionId];
    if (value === undefined) {
      return defaultValue;
    }
    return value;
  });
const makeGetFiles = (fileIdsSelector: (state: RootState) => Nullable<string>[]) =>
  createSelector([getFileMap, fileIdsSelector], (fileMap, fileIds): FileArray =>
    fileIds.map((fileId) => (fileId && fileMap[fileId] ? fileMap[fileId] : null)),
  );
const getSortedFileIds = createSelector(
  [
    getFileIds,
    getSortOrder,
    makeGetFiles(getFileIds),
    makeGetAction(getSortActionId),
    makeGetOptionValue(OptionIds.ShowFoldersFirst, false),
  ],
  (fileIds, sortOrder, files, sortAction, showFolderFirst) => {
    if (!sortAction) {
      // We allow users to set the sort action ID to `null` if they want to use their
      // own sorting mechanisms instead of relying on Chonky built-in sort.
      return fileIds;
    }

    const prepareSortKeySelector = (selector: FileSortKeySelector) => (file: Nullable<FileData>) => selector(file);

    const sortFunctions: {
      asc?: (file: FileData) => any;
      desc?: (file: FileData) => any;
    }[] = [];

    if (showFolderFirst) {
      // If option is undefined (relevant actions is not enabled), we don't show
      // folders first.
      sortFunctions.push({
        desc: prepareSortKeySelector(FileHelper.isDirectory),
      });
    }
    if (sortAction.sortKeySelector) {
      const configKeyName = sortOrder === SortOrder.ASC ? 'asc' : 'desc';
      sortFunctions.push({
        [configKeyName]: prepareSortKeySelector(sortAction.sortKeySelector),
      });
    }
    if (sortFunctions.length === 0) return fileIds;

    // We copy the array because `fast-sort` mutates it
    const sortedFileIds = sort([...files])
      .by(sortFunctions as any)
      .map((file) => (file ? file.id : null));
    return sortedFileIds;
  },
);
const getSearcher = createSelector(
  [makeGetFiles(getCleanFileIds)],
  (cleanFiles) => new FuzzySearch(cleanFiles as FileData[], ['name'], { caseSensitive: false }),
);
const getSearchFilteredFileIds = createSelector(
  [getCleanFileIds, getSearchString, getSearcher],
  (cleanFileIds, searchString, searcher) =>
    searchString ? searcher.search(searchString).map((f) => f.id) : cleanFileIds,
);
export const selectHiddenFileIdMap = createSelector(
  [getSearchFilteredFileIds, makeGetFiles(getCleanFileIds), makeGetOptionValue(OptionIds.ShowHiddenFiles)],
  (searchFilteredFileIds, cleanFiles, showHiddenFiles) => {
    const searchFilteredFileIdsSet = new Set(searchFilteredFileIds);
    const hiddenFileIdMap: any = {};
    cleanFiles.forEach((file) => {
      if (!file) return;
      else if (!searchFilteredFileIdsSet.has(file.id)) {
        // Hidden by seach
        hiddenFileIdMap[file.id] = true;
      } else if (!showHiddenFiles && FileHelper.isHidden(file)) {
        // Hidden by options
        hiddenFileIdMap[file.id] = true;
      }
    });
    return hiddenFileIdMap;
  },
);
export const selectHiddenFileCount = createSelector(
  [selectHiddenFileIdMap],
  (hiddenFileIdMap) => Object.keys(hiddenFileIdMap).length,
);
const getVisibleFileIds = createSelector(
  [getSortedFileIds, selectHiddenFileIdMap],
  /** Returns files that will actually be shown to the user. */
  (sortedFileIds, hiddenFileIdMap) => sortedFileIds.filter((id) => !id || !hiddenFileIdMap[id]),
);
/** Headers retain caller order; members retain the ordinary sorted/filtered order. */
export const selectDisplayGroups = createSelector(
  [selectGrouping, getVisibleFileIds, selectFileGroupMap, selectFileMap],
  (grouping, visibleIds, groupMap, fileMap) => {
    if (!grouping || grouping.sparse) return [];
    const members = new Map<string, string[]>();
    for (const id of visibleIds) {
      if (!id || !groupMap[id]) continue;
      const groupId = groupMap[id];
      const ids = members.get(groupId) ?? [];
      ids.push(id);
      members.set(groupId, ids);
    }
    return grouping.groups.flatMap((group) => {
      const fileIds = members.get(group.id);
      const totalCount = group.fileIds.filter((id) => groupMap[id] === group.id && !!fileMap[id]).length;
      return fileIds?.length ? [{ ...group, fileIds, totalCount }] : [];
    });
  },
);
export const selectExpandedGroups = createSelector(
  [selectDisplayGroups, selectGrouping, selectActiveGroupId, selectCollapsedGroupIds],
  (groups, grouping, activeId, collapsed) =>
    groups.map((group) => ({
      ...group,
      expanded: grouping?.mode === 'single' ? group.id === activeId : !collapsed[group.id],
    })),
);
const getDisplayFileIds = createSelector(
  [getVisibleFileIds, selectGrouping, selectExpandedGroups, selectFileMap],
  (ids, grouping, groups, fileMap) => {
    if (grouping?.sparse) {
      return grouping.sparse.rows
        .flatMap((row) => (row.kind === 'file' && fileMap[row.fileId] ? [row] : []))
        .sort((a, b) => a.index - b.index)
        .map((row) => row.fileId);
    }
    return grouping ? groups.flatMap((group) => (group.expanded ? group.fileIds : [])) : ids;
  },
);

/** The same action context is used by buttons, shortcuts and imperative dispatch. */
export const getFileActionState = (
  state: RootState,
  action: FileAction,
  groupId = state.activeGroupId,
): FileActionState<{}> => {
  const grouping = state.grouping;
  const group = grouping?.sparse
    ? grouping.sparse.rows.find((row) => row.group.id === groupId)?.group
    : grouping?.groups.find((candidate) => candidate.id === groupId);
  const groupFileIds = grouping?.sparse
    ? grouping.sparse.rows
        .flatMap((row) => (row.kind === 'file' && row.group.id === groupId ? [row] : []))
        .sort((a, b) => a.index - b.index)
        .map((row) => row.fileId)
    : group && 'fileIds' in group
      ? group.fileIds
      : [];
  const selectedFiles = selectSelectedFiles(state).filter(
    (file) => file && (!state.grouping || (!!group && state.fileGroupMap[file.id] === group.id)),
  );
  const trigger = selectContextMenuTriggerFile(state);
  return {
    instanceId: state.instanceId,
    selectedFiles,
    selectedFilesForAction: action.fileFilter ? selectedFiles.filter(action.fileFilter) : selectedFiles,
    contextMenuTriggerFile:
      trigger && (!state.grouping || state.fileGroupMap[trigger.id] === group?.id) ? trigger : null,
    ...(group
      ? {
          group: {
            id: group.id,
            fileIds: groupFileIds.filter((id) => !!state.fileMap[id] && state.fileGroupMap[id] === group.id),
          },
        }
      : {}),
  };
};

const getLastClickIndex = createSelector(
  [_getLastClick, getDisplayFileIds],
  /** Returns the last click index after ensuring it is actually still valid. */
  (lastClick, displayFileIds) => {
    const index = lastClick?.index;
    if (
      !lastClick ||
      index === undefined ||
      index < 0 ||
      index > displayFileIds.length - 1 ||
      lastClick.fileId != displayFileIds[index]
    ) {
      return null;
    }
    return lastClick.index;
  },
);

export const selectors = {
  // Raw selectors
  getFileActionMap,
  getOptionMap,
  getFileMap,
  getFileIds,
  getCleanFileIds,
  getSortActionId,
  getSortOrder,
  getSearchString,
  _getLastClick,

  // Memoized selectors
  getSortedFileIds,
  getSearcher,
  getSearchFilteredFileIds,
  getHiddenFileIdMap: selectHiddenFileIdMap,
  getDisplayFileIds,
  getLastClickIndex,

  // Parametrized selectors
  makeGetAction,
  makeGetOptionValue,
  makeGetFiles,
};

// Selectors meant to be used outside of Redux code
export const getFileData = (state: RootState, fileId: Nullable<string>) =>
  fileId ? selectFileMap(state)[fileId] : null;
export const getIsFileSelected = (state: RootState, file: FileData) => {
  // !!! We deliberately don't use `FileHelper.isSelectable` here as we want to
  //     reflect the state of Redux store accurately.
  return !!selectSelectionMap(state)[file.id];
};
export const getSelectedFiles = (state: RootState, ...filters: Nilable<FileFilter>[]) => {
  const { fileMap, selectionMap } = state;

  const selectedFiles = Object.keys(selectionMap).map((id) => fileMap[id]);
  const filteredSelectedFiles = filters.reduce(
    (prevFiles, filter) => (filter ? prevFiles.filter(filter) : prevFiles),
    selectedFiles,
  );
  return filteredSelectedFiles;
};
export const getSelectedFilesForAction = (state: RootState, fileActionId: string) =>
  selectSelectedFilesForAction(fileActionId)(state);
