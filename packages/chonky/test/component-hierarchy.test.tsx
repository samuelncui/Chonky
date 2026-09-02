import { fireEvent, render, waitFor } from '@testing-library/react';
import React, { UIEvent } from 'react';
import { vi } from 'vitest';

import { ChonkyActions, FileArray, FullFileBrowser } from '../src';
import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileContextMenu } from '../src/components/external/FileContextMenu';
import { FileNavbar } from '../src/components/external/FileNavbar';
import { FileToolbar } from '../src/components/external/FileToolbar';
import { FileList } from '../src/components/file-list/FileList';
import { ListEntry } from '../src/components/file-list/ListEntry';
import { reduxActions } from '../src/redux/reducers';
import { useChonkyDispatch } from '../src/redux/store';

const SelectFileButton = () => {
  const dispatch = useChonkyDispatch();
  return (
    <button onClick={() => dispatch(reduxActions.selectFiles({ fileIds: ['zxc'], reset: true }))}>Select file</button>
  );
};

describe('FileBrowser', () => {
  const files: FileArray = [
    { id: 'zxc', name: 'My File.txt' },
    { id: 'jre', name: 'My Folder' },
  ];

  const onScrollEventHandler = (e: UIEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  it('renders without crashing when using FullFileBrowser', () => {
    render(<FullFileBrowser files={files} />);
  });
  it('renders without crashing when using individual components', () => {
    render(
      <FileBrowser files={files}>
        <FileNavbar />
        <FileToolbar />
        <FileList onScroll={onScrollEventHandler} />
        <FileContextMenu />
      </FileBrowser>,
    );
  });

  it('reports selection changes through the store subscription', async () => {
    const onFileAction = vi.fn();
    const { getByRole } = render(
      <FileBrowser files={files} onFileAction={onFileAction}>
        <SelectFileButton />
      </FileBrowser>,
    );
    fireEvent.click(getByRole('button', { name: 'Select file' }));

    await waitFor(() =>
      expect(onFileAction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ChonkyActions.ChangeSelection.id,
        }),
      ),
    );
  });

  it('keeps toolbar regions stable across selection changes', async () => {
    const { container, getByRole } = render(
      <FileBrowser
        files={[
          { id: 'zxc', name: 'My File.txt' },
          { id: 'jre', name: 'My Folder' },
        ]}
      >
        <FileToolbar layout="inline" />
        <SelectFileButton />
      </FileBrowser>,
    );

    const toolbar = container.querySelector('.chonky-toolbarContainerInline');
    const summary = container.querySelector('.chonky-toolbarSummary');
    const extras = container.querySelector('.chonky-toolbarExtras');
    expect(toolbar).not.toBeNull();
    expect(summary?.textContent).toBe('2 items');
    expect(extras?.textContent).toBe('');

    fireEvent.click(getByRole('button', { name: 'Select file' }));

    await waitFor(() => expect(summary?.textContent).toBe('2 items(1 selected)'));
    expect(extras?.textContent).toBe('');
  });

  it('expands the file filter on demand and keeps active filters visible', async () => {
    const { getByRole, queryByRole } = render(
      <FileBrowser files={files}>
        <FileToolbar layout="inline" />
      </FileBrowser>,
    );

    const filterButton = getByRole('button', { name: 'Filter' });
    expect(filterButton.classList.contains('chonky-baseButton')).toBe(true);
    expect(filterButton.classList.contains('chonky-iconOnlyButton')).toBe(true);
    expect(queryByRole('textbox')).toBeNull();
    fireEvent.click(filterButton);
    const filter = getByRole('textbox');
    expect(document.activeElement).toBe(filter);

    fireEvent.change(filter, { target: { value: 'File' } });
    fireEvent.blur(filter);
    expect(queryByRole('textbox')).not.toBeNull();

    fireEvent.change(filter, { target: { value: '' } });
    fireEvent.blur(filter);
    await waitFor(() => expect(queryByRole('textbox')).toBeNull());
  });

  it('positions selection and focus indicators against the complete list row', () => {
    const { container } = render(
      <FileBrowser files={files}>
        <ListEntry
          file={files[0]}
          selected
          focused
          dndState={{ dndIsDragging: false, dndIsOver: false, dndCanDrop: false }}
        />
      </FileBrowser>,
    );

    const entry = container.querySelector('[data-chonky-file-id="zxc"]');
    expect(entry).not.toBeNull();
    const indicators = Array.from(entry?.children ?? []).slice(0, 2);
    expect(indicators).toHaveLength(2);

    for (const indicator of indicators) {
      expect(getComputedStyle(indicator).inset).toBe('0px');
    }
  });
});
