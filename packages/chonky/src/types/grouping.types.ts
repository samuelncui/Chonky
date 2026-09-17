export interface FileGroup {
  id: string;
  name: string;
  description?: string;
  badge?: string;
}

/** Members refer to unique IDs in FileBrowser.files; one file belongs to one group. */
export interface FileListGroup extends FileGroup {
  fileIds: string[];
  actionIds?: string[];
}

export interface FileGrouping {
  groups: FileListGroup[];
  mode?: 'continuous' | 'single';
  activeGroupId?: string;
  onGroupChange?: (groupId: string | undefined) => void;
  /** Registered actions shown in every header, unless overridden by the group. */
  actionIds?: string[];
}

export interface FileActionGroupContext {
  id: string;
  /** All supplied members still present in files, including filtered-out members. */
  fileIds: string[];
}
