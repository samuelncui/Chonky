import { render, screen, waitFor } from '@testing-library/react';
import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileList } from '../src/components/file-list/FileList';
import { reduxActions, rootReducer } from '../src/redux/reducers';
import { selectHiddenFileIdMap, selectors } from '../src/redux/selectors';

const scrollToIndex = vi.fn();

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex }));
    return React.createElement(
      'div',
      { 'data-testid': 'virtual-list', 'data-total-count': props.totalCount },
      props.totalCount > 0 ? props.itemContent(0) : null,
    );
  }),
  VirtuosoGrid: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex }));
    return React.createElement(
      'div',
      { 'data-testid': 'virtual-grid', 'data-total-count': props.totalCount },
      props.totalCount > 0 ? props.itemContent(0) : null,
    );
  }),
}));

describe('file list', () => {
  const files = [
    { id: 'file-a', name: 'File A' },
    { id: 'file-b', name: 'File B' },
  ];

  it('keeps Redux state canonical', () => {
    const state = rootReducer(undefined, reduxActions.setRawFiles(files));

    expect(state.files).toEqual(files);
    expect(state.fileIds).toEqual(['file-a', 'file-b']);
    expect(Object.keys(state.fileMap)).toEqual(['file-a', 'file-b']);
    expect(selectors.getDisplayFileIds(state)).toEqual(['file-a', 'file-b']);
  });

  it('exposes filtered files to selection transforms', () => {
    let state = rootReducer(undefined, reduxActions.setRawFiles(files));
    state = rootReducer(state, reduxActions.setSearchString('File A'));

    expect(selectHiddenFileIdMap(state)).toEqual({ 'file-b': true });
  });

  it('acknowledges only the current reveal request', () => {
    let state = rootReducer(undefined, reduxActions.revealFile('file-a'));
    const firstRevision = state.revealFileRequest?.revision ?? 0;
    state = rootReducer(state, reduxActions.revealFile('file-b'));

    state = rootReducer(state, reduxActions.acknowledgeRevealFile(firstRevision));
    expect(state.revealFileRequest).toMatchObject({ fileId: 'file-b', handled: false });

    state = rootReducer(state, reduxActions.acknowledgeRevealFile(state.revealFileRequest?.revision ?? 0));
    expect(state.revealFileRequest).toMatchObject({ fileId: 'file-b', handled: true });
  });

  it('applies the configured list row height', async () => {
    render(
      <FileBrowser files={[files[0]]} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );

    const list = await screen.findByTestId('virtual-list');
    expect((list.firstElementChild as HTMLElement).style.height).toBe('30px');
  });

  it('renders new files when switching between equal-sized folders', async () => {
    const { container, rerender } = render(
      <FileBrowser files={[{ id: 'folder-a-file', name: 'Folder A file' }]} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );

    await waitFor(() => expect(container.querySelector('[data-chonky-file-id="folder-a-file"]')).not.toBeNull());

    rerender(
      <FileBrowser files={[{ id: 'folder-b-file', name: 'Folder B file' }]} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );

    await waitFor(() => expect(container.querySelector('[data-chonky-file-id="folder-b-file"]')).not.toBeNull());
    expect(container.querySelector('[data-chonky-file-id="folder-a-file"]')).toBeNull();
  });

  beforeEach(() => {
    scrollToIndex.mockClear();
  });

  it.each([
    ['list', 'enable_list_view', 'virtual-list'],
    ['grid', 'enable_grid_view', 'virtual-grid'],
  ])('selects and scrolls a revealed file into %s view', async (_view, defaultFileViewActionId, testId) => {
    const ref = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    const { rerender } = render(
      <FileBrowser ref={ref} files={files} defaultFileViewActionId={defaultFileViewActionId} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );

    await screen.findByTestId(testId);
    ref.current?.revealFile('file-b');

    await waitFor(() => expect(ref.current?.getFileSelection()).toEqual(new Set(['file-b'])));
    expect(scrollToIndex).toHaveBeenCalledWith({ index: 1, align: 'center' });

    rerender(
      <FileBrowser
        ref={ref}
        files={[...files, { id: 'file-c', name: 'File C' }]}
        defaultFileViewActionId={defaultFileViewActionId}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    expect(scrollToIndex).toHaveBeenCalledTimes(1);

    ref.current?.revealFile('file-b');
    await waitFor(() => expect(scrollToIndex).toHaveBeenCalledTimes(2));
    expect(scrollToIndex).toHaveBeenLastCalledWith({ index: 1, align: 'center' });
  });

  it('ignores a missing reveal target without changing selection', async () => {
    const ref = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    const { rerender } = render(
      <FileBrowser
        ref={ref}
        files={files}
        instanceId="missing-reveal"
        defaultFileViewActionId="enable_grid_view"
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );

    await screen.findByTestId('virtual-grid');
    ref.current?.setFileSelection(new Set(['file-a']));
    await waitFor(() => expect(ref.current?.getFileSelection()).toEqual(new Set(['file-a'])));

    scrollToIndex.mockClear();
    ref.current?.revealFile('missing');

    expect(ref.current?.getFileSelection()).toEqual(new Set(['file-a']));
    expect(scrollToIndex).not.toHaveBeenCalled();

    rerender(
      <FileBrowser
        ref={ref}
        files={[...files, { id: 'missing', name: 'Previously missing file' }]}
        instanceId="missing-reveal"
        defaultFileViewActionId="enable_grid_view"
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('ignores an unselectable reveal target without changing selection', async () => {
    const ref = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    render(
      <FileBrowser
        ref={ref}
        files={[files[0], { ...files[1], selectable: false }]}
        instanceId="unselectable-reveal"
        defaultFileViewActionId="enable_grid_view"
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );

    await screen.findByTestId('virtual-grid');
    ref.current?.setFileSelection(new Set(['file-a']));
    await waitFor(() => expect(ref.current?.getFileSelection()).toEqual(new Set(['file-a'])));

    scrollToIndex.mockClear();
    ref.current?.revealFile('file-b');

    expect(ref.current?.getFileSelection()).toEqual(new Set(['file-a']));
    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('ignores a reveal request when selection is disabled', async () => {
    const ref = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    render(
      <FileBrowser
        ref={ref}
        files={files}
        instanceId="disabled-selection-reveal"
        defaultFileViewActionId="enable_grid_view"
        disableSelection
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );

    await screen.findByTestId('virtual-grid');
    scrollToIndex.mockClear();
    ref.current?.revealFile('file-b');

    expect(ref.current?.getFileSelection()).toEqual(new Set());
    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});
