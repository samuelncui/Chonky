import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileList } from '../src/components/file-list/FileList';
import { reduxActions, rootReducer } from '../src/redux/reducers';
import { selectHiddenFileIdMap, selectors } from '../src/redux/selectors';

vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'virtual-list', 'data-total-count': props.totalCount },
      props.totalCount > 0 ? props.itemContent(0) : null,
    ),
  VirtuosoGrid: (props: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'virtual-grid', 'data-total-count': props.totalCount },
      props.totalCount > 0 ? props.itemContent(0) : null,
    ),
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
});
