import React, { useContext, useMemo } from 'react';
import { FileEntryStatus } from './FileEntryStatus';
import { selectFileViewConfig } from '../../redux/selectors';
import { useChonkySelector } from '../../redux/store';

import { DndEntryState, FileEntryProps } from '../../types/file-list.types';
import { useLocalizedFileEntryStrings } from '../../util/i18n';
import { ChonkyIconContext } from '../../util/icon-helper';
import { c, makeLocalChonkyStyles } from '../../util/styles';
import { TextPlaceholder } from '../external/TextPlaceholder';
import { useDndIcon, useFileEntryHtmlProps, useFileEntryState } from './FileEntry-hooks';
import { FileEntryName } from './FileEntryName';
import { FileEntryState, useCommonEntryStyles } from './GridEntryPreview';

interface StyleState {
  entryState: FileEntryState;
  dndState: DndEntryState;
  entryHeight: number;
  hasDetails: boolean;
}

export const ListEntry: React.FC<FileEntryProps> = React.memo(({ file, selected, focused, dndState }) => {
  const entryState: FileEntryState = useFileEntryState(file, selected, focused);
  const dndIconName = useDndIcon(dndState);
  const entryHeight = useChonkySelector(selectFileViewConfig).entryHeight;
  const hasDetails = !!file?.details?.length;

  const { fileModDateString, fileSizeString } = useLocalizedFileEntryStrings(file);
  const styleState = useMemo<StyleState>(
    () => ({
      entryState,
      dndState,
      entryHeight,
      hasDetails,
    }),
    [dndState, entryState, entryHeight, hasDetails],
  );
  const classes = useStyles(styleState);
  const commonClasses = useCommonEntryStyles(entryState);
  const ChonkyIcon = useContext(ChonkyIconContext);
  const fileEntryHtmlProps = useFileEntryHtmlProps(file);
  return (
    <div className={classes.listFileEntry} {...fileEntryHtmlProps}>
      <div className={commonClasses.focusIndicator}></div>
      <div className={c([commonClasses.selectionIndicator, classes.listFileEntrySelection])}></div>
      <div className={classes.listFileEntryIcon}>
        <ChonkyIcon
          icon={dndIconName ?? entryState.icon}
          spin={dndIconName ? false : entryState.iconSpin}
          fixedWidth={true}
        />
      </div>
      <div className={classes.listFileEntryName} title={file ? file.name : undefined}>
        <FileEntryName file={file} />
        {file?.details?.map((detail, index) => (
          <div key={index} className={classes.listFileEntryDetail} title={detail}>
            {detail}
          </div>
        ))}
      </div>
      {!file?.details?.length && (
        <div className={classes.listFileEntryProperty}>
          {file ? (fileModDateString ?? <span>—</span>) : <TextPlaceholder minLength={5} maxLength={15} />}
        </div>
      )}
      {!file?.details?.length && (
        <div className={classes.listFileEntryProperty}>
          {file ? (fileSizeString ?? <span>—</span>) : <TextPlaceholder minLength={10} maxLength={20} />}
        </div>
      )}
      <FileEntryStatus status={file?.status} reserve />
    </div>
  );
});

const useStyles = makeLocalChonkyStyles((theme) => ({
  listFileEntry: {
    boxShadow: `inset ${theme.palette.divider} 0 -1px 0`,
    paddingRight: theme.margins.rootLayoutMargin,
    paddingLeft: theme.margins.rootLayoutMargin,
    paddingTop: ({ hasDetails }: StyleState) => (hasDetails ? 4 : 0),
    paddingBottom: ({ hasDetails }: StyleState) => (hasDetails ? 4 : 0),
    minHeight: ({ entryHeight }: StyleState) => entryHeight,
    boxSizing: 'border-box',
    fontSize: theme.listFileEntry.fontSize,
    color: ({ dndState }: StyleState) =>
      dndState.dndIsOver ? (dndState.dndCanDrop ? theme.dnd.canDropColor : theme.dnd.cannotDropColor) : 'inherit',
    alignItems: 'center',
    position: 'relative',
    display: 'flex',
    height: '100%',
  },
  listFileEntrySelection: {
    opacity: 0.6,
  },
  listFileEntryIcon: {
    flex: '0 0 28px',
    width: 28,
    textAlign: 'center',
    color: ({ entryState, dndState }: StyleState) =>
      dndState.dndIsOver
        ? dndState.dndCanDrop
          ? theme.dnd.canDropColor
          : theme.dnd.cannotDropColor
        : entryState.color,
    fontSize: theme.listFileEntry.iconFontSize,
    boxSizing: 'border-box',
    padding: [2, 4],
    zIndex: 20,
  },
  listFileEntryName: {
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    flex: '1 1 300px',
    paddingLeft: 8,
    zIndex: 20,
  },
  listFileEntryProperty: {
    fontSize: theme.listFileEntry.propertyFontSize,
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    flex: '0 1 150px',
    padding: [2, 8],
    zIndex: 20,
  },
  listFileEntryDetail: {
    color: theme.palette.text.secondary,
    fontSize: theme.listFileEntry.propertyFontSize,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    lineHeight: '18px',
  },
}));
