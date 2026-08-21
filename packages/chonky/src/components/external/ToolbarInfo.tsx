/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import React from 'react';
import { useIntl } from 'react-intl';
import { useChonkySelector } from '../../redux/store';

import Typography from '@mui/material/Typography';

import { selectHiddenFileCount, selectSelectionSize, selectors } from '../../redux/selectors';
import { getI18nId, I18nNamespace } from '../../util/i18n';
import { important, makeGlobalChonkyStyles } from '../../util/styles';

export interface ToolbarInfoProps {}

export const ToolbarInfo: React.FC<ToolbarInfoProps> = React.memo(() => {
  const classes = useStyles();

  const fileCount = useChonkySelector(selectors.getDisplayFileIds).length;
  const selectionSize = useChonkySelector(selectSelectionSize);
  const hiddenCount = useChonkySelector(selectHiddenFileCount);

  const intl = useIntl();
  const fileCountString = intl.formatMessage(
    {
      id: getI18nId(I18nNamespace.Toolbar, 'visibleFileCount'),
      defaultMessage: `{fileCount, plural,
                =0 {# items}
                one {# item}
                other {# items}
            }`,
    },
    { fileCount },
  );
  const selectedString = intl.formatMessage(
    {
      id: getI18nId(I18nNamespace.Toolbar, 'selectedFileCount'),
      defaultMessage: `{fileCount, plural,
                =0 {}
                other {# selected}
            }`,
    },
    { fileCount: selectionSize },
  );
  const hiddenString = intl.formatMessage(
    {
      id: getI18nId(I18nNamespace.Toolbar, 'hiddenFileCount'),
      defaultMessage: `{fileCount, plural,
                =0 {}
                other {# hidden}
            }`,
    },
    { fileCount: hiddenCount },
  );

  return (
    <div className={classes.infoContainer}>
      <Typography className={classes.infoText} variant="body1">
        {fileCountString}
        {(selectedString || hiddenString) && (
          <span className={classes.extraInfoSpan}>
            (<span className={classes.selectionSizeText}>{selectedString}</span>
            {selectedString && hiddenString && ', '}
            <span className={classes.hiddenCountText}>{hiddenString}</span>)
          </span>
        )}
      </Typography>
    </div>
  );
});

const useStyles = makeGlobalChonkyStyles((theme) => ({
  infoContainer: {
    height: theme.toolbar.size,
    display: 'flex',
  },
  infoText: {
    lineHeight: important(theme.toolbar.lineHeight),
    fontSize: important(theme.toolbar.fontSize),
    marginLeft: important(12),
    height: theme.toolbar.size,
  },
  extraInfoSpan: {
    marginRight: important(8),
    marginLeft: important(8),
    opacity: 0.8,
  },
  selectionSizeText: {
    color: theme.colors.textActive,
  },
  hiddenCountText: {},
}));
