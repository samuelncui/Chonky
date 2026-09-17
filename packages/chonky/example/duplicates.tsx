import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ChonkyActions,
  ChonkyIconName,
  CustomVisibilityState,
  defineFileAction,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  type FileAction,
  type FileActionState,
  type FileBrowserHandle,
  type FileData,
  type FileGrouping,
  type FileListGroup,
  type GenericFileActionHandler,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const keepAction = defineFileAction({
  id: 'keep_only_this',
  requiresSelection: true,
  button: { name: 'Keep only this', contextMenu: true, icon: ChonkyIconName.toggleOn },
  customVisibility: (state) =>
    state.group && state.selectedFilesForAction.length === 1 && state.group.fileIds.length > 1
      ? CustomVisibilityState.Default
      : CustomVisibilityState.Disabled,
});
const deleteAction = defineFileAction({
  id: 'delete_selected_duplicates',
  requiresSelection: true,
  button: { name: 'Delete selected', contextMenu: true, icon: ChonkyIconName.trash },
  customVisibility: (state) => (state.group ? CustomVisibilityState.Default : CustomVisibilityState.Disabled),
});
const actions = [keepAction, deleteAction];
const groupActionIds = actions.map((action) => action.id);

type Dataset = { files: FileData[]; groups: FileListGroup[] };
const sampleDataset = (): Dataset => {
  const samples = [
    { title: 'Summer coast', names: ['coast.jpg', 'coast-copy.jpg', 'IMG_2048.jpg'], size: '4.2 MB', bytes: 4_200_000 },
    { title: 'Annual report', names: ['report.pdf', 'report.pdf', 'report-final.pdf'], size: '820 KB', bytes: 820_000 },
    {
      title: 'Interview recording',
      names: ['interview.wav', 'interview-backup.wav'],
      size: '38 MB',
      bytes: 38_000_000,
    },
    {
      title: 'Project archive',
      names: ['project.zip', 'project-copy.zip', 'project-old.zip'],
      size: '12 MB',
      bytes: 12_000_000,
    },
  ];
  const locations = ['Library / Originals', 'Backup / September', 'Downloads'];
  const files: FileData[] = [];
  const groups = samples.map((sample, groupIndex) => {
    const fileIds = sample.names.map((name, index) => {
      const id = `sample-${groupIndex}-${index}`;
      files.push({
        id,
        name,
        size: sample.bytes,
        modDate: '2026-09-17',
        details: [`${locations[index]} / ${name} · ${sample.size}`],
      });
      return id;
    });
    return { id: `group-${groupIndex}`, name: sample.title, description: 'Identical content', fileIds };
  });
  return { files, groups };
};

const largeDataset = (): Dataset => {
  const files: FileData[] = [];
  const groups = Array.from({ length: 1_000 }, (_, index) => {
    const fileIds = Array.from({ length: 5 }, (_, copy) => {
      const id = `large-${index}-${copy}`;
      const name = `document-${String(index).padStart(4, '0')}.pdf`;
      files.push({ id, name, size: 820_000, details: [`Copy ${copy + 1} / ${name} · 820 KB`] });
      return id;
    });
    return { id: `large-group-${index}`, name: `Document ${index + 1}`, description: 'Identical content', fileIds };
  });
  return { files, groups };
};

export const DuplicatesDemo = () => {
  const browser = useRef<FileBrowserHandle>(null);
  const [dataset, setDataset] = useState(sampleDataset);
  const [mode, setMode] = useState<'continuous' | 'single'>('continuous');
  const fileActions = useMemo(
    () => [
      ...actions,
      ...(['continuous', 'single'] as const).map((layout) =>
        defineFileAction({
          id: `group_layout_${layout}`,
          button: {
            name: layout === 'continuous' ? 'Continuous groups' : 'One group at a time',
            toolbar: true,
            group: 'Options',
            icon: mode === layout ? ChonkyIconName.toggleOn : ChonkyIconName.toggleOff,
          },
          customVisibility: () => (mode === layout ? CustomVisibilityState.Active : CustomVisibilityState.Default),
        }),
      ),
    ],
    [mode],
  );
  const [activeGroupId, setActiveGroupId] = useState<string>();
  const [selection, setSelection] = useState<string[]>([]);
  const [result, setResult] = useState('Select files in a group to get started.');
  const [generation, setGeneration] = useState(0);
  const grouping = useMemo<FileGrouping>(
    () => ({
      groups: dataset.groups,
      mode,
      activeGroupId,
      onGroupChange: setActiveGroupId,
      actionIds: groupActionIds,
    }),
    [dataset.groups, mode, activeGroupId],
  );

  const onAction = useCallback<GenericFileActionHandler<FileAction>>((data) => {
    if (data.id === 'group_layout_continuous' || data.id === 'group_layout_single') {
      setMode(data.id === 'group_layout_continuous' ? 'continuous' : 'single');
      return;
    }
    if (data.id === ChonkyActions.ChangeSelection.id) {
      setSelection([...data.payload.selection]);
      return;
    }
    if (data.id !== keepAction.id && data.id !== deleteAction.id) return;
    const actionState: FileActionState<{}> = data.state;
    const group = actionState.group;
    const selected = actionState.selectedFilesForAction;
    if (!group || !selected.length) return;
    const selectedIds = new Set(selected.map((file) => file.id));
    const removedIds = new Set(
      data.id === keepAction.id ? group.fileIds.filter((id) => !selectedIds.has(id)) : selectedIds,
    );
    setDataset((previous) => ({
      files: previous.files.filter((file) => !removedIds.has(file.id)),
      groups: previous.groups
        .map((entry) => ({ ...entry, fileIds: entry.fileIds.filter((id) => !removedIds.has(id)) }))
        .filter((entry) => entry.fileIds.length > 0),
    }));
    setResult(
      data.id === keepAction.id
        ? `Kept ${selected[0].name}; deleted ${removedIds.size} other ${removedIds.size === 1 ? 'file' : 'files'}.`
        : `Deleted ${removedIds.size} selected ${removedIds.size === 1 ? 'file' : 'files'}.`,
    );
  }, []);

  const load = (next: Dataset) => {
    setDataset(next);
    setActiveGroupId(undefined);
    setSelection([]);
    setResult('Select files in a group to get started.');
    setGeneration((value) => value + 1);
  };

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <a href="/" style={{ color: '#4263a6', fontSize: 13 }}>
        ← All examples
      </a>
      <h1 style={{ margin: '16px 0 8px', fontSize: 26 }}>Identical files</h1>
      <p style={{ margin: '0 0 20px', color: '#5c6573', lineHeight: 1.6 }}>
        Compare copies, keep one, or delete a selection. Changes affect demo data only.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button type="button" onClick={() => load(sampleDataset())}>
          Reset demo
        </button>
        <button type="button" onClick={() => load(largeDataset())}>
          Load 1,000 groups
        </button>
        <button type="button" onClick={() => browser.current?.revealFile(dataset.files[dataset.files.length - 1]?.id)}>
          Reveal last file
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 14, color: '#5c6573' }}>
          <output data-testid="group-count">{dataset.groups.length}</output> groups ·{' '}
          <output data-testid="duplicate-file-count">{dataset.files.length}</output> files ·{' '}
          <output data-testid="duplicate-selection-count">{selection.length}</output> selected
        </span>
      </div>
      <div style={{ height: 'min(680px, 68vh)', minHeight: 320 }}>
        <FileBrowser
          key={generation}
          ref={browser}
          instanceId="duplicates"
          files={dataset.files}
          grouping={grouping}
          iconComponent={ChonkyIconFA}
          fileActions={fileActions}
          onFileAction={onAction}
          disableDragAndDrop
          defaultSortActionId={null}
          folderChain={[{ id: 'duplicates-root', name: 'Identical files', isDir: true }]}
        >
          <FileNavbar />
          <FileToolbar />
          <FileList emptyPlaceholder={<p style={{ padding: 20 }}>No files to display.</p>} />
          <FileContextMenu />
        </FileBrowser>
      </div>
      <p aria-live="polite" data-testid="duplicate-result" style={{ fontSize: 14, marginBottom: 8 }}>
        {result}
      </p>
      <p style={{ fontSize: 12, color: '#5c6573', margin: 0 }}>
        Ctrl / ⌘ adds to the selection. Shift selects a range. Choosing another group clears the previous selection.
      </p>
    </main>
  );
};
