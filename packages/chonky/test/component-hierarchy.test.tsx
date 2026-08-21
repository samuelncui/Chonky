import { fireEvent, render, waitFor } from '@testing-library/react';
import React, { UIEvent } from 'react';
import { vi } from 'vitest';

import { ChonkyActions, FileArray, FullFileBrowser } from '../src';
import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileContextMenu } from '../src/components/external/FileContextMenu';
import { FileNavbar } from '../src/components/external/FileNavbar';
import { FileToolbar } from '../src/components/external/FileToolbar';
import { FileList } from '../src/components/file-list/FileList';
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
});
