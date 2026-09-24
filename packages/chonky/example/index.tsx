import { useCallback, useMemo, useRef, useState } from 'react';
import { DuplicatesDemo } from './duplicates';
import { SparseDemo } from './sparse';
import { createRoot } from 'react-dom/client';

import {
  ChonkyActions,
  ChonkyIconName,
  defineFileAction,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  type FileActionHandler,
  type FileBrowserHandle,
  type FileData,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const sampleFiles: FileData[] = [
  { id: 'photos', name: 'Photos', isDir: true, childrenCount: 12 },
  { id: 'archive', name: 'Archive', isDir: true, childrenCount: 3 },
  { id: 'alpha', name: 'alpha.txt', size: 1024, modDate: '2026-01-02' },
  { id: 'bravo', name: 'bravo.mp4', size: 2_000_000, modDate: '2026-01-03' },
  { id: 'secret', name: '.secret', size: 32, isHidden: true, modDate: '2026-01-01' },
];

const inlineIconAction = defineFileAction({
  id: 'inline_icon_action',
  button: { name: 'Icon action', toolbar: true, icon: ChonkyIconName.upload },
} as const);

const inlineTextAction = defineFileAction({
  id: 'inline_text_action',
  button: { name: 'Text-only action', toolbar: true },
} as const);

const inlineToolbar = new URLSearchParams(window.location.search).get('toolbar') === 'inline';
const inlineToolbarActions = [inlineIconAction, inlineTextAction];

const createLargeFileSet = (): FileData[] =>
  Array.from({ length: 5_000 }, (_, index) => ({
    id: `generated-${index}`,
    name: `generated-${index.toString().padStart(4, '0')}.txt`,
    size: index,
  }));

const App = () => {
  const browserRef = useRef<FileBrowserHandle>(null);
  const largeFiles = useMemo(createLargeFileSet, []);
  const [files, setFiles] = useState<FileData[]>(sampleFiles);
  const [lastAction, setLastAction] = useState('none');
  const [openedFile, setOpenedFile] = useState('none');
  const [lastMove, setLastMove] = useState('none');
  const [selection, setSelection] = useState('none');

  const handleFileAction = useCallback<FileActionHandler>((data) => {
    setLastAction(data.id);
    if (data.id === ChonkyActions.OpenFiles.id) {
      setOpenedFile(data.payload.targetFile?.id ?? 'selection');
    }
    if (data.id === ChonkyActions.MoveFiles.id) {
      setLastMove(`${data.payload.files.map((file) => file.id).join(',')}->${data.payload.destination.id}`);
    }
  }, []);

  const readSelection = useCallback(() => {
    const selectedIds = [...(browserRef.current?.getFileSelection() ?? [])].sort();
    setSelection(selectedIds.length > 0 ? selectedIds.join(',') : 'none');
  }, []);

  const selectAlpha = useCallback(() => {
    browserRef.current?.setFileSelection(new Set(['alpha']));
    setSelection('alpha');
  }, []);

  return (
    <main style={{ boxSizing: 'border-box', fontFamily: 'sans-serif', padding: 16 }}>
      <a href="/?example=duplicates">Identical files example</a>
      <h1 style={{ margin: '0 0 12px' }}>Chonky example</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setFiles(sampleFiles)}>
          Load sample files
        </button>
        <button type="button" onClick={() => setFiles(largeFiles)}>
          Load 5,000 files
        </button>
        <button type="button" onClick={selectAlpha}>
          Select alpha through ref
        </button>
        <button type="button" onClick={readSelection}>
          Read selection through ref
        </button>
      </div>
      <div aria-live="polite" style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        <span>
          Files: <output data-testid="file-count">{files.length}</output>
        </span>
        <span>
          Last action: <output data-testid="last-action">{lastAction}</output>
        </span>
        <span>
          Opened: <output data-testid="opened-file">{openedFile}</output>
        </span>
        <span>
          Last move: <output data-testid="last-move">{lastMove}</output>
        </span>
        <span>
          Selection: <output data-testid="selection">{selection}</output>
        </span>
      </div>
      <div style={{ height: 560 }}>
        <FileBrowser
          ref={browserRef}
          instanceId="example"
          iconComponent={ChonkyIconFA}
          folderChain={[
            { id: 'root', name: 'Library', isDir: true },
            { id: 'current', name: 'Example', isDir: true },
          ]}
          files={files}
          fileActions={inlineToolbar ? inlineToolbarActions : undefined}
          onFileAction={handleFileAction}
        >
          <FileNavbar />
          <FileToolbar layout={inlineToolbar ? 'inline' : 'responsive'} />
          <FileList />
          <FileContextMenu />
        </FileBrowser>
      </div>
    </main>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

const example = new URLSearchParams(window.location.search).get('example');
createRoot(rootElement).render(
  example === 'duplicates' ? <DuplicatesDemo /> : example === 'sparse' ? <SparseDemo /> : <App />,
);
