import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ChonkyActions,
  ChonkyIconName,
  defineFileAction,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  type FileAction,
  type FileBrowserHandle,
  type FileData,
  type GenericFileActionHandler,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const folders: FileData[] = [
  { id: 'root', name: 'Library', isDir: true, draggable: false },
  { id: 'current', name: 'Example', isDir: true, draggable: false },
  { id: 'photos', name: 'Photos', isDir: true, draggable: false },
  { id: 'archive', name: 'Archive', isDir: true, draggable: false },
];
const initialFiles = (): Record<string, FileData[]> => ({
  root: [folders[1]],
  current: [
    ...folders.slice(2),
    { id: 'alpha', name: 'alpha.txt', size: 1024, modDate: '2026-01-02' },
    { id: 'bravo', name: 'bravo.mp4', size: 2_000_000, modDate: '2026-01-03' },
    { id: 'secret', name: '.secret', size: 32, isHidden: true, modDate: '2026-01-01' },
  ],
  photos: [
    { id: 'coast', name: 'coast.jpg', size: 420_000 },
    { id: 'portrait', name: 'portrait.jpg', size: 810_000 },
  ],
  archive: [{ id: 'archive-note', name: 'readme.txt', size: 512 }],
});
const newNote = defineFileAction({
  id: 'new_note',
  button: { name: 'New note', toolbar: true, icon: ChonkyIconName.file },
});
const resetAction = defineFileAction({ id: 'reset_demo', button: { name: 'Reset', toolbar: true } });
const actions = [newNote, resetAction];

export const FilesDemo = () => {
  const browser = useRef<FileBrowserHandle>(null);
  const [contents, setContents] = useState(initialFiles);
  const [folderId, setFolderId] = useState('current');
  const [selection, setSelection] = useState<string[]>([]);
  const [preview, setPreview] = useState<FileData>();
  const [result, setResult] = useState(
    'Open a folder or select a file. Drag a file into Photos or Archive to move it.',
  );
  const [generation, setGeneration] = useState(0);
  const [toolbar, setToolbar] = useState<'inline' | 'responsive'>(
    new URLSearchParams(window.location.search).get('toolbar') === 'inline' ? 'inline' : 'responsive',
  );
  const noteNumber = useRef(1);
  const largeFiles = useMemo<FileData[]>(
    () =>
      Array.from({ length: 5_000 }, (_, index) => ({
        id: `generated-${index}`,
        name: `generated-${String(index).padStart(4, '0')}.txt`,
        size: index,
      })),
    [],
  );
  const files = contents[folderId].map((file) =>
    file.isDir ? { ...file, childrenCount: contents[file.id]?.length ?? 0 } : file,
  );
  const folderChain = folders.slice(0, folderId === 'root' ? 1 : 2);
  if (folderId === 'photos' || folderId === 'archive') folderChain.push(folders.find((file) => file.id === folderId)!);

  const reset = useCallback(() => {
    setContents(initialFiles());
    setFolderId('current');
    setSelection([]);
    setPreview(undefined);
    setResult('Demo restored.');
    noteNumber.current = 1;
    setGeneration((value) => value + 1);
  }, []);
  const onAction = useCallback<GenericFileActionHandler<FileAction>>(
    (data) => {
      if (data.id === resetAction.id) {
        reset();
        return;
      }
      if (data.id === newNote.id) {
        const number = noteNumber.current++;
        const note = { id: `note-${number}`, name: `note-${number}.txt`, size: 128, modDate: '2026-09-26' };
        setContents((current) => ({ ...current, [folderId]: [...current[folderId], note] }));
        setResult(`Created ${note.name} in this folder.`);
        return;
      }
      if (data.id === ChonkyActions.ChangeSelection.id) {
        setSelection([...data.payload.selection]);
        return;
      }
      if (data.id === ChonkyActions.OpenFiles.id) {
        const file = data.payload.targetFile ?? data.payload.files[0];
        if (!file) return;
        if (file.isDir) {
          setFolderId(file.id);
          browser.current?.setFileSelection(new Set());
          setPreview(undefined);
          setResult(`Opened ${file.name}.`);
        } else {
          setPreview(file);
          setResult(`Opened ${file.name} in the fixture preview below.`);
        }
        return;
      }
      if (data.id !== ChonkyActions.MoveFiles.id) return;
      const destination = data.payload.destination;
      const moved = data.payload.files.filter((file: FileData) => !file.isDir);
      if (!moved.length || !contents[destination.id]) return;
      const movedIds = new Set(moved.map((file: FileData) => file.id));
      setContents((current) => {
        const next = Object.fromEntries(
          Object.entries(current).map(([id, entries]) => [id, entries.filter((file) => !movedIds.has(file.id))]),
        );
        next[destination.id] = [...next[destination.id], ...moved];
        return next;
      });
      setResult(`Moved ${moved.map((file: FileData) => file.name).join(', ')} to ${destination.name}.`);
    },
    [contents, folderId, reset],
  );

  return (
    <section aria-labelledby="files-title">
      <h1 id="files-title">Ordinary files</h1>
      <p className="demo-description">
        Browse folders, preview fixture metadata, create notes, and move files in memory. Try Filter, list/grid views,
        sorting, keyboard selection, and the context menu.
      </p>
      <div className="demo-controls">
        <button
          className="demo-button"
          onClick={() => {
            setContents((current) => ({ ...current, current: largeFiles }));
            setFolderId('current');
            setPreview(undefined);
            setSelection([]);
            setGeneration((value) => value + 1);
            setResult('Loaded 5,000 files. Reveal last file jumps to the end of the virtual list.');
          }}
        >
          Load 5,000 files
        </button>
        <button
          className="demo-button"
          disabled={!files.some((file) => !file.isDir)}
          onClick={() => browser.current?.revealFile(files.filter((file) => !file.isDir).at(-1)!.id)}
        >
          Reveal last file
        </button>
        <button
          className="demo-button"
          onClick={() =>
            browser.current?.setFileSelection(
              new Set(files.filter((file) => file.name.endsWith('.txt')).map((file) => file.id)),
            )
          }
        >
          Select text files
        </button>
        <label>
          Toolbar layout{' '}
          <select value={toolbar} onChange={(event) => setToolbar(event.target.value as typeof toolbar)}>
            <option value="responsive">Responsive</option>
            <option value="inline">Inline</option>
          </select>
        </label>
      </div>
      <div className="demo-stats" aria-live="polite">
        <span>
          <output data-testid="file-count">{files.length}</output> entries in this folder
        </span>
        <span>
          <output data-testid="selection-count">{selection.length}</output> selected
        </span>
      </div>
      <div className="demo-browser">
        <FileBrowser
          key={generation}
          ref={browser}
          instanceId="files"
          files={files}
          folderChain={folderChain}
          iconComponent={ChonkyIconFA}
          fileActions={actions}
          onFileAction={onAction}
        >
          <FileNavbar />
          <FileToolbar layout={toolbar} />
          <FileList />
          <FileContextMenu />
        </FileBrowser>
      </div>
      <p className="demo-result" role="status" data-testid="files-result">
        {result}
      </p>
      {preview && (
        <section className="demo-preview" aria-label="Fixture preview">
          <h2>{preview.name}</h2>
          <pre>{`ID: ${preview.id}\nSize: ${preview.size ?? 0} bytes\nThis local fixture contains metadata only; no media is downloaded.`}</pre>
        </section>
      )}
      <p className="demo-help">
        Selection through a browser ref is demonstrated by Select text files. Reveal selects and scrolls to a displayed
        file; a filtered-out target leaves the current selection unchanged. Folders are not draggable, even when
        selected alongside a dragged file.
      </p>
    </section>
  );
};
