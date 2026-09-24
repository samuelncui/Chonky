import React, { ReactElement, ReactNode, useMemo } from 'react';
import c from 'classnames';
import { useChonkySelector } from '../../redux/store';

import { selectToolbarItems, selectHideToolbarInfo, selectGrouping } from '../../redux/selectors';
import { makeGlobalChonkyStyles } from '../../util/styles';
import { SmartToolbarButton } from './ToolbarButton';
import { ToolbarDropdown } from './ToolbarDropdown';
import { ToolbarInfo } from './ToolbarInfo';
import { ToolbarSearch } from './ToolbarSearch';

export interface FileToolbarProps {
  /**
   * Controls how the filter, summary, children, and action regions are laid out.
   * `responsive` allows the toolbar sides to wrap and is the default. `inline`
   * keeps all four regions on one row and compacts icon buttons in narrow containers.
   */
  layout?: 'responsive' | 'inline';
}

export const FileToolbar: React.FC<FileToolbarProps & { children?: ReactNode }> = React.memo((props) => {
  const { children, layout = 'responsive' } = props;
  const inline = layout === 'inline';
  const classes = useStyles();
  const toolbarItems = useChonkySelector(selectToolbarItems);
  const sparse = !!useChonkySelector(selectGrouping)?.sparse;

  const toolbarItemComponents = useMemo(() => {
    const components: ReactElement[] = [];
    for (let i = 0; i < toolbarItems.length; ++i) {
      const item = toolbarItems[i];

      const key = `toolbar-item-${typeof item === 'string' ? item : item.name}`;
      const component =
        typeof item === 'string' ? (
          <SmartToolbarButton key={key} fileActionId={item} />
        ) : (
          <ToolbarDropdown key={key} {...item} />
        );
      components.push(component);
    }
    return components;
  }, [toolbarItems]);

  const hideToolbarInfo = useChonkySelector(selectHideToolbarInfo);
  return (
    <div className={classes.toolbarWrapper}>
      <div className={c(classes.toolbarContainer, inline && classes.toolbarContainerInline)}>
        <div className={c(classes.toolbarLeft, inline && classes.toolbarLeftInline)}>
          <div className={classes.toolbarSearch}>
            {/* Sparse rows are caller-owned; filtering loaded files would misrepresent the full result. */}
            {!sparse && <ToolbarSearch />}
          </div>
          <div className={classes.toolbarSummary}>{!hideToolbarInfo && <ToolbarInfo />}</div>
          <div className={classes.toolbarExtras}>{children}</div>
        </div>
        <div className={c(classes.toolbarRight, inline && classes.toolbarRightInline)}>{toolbarItemComponents}</div>
      </div>
    </div>
  );
});

const useStyles = makeGlobalChonkyStyles((theme) => ({
  toolbarWrapper: {
    containerType: 'inline-size',
    marginLeft: -theme.margins.rootLayoutMargin,
    marginRight: -theme.margins.rootLayoutMargin,
    paddingLeft: theme.margins.rootLayoutMargin,
    paddingRight: theme.margins.rootLayoutMargin,
  },
  toolbarContainer: {
    flexWrap: 'wrap-reverse',
    alignItems: 'center',
    display: 'flex',
  },
  toolbarContainerInline: {
    gridTemplateColumns: 'max-content minmax(0, 1fr) max-content max-content',
    paddingBottom: theme.margins.rootLayoutMargin,
    display: 'grid',
  },
  toolbarLeft: {
    paddingBottom: theme.margins.rootLayoutMargin,
    gridTemplateColumns: 'max-content minmax(0, 1fr) max-content',
    alignItems: 'center',
    flexGrow: 10000,
    minWidth: 0,
    display: 'grid',
  },
  toolbarLeftInline: {
    display: 'contents',
  },
  toolbarSearch: {
    alignItems: 'center',
    minWidth: 0,
    display: 'flex',
  },
  toolbarSummary: {
    alignItems: 'center',
    minWidth: 0,
    display: 'flex',
  },
  toolbarExtras: {
    alignItems: 'center',
    display: 'flex',
  },
  toolbarRight: {
    paddingBottom: theme.margins.rootLayoutMargin,
    alignItems: 'center',
    flexWrap: 'wrap',
    display: 'flex',
    '&:empty': {
      paddingBottom: 0,
      display: 'none',
    },
  },
  toolbarRightInline: {
    paddingBottom: 0,
    flexWrap: 'nowrap',
    '@container (max-width: 560px)': {
      '& > button > [data-chonky-toolbar-icon-with-text] + [data-chonky-toolbar-label]': {
        display: 'none',
      },
      '& > button > [data-chonky-toolbar-icon-with-text]': {
        marginRight: 0,
      },
    },
  },
}));
