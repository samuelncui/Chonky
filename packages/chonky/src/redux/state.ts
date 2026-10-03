import { ChonkyActions } from '../action-definitions/index';
import { RootState } from '../types/redux.types';
import { SortOrder } from '../types/sort.types';

export const initialRootState: RootState = {
  instanceId: 'CHONKY_INVALID_ID', // should be overwritten by preloaded state

  externalFileActionHandler: null,

  fileActionMap: Object.create(null),
  fileActionIds: [],
  toolbarItems: [],
  contextMenuItems: [],

  folderChain: [],

  files: [],
  fileMap: Object.create(null),
  fileIds: [],
  cleanFileIds: [],

  grouping: null,
  activeGroupId: undefined,
  collapsedGroupIds: Object.create(null),
  fileGroupMap: Object.create(null),

  focusSearchInput: null,
  searchString: '',
  searchMode: 'currentFolder',

  selectionMap: Object.create(null),
  disableSelection: false,
  revealFileRequest: null,

  fileViewConfig: ChonkyActions.EnableGridView.fileViewConfig,

  sortActionId: null,
  sortOrder: SortOrder.ASC,

  optionMap: Object.create(null),

  thumbnailGenerator: null,
  doubleClickDelay: 300,
  disableDragAndDrop: false,
  clearSelectionOnOutsideClick: true,
  forceEnableOpenParent: false,
  hideToolbarInfo: false,

  lastClick: null,

  contextMenuMounted: false,
  contextMenuConfig: null,
};
