import React, { useRef, useState } from 'react';
import { useChonkySelector } from '../../redux/store';
import { Nullable } from 'tsdef';

import {
  selectDisableSelection,
  selectFileData,
  selectIsDnDDisabled,
  selectIsFileSelected,
} from '../../redux/selectors';
import { useParamSelector } from '../../redux/store';
import { DndEntryState, FileEntryProps } from '../../types/file-list.types';
import { FileViewMode } from '../../types/file-view.types';
import { FileHelper } from '../../util/file-helper';
import { makeGlobalChonkyStyles } from '../../util/styles';
import { ClickableWrapper, ClickableWrapperProps } from '../internal/ClickableWrapper';
import { CompactEntry } from './CompactEntry';
import { DnDFileEntry } from './DnDFileEntry';
import { useFileClickHandlers } from './FileEntry-hooks';
import { GridEntry } from './GridEntry';
import { ListEntry } from './ListEntry';

export interface SmartFileEntryProps {
  fileId: Nullable<string>;
  displayIndex: number;
  fileViewMode: FileViewMode;
}

const disabledDndState: DndEntryState = {
  dndIsDragging: false,
  dndIsOver: false,
  dndCanDrop: false,
};

export const SmartFileEntry: React.FC<SmartFileEntryProps> = React.memo(({ fileId, displayIndex, fileViewMode }) => {
  const classes = useStyles(fileViewMode);

  // Basic properties
  const file = useParamSelector(selectFileData, fileId);
  const selected = useParamSelector(selectIsFileSelected, fileId);
  const dndDisabled = useChonkySelector(selectIsDnDDisabled);
  const selectionDisabled = useChonkySelector(selectDisableSelection);
  const checkbox = useRef<HTMLInputElement>(null);
  const selectable = !selectionDisabled && FileHelper.isSelectable(file);

  // Clickable wrapper properties
  const fileClickHandlers = useFileClickHandlers(file, displayIndex);
  const [focused, setFocused] = useState(false);
  const clickableWrapperProps: ClickableWrapperProps = {
    wrapperTag: 'div',
    passthroughProps: {
      className: classes.fileEntryClickableWrapper,
      role: 'listitem',
      'data-chonky-context-file-id': file?.id,
      // Only the native checkbox is a tab stop when selection is available.
      tabIndex: selectable ? undefined : file ? 0 : undefined,
      onClickCapture: (event: React.MouseEvent) => {
        if (event.target instanceof Element && event.target.closest('input,button,a,[role="button"]')) return;
        checkbox.current?.focus({ preventScroll: true });
      },
    },
    ...(FileHelper.isClickable(file) ? fileClickHandlers : undefined),
    setFocused,
  };

  // File entry properties
  const fileEntryProps: Omit<FileEntryProps, 'dndState'> = {
    file,
    selected,
    focused,
  };

  let EntryComponent: React.FC<FileEntryProps>;
  if (fileViewMode === FileViewMode.List) EntryComponent = ListEntry;
  else if (fileViewMode === FileViewMode.Compact) EntryComponent = CompactEntry;
  else EntryComponent = GridEntry;

  const selectionControl =
    selectable && file ? (
      <input
        ref={checkbox}
        className={classes.fileSelectionCheckbox}
        type="checkbox"
        aria-label={`Select ${file.name}`}
        checked={selected}
        data-chonky-selection-id={file.id}
        onClick={(event) => event.stopPropagation()}
        onChange={() =>
          fileClickHandlers.onKeyboardClick({
            enterKey: false,
            spaceKey: true,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
          })
        }
      />
    ) : null;

  return dndDisabled ? (
    <ClickableWrapper {...clickableWrapperProps}>
      {selectionControl}
      <EntryComponent {...fileEntryProps} dndState={disabledDndState} />
    </ClickableWrapper>
  ) : (
    <DnDFileEntry file={file}>
      {(dndState) => (
        <ClickableWrapper {...clickableWrapperProps}>
          {selectionControl}
          <EntryComponent {...fileEntryProps} dndState={dndState} />
        </ClickableWrapper>
      )}
    </DnDFileEntry>
  );
});
SmartFileEntry.displayName = 'SmartFileEntry';

const useStyles = makeGlobalChonkyStyles(() => ({
  fileEntryClickableWrapper: {
    position: 'relative',
    height: '100%',
    display: (mode: FileViewMode) => (mode === FileViewMode.Grid ? 'block' : 'grid'),
    gridTemplateColumns: 'minmax(0, 1fr)',
    '&:has(> input)': { gridTemplateColumns: 'auto minmax(0, 1fr)' },
    alignItems: 'center',
    '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: -2 },
  },
  fileSelectionCheckbox: {
    margin: '0 6px',
    zIndex: 30,
    cursor: 'pointer',
    position: (mode: FileViewMode) => (mode === FileViewMode.Grid ? 'absolute' : undefined),
    top: 6,
    left: 0,
  },
}));
