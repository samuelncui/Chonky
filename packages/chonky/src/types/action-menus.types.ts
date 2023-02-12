import { Nullable } from 'tsdef';
import { ChonkyIconName } from '../types/icons.types';

export interface FileActionGroup {
  name: string;
  sortOrder: number;
  icon?: Nullable<ChonkyIconName | string>;
  fileActionIds: string[];
}

export type FileActionMenuItem = string | FileActionGroup;
