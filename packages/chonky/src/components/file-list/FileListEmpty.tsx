/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React, { useContext } from 'react';
import { useIntl } from 'react-intl';

import { ChonkyIconName } from '../../types/icons.types';
import { getI18nId, I18nNamespace } from '../../util/i18n';
import { ChonkyIconContext } from '../../util/icon-helper';
import { makeGlobalChonkyStyles } from '../../util/styles';

export interface FileListEmptyProps {
  height: number;
}

export const FileListEmpty: React.FC<FileListEmptyProps> = ({ height }) => {
  const classes = useStyles();
  const ChonkyIcon = useContext(ChonkyIconContext);

  const intl = useIntl();
  const emptyString = intl.formatMessage({
    id: getI18nId(I18nNamespace.FileList, 'nothingToShow'),
    defaultMessage: 'Nothing to show',
  });

  return (
    <div className={classes.fileListEmpty} style={{ height }}>
      <div className={classes.fileListEmptyContent}>
        <ChonkyIcon icon={ChonkyIconName.folderOpen} />
        &nbsp; {emptyString}
      </div>
    </div>
  );
};

const useStyles = makeGlobalChonkyStyles((theme) => ({
  fileListEmpty: {
    minHeight: 64,
    width: '100%',
    color: theme.palette.text.disabled,
    position: 'relative',
    textAlign: 'center',
    fontSize: '1.2em',
  },
  fileListEmptyContent: {
    transform: 'translateX(-50%) translateY(-50%)',
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
}));
