import { useRef, useState } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useDispatch, useSelector, useStore } from 'react-redux';
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

const review = createSlice({
  name: 'review',
  initialState: { note: '', savedNote: 'No note saved.' },
  reducers: {
    edit: (state, action: { payload: string }) => {
      state.note = action.payload;
    },
    save: (state) => {
      state.savedNote = state.note.trim() ? `Saved note: ${state.note}` : 'No note saved.';
    },
    reset: () => ({ note: '', savedNote: 'No note saved.' }),
  },
});
type ReviewState = ReturnType<typeof review.reducer>;

const ReviewStatus = () => {
  const savedNote = useSelector((state: ReviewState) => state.savedNote);
  return (
    <span data-testid="toolbar-review-status">
      {savedNote === 'No note saved.' ? 'Review pending' : 'Review saved'}
    </span>
  );
};

const ReviewFooter = ({ selection, path }: { selection: number; path: string }) => {
  const note = useSelector((state: ReviewState) => state.note);
  const savedNote = useSelector((state: ReviewState) => state.savedNote);
  const dispatch = useDispatch();
  return (
    <div className="demo-footer">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          dispatch(review.actions.save());
        }}
      >
        <label>
          Review note{' '}
          <input
            value={note}
            onChange={(event) => dispatch(review.actions.edit(event.target.value))}
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
  );
};

export const PresentationDemo = () => {
  const [store] = useState(() => configureStore({ reducer: review.reducer }));
  return (
    <Provider store={store}>
      <PresentationBrowser />
    </Provider>
  );
};

const PresentationBrowser = () => {
  const store = useStore<ReviewState>();
  const [dark, setDark] = useState(false);
  const browser = useRef<FileBrowserHandle>(null);
  const [depth, setDepth] = useState(chain.length - 1);
  const [empty, setEmpty] = useState(false);
  const [inboxFiles, setInboxFiles] = useState<FileData[]>([]);
  const [reviewFiles, setReviewFiles] = useState(documents);
  const [selection, setSelection] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState('Priority starts descending. Choose Sort by priority again to reverse it.');
  const folderChain = empty
    ? [...chain.slice(0, -1), { id: 'inbox', name: 'Inbox', isDir: true }]
    : chain.slice(0, depth + 1);
  const files = empty ? inboxFiles : depth === chain.length - 1 ? reviewFiles : [chain[depth + 1]];
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
        <label>
          <input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} /> Dark theme
        </label>
        <button className="demo-button" onClick={() => navigate(chain.length - 1)}>
          Open deliverables
        </button>
        <button
          className="demo-button"
          disabled={reviewFiles.length > documents.length}
          onClick={() => {
            navigate(chain.length - 1);
            setReviewFiles([
              ...documents,
              ...Array.from({ length: 60 }, (_, index) => ({
                id: `review-${index}`,
                name: `review-${String(index).padStart(2, '0')}.txt`,
                size: 120 + index,
                priority: 60 - index,
                details: [`Review queue · Priority: ${60 - index}`],
              })),
            ]);
          }}
        >
          Load 60 review files
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
            setReviewFiles(documents);
            store.dispatch(review.actions.reset());
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
          darkMode={dark}
          footer={<ReviewFooter selection={selection} path={path} />}
        >
          <FileNavbar
            rootContent={
              <button className="demo-button" onClick={() => navigate(0)}>
                Workspace
              </button>
            }
            path={path}
          />
          <FileToolbar>
            <ReviewStatus />
          </FileToolbar>
          <FileList
            emptyPlaceholder={
              <div className="demo-empty">
                <strong>No review files yet.</strong>
                <p>This is a caller-provided empty state with a useful action.</p>
                <details>
                  <summary>Example directory error details</summary>
                  <p>The review directory could not be read. No files are available until the caller retries.</p>
                  <p>
                    Requested directory: Workspace / Projects / Design system / Releases / Autumn collection / Inbox.
                  </p>
                  <p>The directory connection timed out while requesting its file names and review metadata.</p>
                  <p>Check that the directory is available and that you have permission to read its contents.</p>
                  <button
                    className="demo-button"
                    onClick={() =>
                      setResult('Directory retry requested. This in-memory example keeps the folder empty.')
                    }
                  >
                    Retry directory
                  </button>
                </details>
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
