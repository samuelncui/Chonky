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

export interface FullFileGrouping {
  groups: FileListGroup[];
  mode?: 'continuous' | 'single';
  sparse?: never;
  activeGroupId?: string;
  onGroupChange?: (groupId: string | undefined) => void;
  /** Registered actions shown in every header, unless overridden by the group. */
  actionIds?: string[];
}

export interface SparseFileGroup extends FileGroup {
  memberCount: number;
  actionIds?: string[];
  expanded?: boolean;
}

export type SparseFileRow =
  | { index: number; kind: 'group'; group: SparseFileGroup }
  | { index: number; kind: 'file'; group: SparseFileGroup; fileId: string };

export interface SparseFileGrouping {
  mode: 'continuous';
  groups?: never;
  /** The caller owns the displayed projection; indices include headers and collapsed groups. */
  sparse: {
    totalCount: number;
    rows: SparseFileRow[];
    /** Inclusive indices of the virtualizer's visible range. */
    onRangeChanged: (startIndex: number, endIndex: number) => void;
    onToggleGroup: (groupId: string) => void;
  };
  activeGroupId?: string;
  onGroupChange?: (groupId: string | undefined) => void;
  /** Registered actions shown in every header, unless overridden by the group. */
  actionIds?: string[];
}

export type FileGrouping = FullFileGrouping | SparseFileGrouping;

export interface FileActionGroupContext {
  id: string;
  /** Supplied members for full grouping; loaded file rows for sparse grouping. */
  fileIds: string[];
}
