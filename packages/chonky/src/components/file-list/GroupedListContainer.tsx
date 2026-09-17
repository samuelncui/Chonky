import React, { UIEvent, useEffect, useMemo, useRef } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { reduxActions } from '../../redux/reducers';
import {
  selectActiveGroupId,
  selectExpandedGroups,
  selectFileActionData,
  selectFileViewConfig,
  selectGrouping,
  selectRevealFileRequest,
} from '../../redux/selectors';
import { useChonkyDispatch, useChonkySelector, useParamSelector } from '../../redux/store';
import { FileViewMode } from '../../types/file-view.types';
import { FileListGroup } from '../../types/grouping.types';
import { useFileActionProps, useFileActionTrigger } from '../../util/file-actions';
import { useLocalizedFileActionStrings } from '../../util/i18n';
import { makeLocalChonkyStyles } from '../../util/styles';
import { ToolbarButton } from '../external/ToolbarButton';
import { SmartFileEntry } from './FileEntry';
import { useListContainerStyles } from './ListContainer';

type GroupRow =
  | { key: string; group: FileListGroup & { totalCount: number }; expanded: boolean }
  | { key: string; fileId: string; displayIndex: number };

const GroupAction = ({ actionId, groupId }: { actionId: string; groupId: string }) => {
  const action = useParamSelector(selectFileActionData, actionId);
  const { icon, active, disabled, hidden } = useFileActionProps(actionId, groupId);
  const trigger = useFileActionTrigger(actionId, groupId);
  const { buttonName, buttonTooltip } = useLocalizedFileActionStrings(action);
  if (!action?.button || hidden) return null;
  return (
    <ToolbarButton
      text={buttonName}
      tooltip={buttonTooltip}
      icon={icon}
      iconOnly={action.button.iconOnly}
      active={active}
      disabled={disabled}
      onClick={trigger}
    />
  );
};

const GroupHeader = ({ group, expanded }: { group: FileListGroup & { totalCount: number }; expanded: boolean }) => {
  const classes = useStyles();
  const dispatch = useChonkyDispatch();
  const activeId = useChonkySelector(selectActiveGroupId);
  const grouping = useChonkySelector(selectGrouping);
  return (
    <div
      className={classes.header}
      data-chonky-group-id={group.id}
      data-active={activeId === group.id}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className={classes.toggle}
        aria-expanded={expanded}
        aria-label={group.name}
        onClick={() => dispatch(reduxActions.toggleGroup(group.id))}
      >
        <span aria-hidden="true" className={classes.chevron}>
          {expanded ? '⌄' : '›'}
        </span>
        <span className={classes.label}>
          <strong>{group.name}</strong>
          {group.description && <span>{group.description}</span>}
        </span>
        <span className={classes.count}>
          {group.fileIds.length === group.totalCount
            ? group.totalCount
            : `${group.fileIds.length} / ${group.totalCount}`}{' '}
          {group.totalCount === 1 ? 'file' : 'files'}
        </span>
        {group.badge && <span className={classes.count}>{group.badge}</span>}
      </button>
      <div className={classes.actions} role="group" aria-label={`${group.name} actions`}>
        {(group.actionIds ?? grouping?.actionIds ?? []).map((actionId) => (
          <GroupAction key={actionId} actionId={actionId} groupId={group.id} />
        ))}
      </div>
    </div>
  );
};

/** One measured virtual list; only file rows contribute to selection indices. */
export const GroupedListContainer = ({ onScroll }: { onScroll?: (event: UIEvent<HTMLDivElement>) => void }) => {
  const dispatch = useChonkyDispatch();
  const listClasses = useListContainerStyles();
  const groups = useChonkySelector(selectExpandedGroups);
  const view = useChonkySelector(selectFileViewConfig);
  const reveal = useChonkySelector(selectRevealFileRequest);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const rows = useMemo(() => {
    const result: GroupRow[] = [];
    let displayIndex = 0;
    for (const group of groups) {
      result.push({ key: `group-${group.id}`, group, expanded: group.expanded });
      if (!group.expanded) continue;
      for (const fileId of group.fileIds) {
        result.push({ key: `file-${fileId}`, fileId, displayIndex: displayIndex++ });
      }
    }
    return result;
  }, [groups]);

  useEffect(() => {
    if (!reveal || reveal.handled) return;
    const index = rows.findIndex((row) => 'fileId' in row && row.fileId === reveal.fileId);
    if (index >= 0) virtuoso.current?.scrollToIndex({ index, align: 'center' });
    dispatch(reduxActions.acknowledgeRevealFile(reveal.revision));
  }, [dispatch, reveal, rows]);

  return (
    <Virtuoso
      ref={virtuoso}
      className={listClasses.listContainer}
      style={{ height: '100%' }}
      totalCount={rows.length}
      defaultItemHeight={view.entryHeight}
      computeItemKey={(index) => rows[index].key}
      onScroll={onScroll}
      itemContent={(index) => {
        const row = rows[index];
        return 'group' in row ? (
          <GroupHeader group={row.group} expanded={row.expanded} />
        ) : (
          <div style={{ minHeight: view.entryHeight }}>
            <SmartFileEntry fileId={row.fileId} displayIndex={row.displayIndex} fileViewMode={FileViewMode.List} />
          </div>
        );
      }}
    />
  );
};

const useStyles = makeLocalChonkyStyles((theme) => ({
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    padding: '8px 4px',
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.action.hover,
    '&[data-active="true"]': { background: theme.palette.action.selected },
  },
  toggle: {
    display: 'flex',
    flex: '1 1 240px',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    padding: 4,
    border: 0,
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}` },
  },
  chevron: { width: 16, fontSize: 20 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
    '& strong': { fontSize: 14, overflowWrap: 'anywhere' },
    '& > span': { fontSize: 12, color: theme.palette.text.secondary, overflowWrap: 'anywhere' },
  },
  count: { fontSize: 12, color: theme.palette.text.secondary, whiteSpace: 'nowrap' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 4, marginLeft: 'auto' },
}));
