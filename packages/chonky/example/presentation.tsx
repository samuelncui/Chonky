import { useRef, useState } from 'react';
import {
  ChonkyActions,
  defineFileAction,
  FileBrowser,
  FileContextMenu,
  FileList,
  FileNavbar,
  FileToolbar,
  SortOrder,
  type FileAction,
  type FileBrowserHandle,
  type FileData,
  type GenericFileActionHandler,
} from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

const chain = ['Workspace', 'Projects', 'Design system', 'Releases', 'Autumn collection', 'Deliverables'].map(
  (name, index) => ({ id: `folder-${index}`, name, isDir: true }),
);
const documents: FileData[] = [
  {
    id: 'report',
    name: 'Report.pdf',
    size: 820_000,
    priority: 100,
    status: {
      label: 'Ready for review',
      color: '#26804b',
      marker: { label: 'Changed since review', color: '#3666b5', kind: 'changed' },
    },
    details: [
      'Owner: Alex · Priority: 100',
      'Revised figures and supporting notes',
      'Three detail lines share one measured file row.',
    ],
  },
  {
    id: 'artwork',
    name: 'Artwork.svg',
    size: 24_000,
    priority: 70,
    status: {
      label: 'Needs attention',
      color: '#ae6a14',
      marker: { label: 'Missing approval', color: '#ae6a14', kind: 'warning' },
    },
    details: ['Owner: Morgan · Priority: 70', 'Waiting for approval'],
  },
  ...Array.from({ length: 60 }, (_, index) => ({
    id: `review-${index}`,
    name: `review-${String(index).padStart(2, '0')}.txt`,
    size: 120 + index,
    priority: 60 - index,
    details: [`Review queue · Priority: ${60 - index}`],
  })),
  {
    id: 'review-notes',
    name: 'review-notes.txt',
    size: 1024,
    priority: 0,
    status: {
      label: 'Review status unknown',
      color: '#6c7585',
      marker: { label: 'Not reviewed', color: '#6c7585', kind: 'unknown' },
    },
    details: ['Owner: Sam · Priority: 0'],
  },
];
const sortPriority = defineFileAction({
  id: 'sort_by_priority',
  sortKeySelector: (file) => file?.priority,
  initialSortOrder: SortOrder.DESC,
  button: { name: 'Sort by priority', toolbar: true, group: 'Options' },
});
const actions = [sortPriority];

export const PresentationDemo = () => {
  const browser = useRef<FileBrowserHandle>(null);
  const [depth, setDepth] = useState(chain.length - 1);
  const [empty, setEmpty] = useState(false);
  const [inboxFiles, setInboxFiles] = useState<FileData[]>([]);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState('No note saved.');
  const [selection, setSelection] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState('Priority starts descending. Choose Sort by priority again to reverse it.');
  const folderChain = empty
    ? [...chain.slice(0, -1), { id: 'inbox', name: 'Inbox', isDir: true }]
    : chain.slice(0, depth + 1);
  const files = empty ? inboxFiles : depth === chain.length - 1 ? documents : [chain[depth + 1]];
  const path = `demo://${folderChain.map((folder) => folder.name).join('/')}`;
  const navigate = (nextDepth: number) => {
    setDepth(nextDepth);
    setEmpty(false);
    browser.current?.setFileSelection(new Set());
  };
  const onAction: GenericFileActionHandler<FileAction> = (data) => {
    if (data.id === ChonkyActions.ChangeSelection.id) setSelection(data.payload.selection.size);
    if (data.id !== ChonkyActions.OpenFiles.id) return;
    const file = data.payload.targetFile ?? data.payload.files[0];
    if (!file) return;
    if (file.isDir) {
      navigate(chain.findIndex((folder) => folder.id === file.id));
      return;
    }
    setResult(`OpenFiles event: ${file.name}. This example demonstrates the event; the caller supplies file content.`);
  };

  return (
    <section aria-labelledby="presentation-title">
      <h1 id="presentation-title">Presentation and review</h1>
      <p className="demo-description">
        Status labels and supplemental markers, variable detail lines, a custom root breadcrumb, Copy path, and an
        editable footer. Narrow the window to fold intermediate folders into the parent menu.
      </p>
      <p className="demo-help">
        Hover or focus a status indicator for its text label. Supplemental markers: Δ changed, ! needs attention, ?
        unknown.
      </p>
      <div className="demo-controls">
        <button className="demo-button" onClick={() => navigate(chain.length - 1)}>
          Open deliverables
        </button>
        <button
          className="demo-button"
          onClick={() => {
            setEmpty(true);
            browser.current?.setFileSelection(new Set());
          }}
        >
          Show empty folder
        </button>
        <button
          className="demo-button"
          disabled={empty || depth !== chain.length - 1}
          onClick={() => browser.current?.revealFile('review-notes')}
        >
          Reveal review-notes.txt
        </button>
        <button
          className="demo-button"
          onClick={() => {
            navigate(chain.length - 1);
            setInboxFiles([]);
            setNote('');
            setSavedNote('No note saved.');
            setSelection(0);
            setGeneration((value) => value + 1);
            setResult('Demo restored. Priority starts descending.');
          }}
        >
          Reset demo
        </button>
      </div>
      <p className="demo-help">
        Custom priority sorting uses initialSortOrder: DESC. Reveal only acts on displayed, selectable files. The footer
        stays available while the file list scrolls.
      </p>
      <div className="demo-browser">
        <FileBrowser
          key={generation}
          ref={browser}
          instanceId="presentation"
          files={files}
          folderChain={folderChain}
          fileActions={actions}
          defaultSortActionId={sortPriority.id}
          iconComponent={ChonkyIconFA}
          disableDragAndDrop
          onFileAction={onAction}
          footer={
            <div className="demo-footer">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  setSavedNote(note.trim() ? `Saved note: ${note}` : 'No note saved.');
                }}
              >
                <label>
                  Review note{' '}
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Write a note for this review"
                  />
                </label>
                <button className="demo-button" type="submit">
                  Save note
                </button>
              </form>
              <p aria-live="polite" data-testid="saved-note">
                {savedNote}
              </p>
              <p>
                <output data-testid="presentation-selection-count">{selection}</output> selected ·{' '}
                <span data-testid="presentation-path">{path}</span>
              </p>
            </div>
          }
        >
          <FileNavbar
            rootContent={
              <button className="demo-button" onClick={() => navigate(0)}>
                Workspace
              </button>
            }
            path={path}
          />
          <FileToolbar />
          <FileList
            emptyPlaceholder={
              <div className="demo-empty">
                <strong>No review files yet.</strong>
                <p>This is a caller-provided empty state with a useful action.</p>
                <button
                  className="demo-button"
                  onClick={() => setInboxFiles([{ ...documents[0], id: 'inbox-report' }])}
                >
                  Add example report
                </button>
              </div>
            }
          />
          <FileContextMenu />
        </FileBrowser>
      </div>
      <p className="demo-result" role="status" aria-label="Action result">
        {result}
      </p>
    </section>
  );
};
