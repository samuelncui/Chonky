/**
 * @author Timur Kuzhagaliyev <tim.kuzh@gmail.com>
 * @copyright 2020
 * @license MIT
 */

import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import React, { ReactElement, useLayoutEffect, useRef, useState } from 'react';
import { ChonkyIconName } from '../../types/icons.types';

import { ChonkyActions } from '../../action-definitions/index';
import { important, makeGlobalChonkyStyles } from '../../util/styles';
import { useFolderChainItems } from './FileNavbar-hooks';
import { FolderChainButton } from './FolderChainButton';
import { SmartToolbarButton, ToolbarButton } from './ToolbarButton';

const separatorWidth = 6;

export interface FileNavbarProps {
  /** Replace the root breadcrumb with an application-owned scope selector. */
  rootContent?: React.ReactNode;
  /** Source-qualified display path copied by the trailing Copy path action. */
  path?: string;
}

export const FileNavbar: React.FC<FileNavbarProps> = React.memo(({ rootContent, path }) => {
  const classes = useStyles();
  const folderChainItems = useFolderChainItems();
  const [ancestorAnchor, setAncestorAnchor] = useState<HTMLButtonElement | null>(null);
  const chainKey = folderChainItems.map((item) => `${item.file?.id}:${item.file?.name}`).join('/');
  const container = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<number, HTMLSpanElement>());
  const widths = useRef(new Map<number, number>());
  const [fold, setFold] = useState({ key: '', count: 0 });
  const [copyLabel, setCopyLabel] = useState('Copy path');
  const hiddenCount = fold.key === chainKey ? fold.count : 0;
  const collapsedAncestors = folderChainItems.slice(1, hiddenCount + 1);

  useLayoutEffect(() => {
    widths.current.clear();
    const measure = () => {
      const available = container.current?.clientWidth ?? 0;
      if (!available) return;
      for (const [index, node] of items.current) {
        if (node.getBoundingClientRect().width > 0) widths.current.set(index, node.scrollWidth);
      }
      if (widths.current.size !== folderChainItems.length) return;
      let total =
        Array.from(widths.current.values()).reduce((sum, width) => sum + width, 0) +
        Math.max(0, folderChainItems.length - 1) * separatorWidth;
      let count = 0;
      while (total > available && count < folderChainItems.length - 2) {
        count++;
        total -= (widths.current.get(count) ?? 0) + separatorWidth;
        if (count === 1) total += 32;
      }
      setFold((current) => (current.key === chainKey && current.count === count ? current : { key: chainKey, count }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, [chainKey, folderChainItems.length]);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(path ?? folderChainItems.map((item) => item.file?.name ?? '').join('/'));
      setCopyLabel('Path copied');
    } catch {
      setCopyLabel('Could not copy path');
    }
  };

  const folderChainComponents = (() => {
    const components: ReactElement[] = [];
    for (let i = 0; i < folderChainItems.length; ++i) {
      const key = `folder-chain-${i}`;
      if (collapsedAncestors.length && i > 0 && i <= hiddenCount) {
        if (i === 1)
          components.push(
            <ToolbarButton
              key="ancestors"
              text="…"
              tooltip="Show parent folders"
              onClick={(event) => setAncestorAnchor(event.currentTarget)}
            />,
          );
        continue;
      }
      const component = (
        <span
          key={key}
          ref={(node) => {
            if (node) items.current.set(i, node);
            else items.current.delete(i);
          }}
          style={{ display: 'inline-flex', minWidth: 0 }}
        >
          {i === 0 && rootContent !== undefined ? (
            rootContent
          ) : (
            <FolderChainButton
              key={key}
              first={i === 0}
              current={i === folderChainItems.length - 1}
              item={folderChainItems[i]}
            />
          )}
        </span>
      );
      components.push(component);
    }
    return components;
  })();

  return (
    <Box className={classes.navbarWrapper}>
      <Box className={classes.navbarContainer}>
        <SmartToolbarButton fileActionId={ChonkyActions.OpenParentFolder.id} />
        <Breadcrumbs
          ref={container}
          maxItems={Number.MAX_SAFE_INTEGER}
          className={classes.navbarBreadcrumbs}
          classes={{ ol: classes.breadcrumbList, li: classes.breadcrumbItem, separator: classes.separator }}
        >
          {folderChainComponents}
        </Breadcrumbs>
        <ToolbarButton
          text="Copy path"
          icon={ChonkyIconName.copy}
          iconOnly
          tooltip={copyLabel}
          onClick={() => void copyPath()}
        />
        <Menu anchorEl={ancestorAnchor} open={!!ancestorAnchor} onClose={() => setAncestorAnchor(null)}>
          {collapsedAncestors.map((item, index) => (
            <MenuItem
              key={item.file?.id ?? index}
              disabled={item.disabled || !item.onClick}
              onClick={() => {
                setAncestorAnchor(null);
                item.onClick?.();
              }}
            >
              {item.file?.name ?? 'Loading…'}
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
});

const useStyles = makeGlobalChonkyStyles((theme) => ({
  navbarWrapper: {
    paddingBottom: 2,
  },
  navbarContainer: {
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
  },
  upDirectoryButton: {
    fontSize: important(13),
    height: theme.toolbar.size,
    width: theme.toolbar.size,
    padding: '0px !important',
  },
  navbarBreadcrumbs: {
    fontSize: important(13),
    flexGrow: 100,
    minWidth: 0,
  },
  breadcrumbList: {
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  breadcrumbItem: {
    minWidth: 0,
    '&:first-child': { maxWidth: '55%', flexShrink: 0 },
    '&:last-child': { flexShrink: 1, overflow: 'hidden' },
  },
  separator: {
    width: separatorWidth,
    flex: `0 0 ${separatorWidth}px`,
    justifyContent: 'center',
    marginRight: important(0),
    marginLeft: important(0),
  },
}));
