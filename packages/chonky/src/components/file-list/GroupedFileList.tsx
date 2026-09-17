import React, { ReactNode, useEffect, useId } from 'react';
import { reduxActions } from '../../redux/reducers';
import { selectFileViewConfig, selectors } from '../../redux/selectors';
import { useChonkyDispatch, useChonkySelector } from '../../redux/store';
import { makeLocalChonkyStyles } from '../../util/styles';
import { FileList } from './FileList';

import { FileGroup } from '../../types/grouping.types';
export type { FileGroup } from '../../types/grouping.types';

export interface GroupedFileListProps {
  groups: FileGroup[];
  /** One group is expanded at a time. The surrounding FileBrowser owns its loaded members. */
  activeGroupId?: string;
  onGroupChange: (id: string | undefined) => void;
  disabled?: boolean;
  /** Query/loading controls belong to the caller, not the generic browser. */
  beforeFiles?: ReactNode;
  afterFiles?: ReactNode;
}

/** Controlled grouping around the ordinary file list; group headers are never selectable Files. */
export const GroupedFileList = ({
  groups,
  activeGroupId,
  onGroupChange,
  disabled,
  beforeFiles,
  afterFiles,
}: GroupedFileListProps) => {
  const classes = useStyles();
  const id = useId();
  const dispatch = useChonkyDispatch();
  const view = useChonkySelector(selectFileViewConfig);
  const count = useChonkySelector(selectors.getDisplayFileIds).length;
  useEffect(() => {
    dispatch(reduxActions.clearSelection());
  }, [activeGroupId, dispatch]);
  return (
    <div className={classes.groups}>
      {groups.map((group, index) => {
        const expanded = activeGroupId === group.id;
        const panel = `${id}-${index}`;
        return (
          <section key={group.id} className={classes.group}>
            <button
              type="button"
              className={classes.heading}
              aria-expanded={expanded}
              aria-controls={panel}
              disabled={disabled}
              onClick={() => onGroupChange(expanded ? undefined : group.id)}
            >
              <span aria-hidden="true" className={classes.chevron}>
                {expanded ? '⌄' : '›'}
              </span>
              <span className={classes.label}>
                <strong title={group.name}>{group.name}</strong>
                {group.description && <span>{group.description}</span>}
              </span>
              {group.badge && <span className={classes.badge}>{group.badge}</span>}
            </button>
            {expanded && (
              <div id={panel}>
                {beforeFiles}
                {!!count && (
                  <div
                    style={{
                      height: Math.max(160, Math.min(count, 6) * view.entryHeight),
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0,
                    }}
                  >
                    <FileList />
                  </div>
                )}
                {afterFiles}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

const useStyles = makeLocalChonkyStyles((theme) => ({
  groups: { minWidth: 0 },
  group: { border: `1px solid ${theme.palette.divider}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  heading: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: 6,
    padding: '12px 8px',
    border: 0,
    background: 'transparent',
    color: 'inherit',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer',
    '&:hover': { background: theme.palette.action.hover },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
    '&:disabled': { opacity: 0.6, cursor: 'default' },
  },
  chevron: { flexShrink: 0, width: 18, fontSize: 20, textAlign: 'center' },
  label: {
    minWidth: 0,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    '& strong': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14 },
    '& > span': { fontSize: 12, color: theme.palette.text.secondary, lineHeight: 1.5 },
  },
  badge: {
    flexShrink: 0,
    borderRadius: 6,
    background: theme.palette.action.selected,
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 7px',
  },
}));
