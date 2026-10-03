import { useCallback, useRef, useState } from 'react';
import {
  ChonkyActions,
  ChonkyIconName,
  defineFileAction,
  FileBrowser,
  FileContextMenu,
  FileList,
  fileMap,
  FileNavbar,
  FileToolbar,
  type FileAction,
  type FileBrowserHandle,
  type FileData,
  type GenericFileActionHandler,
  type ThumbnailGenerator,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const baseFileMap: fileMap.CustomFileMap<fileMap.CustomFileData> = {
  root: { id: 'root', name: 'Library', isDir: true, draggable: false, childrenIds: ['current'], childrenCount: 1 },
  current: {
    id: 'current',
    name: 'Example',
    isDir: true,
    draggable: false,
    parentId: 'root',
    childrenIds: ['photos', 'archive', 'alpha', 'bravo', 'secret'],
    childrenCount: 5,
  },
  photos: {
    id: 'photos',
    name: 'Photos',
    isDir: true,
    draggable: false,
    parentId: 'current',
    childrenIds: ['coast', 'portrait'],
    childrenCount: 2,
  },
  archive: {
    id: 'archive',
    name: 'Archive',
    isDir: true,
    draggable: false,
    parentId: 'current',
    childrenIds: ['archive-note'],
    childrenCount: 1,
  },
  alpha: { id: 'alpha', name: 'alpha.txt', size: 1024, modDate: '2026-01-02', parentId: 'current' },
  bravo: { id: 'bravo', name: 'bravo.mp4', size: 2_000_000, modDate: '2026-01-03', parentId: 'current' },
  secret: { id: 'secret', name: '.secret', size: 32, isHidden: true, modDate: '2026-01-01', parentId: 'current' },
  coast: {
    id: 'coast',
    name: 'coast.jpg',
    size: 420_000,
    parentId: 'photos',
    thumbnailUrl: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#4597ab"/><text x="2" y="24">O'Reilly 雪</text></svg>`)}`,
  },
  portrait: { id: 'portrait', name: 'holiday-snapshot.jpg', size: 810_000, parentId: 'photos' },
  'archive-note': { id: 'archive-note', name: 'readme.txt', size: 512, parentId: 'archive' },
};
const thumbnailGenerator: ThumbnailGenerator = (file) => {
  if (file.id !== 'portrait') return file.thumbnailUrl;
  const thumbnailUrl = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="#83c8df"/><path d="M0 80L45 20L90 80Z" fill="#427653"/><circle cx="94" cy="20" r="12" fill="#ffe4a0"/></svg>')}`;
  return new Promise((resolve) => setTimeout(() => resolve(thumbnailUrl), 250));
};
const newNote = defineFileAction({
  id: 'new_note',
  button: { name: 'New note', toolbar: true, icon: ChonkyIconName.file },
});
const resetAction = defineFileAction({ id: 'reset_demo', button: { name: 'Reset', toolbar: true } });
const actions = [newNote, resetAction];

export const FilesDemo = () => {
  const browser = useRef<FileBrowserHandle>(null);
  const {
    data: { files, folderChain, currentFolderId },
    methods,
    fileActionHandler,
  } = fileMap.useFileMap({
    baseFileMap,
    initialFolderId: 'current',
  });
  const [generateThumbnail, setGenerateThumbnail] = useState(false);
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
  const revealTarget = files.filter((file) => file && !file.isDir).at(-1);

  const reset = useCallback(() => {
    methods.resetFileMap();
    setGenerateThumbnail(false);
    setSelection([]);
    setPreview(undefined);
    setResult('Demo restored.');
    noteNumber.current = 1;
    setGeneration((value) => value + 1);
  }, [methods]);
  const onAction = useCallback<GenericFileActionHandler<FileAction>>(
    (data) => {
      fileActionHandler(data);
      if (data.id === resetAction.id) {
        reset();
        return;
      }
      if (data.id === newNote.id) {
        const number = noteNumber.current++;
        const note = {
          id: `note-${number}`,
          name: `note-${number}.txt`,
          size: 128,
          modDate: '2026-09-26',
          parentId: currentFolderId,
        };
        methods.setFileMap((current) => {
          const folder = current[currentFolderId];
          const childrenIds = [...folder.childrenIds!, note.id];
          return {
            ...current,
            [note.id]: note,
            [folder.id]: { ...folder, childrenIds, childrenCount: childrenIds.length },
          };
        });
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
      setResult(
        `Moved ${data.payload.files.map((file: FileData) => file.name).join(', ')} to ${data.payload.destination.name}.`,
      );
    },
    [fileActionHandler, methods, currentFolderId, reset],
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
            const largeFiles = Array.from({ length: 5_000 }, (_, index) => ({
              id: `generated-${index}`,
              name: `generated-${String(index).padStart(4, '0')}.txt`,
              size: index,
              parentId: 'current',
            }));
            methods.setFileMap((current) => ({
              ...current,
              ...Object.fromEntries(largeFiles.map((file) => [file.id, file])),
              current: {
                ...current.current,
                childrenIds: largeFiles.map((file) => file.id),
                childrenCount: largeFiles.length,
              },
            }));
            methods.setCurrentFolderId('current');
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
          disabled={!revealTarget}
          onClick={() => revealTarget && browser.current?.revealFile(revealTarget.id)}
        >
          Reveal last file
        </button>
        <button
          className="demo-button"
          onClick={() =>
            browser.current?.setFileSelection(
              new Set(files.flatMap((file) => (file?.name.endsWith('.txt') ? [file.id] : []))),
            )
          }
        >
          Select text files
        </button>
        <label>
          <input
            type="checkbox"
            checked={generateThumbnail}
            onChange={(event) => setGenerateThumbnail(event.target.checked)}
          />
          Generate photo thumbnail
        </label>
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
          thumbnailGenerator={generateThumbnail ? thumbnailGenerator : undefined}
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
        selected alongside a dragged file. In Photos, enable Generate photo thumbnail and switch to Grid to see a
        delayed preview for holiday-snapshot.jpg. Disable it to restore the file icon.
      </p>
    </section>
  );
};
