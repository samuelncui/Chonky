import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { createRef, forwardRef, StrictMode, useImperativeHandle } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { ChonkyActions } from '../src/action-definitions';
import { FileEntryStatus } from '../src/components/file-list/FileEntryStatus';
import { FileList } from '../src/components/file-list/FileList';
import { useThumbnailUrl } from '../src/components/file-list/FileEntry-hooks';
import { selectors, selectSortOrder } from '../src/redux/selectors';
import { useChonkySelector } from '../src/redux/store';
import { FileBrowserHandle } from '../src/types/file-browser.types';
import { FileData } from '../src/types/file.types';
import { SortOrder } from '../src/types/sort.types';
import { Logger } from '../src/util/logger';
import { FileHelper } from '../src/util/file-helper';

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return (
      <div data-testid="virtual-list" data-fixed-height={props.fixedItemHeight}>
        {Array.from({ length: props.totalCount }, (_, index) => (
          <React.Fragment key={props.computeItemKey(index)}>{props.itemContent(index)}</React.Fragment>
        ))}
      </div>
    );
  }),
  VirtuosoGrid: () => null,
}));

const SortState = () => {
  const ids = useChonkySelector(selectors.getDisplayFileIds);
  const order = useChonkySelector(selectSortOrder);
  return (
    <output data-testid="sort-state" data-order={order}>
      {ids.join(',')}
    </output>
  );
};

const ThumbnailState = ({ file }: { file: FileData | null }) => {
  const { thumbnailUrl, thumbnailLoading } = useThumbnailUrl(file);
  return (
    <output data-testid="thumbnail-state" data-loading={thumbnailLoading}>
      {thumbnailUrl}
    </output>
  );
};

describe('library regressions', () => {
  it.each(['LICENSE', 'README', '.gitignore'])('preserves the full displayed name of %s', async (name) => {
    render(
      <FileBrowser files={[{ id: 'file', name }]} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );
    await screen.findByTestId('virtual-list');
    const entry = document.querySelector('[data-chonky-file-id="file"]')!;
    expect(entry.querySelector(`[title="${name}"]`)?.textContent).toBe(name);
  });

  it('clears a thumbnail when its URL is removed from the same file', async () => {
    const file = { id: 'file', name: 'Photo.jpg', thumbnailUrl: '/old.jpg' };
    const { rerender } = render(
      <FileBrowser files={[file]} disableDragAndDrop>
        <ThumbnailState file={file} />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByTestId('thumbnail-state').textContent).toBe('/old.jpg'));
    const updated = { id: file.id, name: file.name };
    rerender(
      <FileBrowser files={[updated]} disableDragAndDrop>
        <ThumbnailState file={updated} />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByTestId('thumbnail-state').textContent).toBe(''));
  });

  it('clears a generated thumbnail when the generator returns null on refresh', async () => {
    const file = { id: 'file', name: 'Photo.jpg' };
    const thumbnailGenerator = vi.fn().mockResolvedValue('/old.jpg');
    const { rerender } = render(
      <FileBrowser files={[file]} thumbnailGenerator={thumbnailGenerator} disableDragAndDrop>
        <ThumbnailState file={file} />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByTestId('thumbnail-state').textContent).toBe('/old.jpg'));
    thumbnailGenerator.mockResolvedValue(null);
    const updated = { ...file };
    rerender(
      <FileBrowser files={[updated]} thumbnailGenerator={thumbnailGenerator} disableDragAndDrop>
        <ThumbnailState file={updated} />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByTestId('thumbnail-state').textContent).toBe(''));
  });

  it('ends thumbnail loading when the generator is removed and ignores its late result', async () => {
    const file = { id: 'file', name: 'Photo.jpg', thumbnailUrl: '/direct.jpg' };
    let resolve!: (url: string) => void;
    const thumbnailGenerator = () =>
      new Promise<string>((done) => {
        resolve = done;
      });
    const { rerender } = render(
      <FileBrowser files={[file]} thumbnailGenerator={thumbnailGenerator} disableDragAndDrop>
        <ThumbnailState file={file} />
      </FileBrowser>,
    );
    await waitFor(() => expect(screen.getByTestId('thumbnail-state').getAttribute('data-loading')).toBe('true'));
    rerender(
      <FileBrowser files={[file]} disableDragAndDrop>
        <ThumbnailState file={file} />
      </FileBrowser>,
    );
    await act(async () => {
      resolve('/late.jpg');
    });
    expect(screen.getByTestId('thumbnail-state').getAttribute('data-loading')).toBe('false');
    expect(screen.getByTestId('thumbnail-state').textContent).toBe('/direct.jpg');
  });

  it('reports a non-Error thumbnail rejection without leaving an unhandled rejection', async () => {
    const file = { id: 'file', name: 'Photo.jpg' };
    const thumbnailGenerator = vi.fn().mockRejectedValue(null);
    const log = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    try {
      render(
        <FileBrowser files={[file]} thumbnailGenerator={thumbnailGenerator} disableDragAndDrop>
          <ThumbnailState file={file} />
        </FileBrowser>,
      );
      await waitFor(() =>
        expect(log).toHaveBeenCalledExactlyOnceWith('User-defined "thumbnailGenerator" handler threw an error: null'),
      );
      expect(screen.getByTestId('thumbnail-state').getAttribute('data-loading')).toBe('false');
    } finally {
      log.mockRestore();
    }
  });

  it('opens the selected files once when Enter is pressed on a focused file row', async () => {
    const files = [{ id: 'file', name: 'File.txt' }];
    const ref = createRef<FileBrowserHandle>();
    const onFileAction = vi.fn();
    render(
      <FileBrowser ref={ref} files={files} onFileAction={onFileAction} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );
    await screen.findByTestId('virtual-list');
    act(() => ref.current?.setFileSelection(new Set(['file'])));
    const wrapper = document.querySelector('[data-chonky-file-id="file"]')!.parentElement!;
    act(() => wrapper.focus());
    fireEvent.keyDown(wrapper, { code: 'Enter', key: 'Enter', keyCode: 13 });
    await waitFor(() =>
      expect(onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.OpenFiles.id)).toHaveLength(1),
    );
    expect(onFileAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ChonkyActions.OpenFiles.id,
        payload: { files },
      }),
    );
  });

  it('does not open a focused file marked openable false when Enter is pressed', async () => {
    const onFileAction = vi.fn();
    render(
      <FileBrowser
        files={[{ id: 'file', name: 'File.txt', openable: false }]}
        onFileAction={onFileAction}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    await screen.findByTestId('virtual-list');
    const wrapper = document.querySelector('[data-chonky-file-id="file"]')!.parentElement!;
    act(() => wrapper.focus());
    await act(async () => {
      fireEvent.keyDown(wrapper, { code: 'Enter', key: 'Enter', keyCode: 13 });
    });
    expect(onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.OpenFiles.id)).toHaveLength(0);
  });

  it('opens an unselected focused file once when keypad Enter is pressed', async () => {
    const file = { id: 'file', name: 'File.txt' };
    const onFileAction = vi.fn();
    render(
      <FileBrowser files={[file]} onFileAction={onFileAction} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );
    const wrapper = document.querySelector('[data-chonky-file-id="file"]')!.parentElement!;
    act(() => wrapper.focus());
    await act(async () => {
      fireEvent.keyDown(wrapper, { code: 'NumpadEnter', key: 'Enter', keyCode: 13 });
    });
    const opens = onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.OpenFiles.id);
    expect(opens).toHaveLength(1);
    expect(opens[0][0].payload).toEqual({ targetFile: file, files: [file] });
  });

  it.each([
    [ChonkyActions.SortFilesByName.id, SortOrder.ASC, 'alpha,beta'],
    [ChonkyActions.SortFilesBySize.id, SortOrder.DESC, 'beta,alpha'],
  ])('keeps the default direction of %s under Strict Mode', async (defaultSortActionId, order, ids) => {
    render(
      <StrictMode>
        <FileBrowser
          files={[
            { id: 'alpha', name: 'Alpha', size: 1 },
            { id: 'beta', name: 'Beta', size: 2 },
          ]}
          defaultSortActionId={defaultSortActionId}
          disableDragAndDrop
        >
          <SortState />
        </FileBrowser>
      </StrictMode>,
    );
    expect(screen.getByTestId('sort-state').textContent).toBe(ids);
    expect(screen.getByTestId('sort-state').getAttribute('data-order')).toBe(order);
  });

  it('sorts supported Date objects and date strings by time', () => {
    render(
      <FileBrowser
        files={[
          { id: 'earliest', name: 'First', modDate: '2024-03-01T00:30:00+08:00' },
          { id: 'latest', name: 'Last', modDate: new Date('2024-03-01T00:00:00Z') },
          { id: 'middle', name: 'Middle', modDate: '2024-02-29T23:00:00Z' },
        ]}
        defaultSortActionId={ChonkyActions.SortFilesByDate.id}
        disableDragAndDrop
      >
        <SortState />
      </FileBrowser>,
    );
    expect(screen.getByTestId('sort-state').textContent).toBe('latest,middle,earliest');
  });

  it.each(['not a date', new Date(NaN)])('treats an invalid modification date %s as missing', (modDate) => {
    const onError = vi.fn();
    render(
      <FileBrowser
        files={[{ id: 'file', name: 'File.txt', modDate, size: 1024 }]}
        defaultSortActionId={ChonkyActions.SortFilesByDate.id}
        i18n={{ onError }}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    const entry = document.querySelector('[data-chonky-file-id="file"]')!;
    expect(entry.textContent).toContain('—');
    expect(onError).not.toHaveBeenCalled();
    expect(FileHelper.getModDate({ id: 'file', name: 'File.txt', modDate })).toBeNull();
    expect(ChonkyActions.SortFilesByDate.sortKeySelector({ id: 'file', name: 'File.txt', modDate })).toBeUndefined();
  });

  it('disables library sorting when defaultSortActionId changes to null', () => {
    const files = [
      { id: 'beta', name: 'Beta' },
      { id: 'alpha', name: 'Alpha' },
    ];
    const { rerender } = render(
      <FileBrowser files={files} disableDragAndDrop>
        <SortState />
      </FileBrowser>,
    );
    expect(screen.getByTestId('sort-state').textContent).toBe('alpha,beta');
    rerender(
      <FileBrowser files={files} defaultSortActionId={null} disableDragAndDrop>
        <SortState />
      </FileBrowser>,
    );
    expect(screen.getByTestId('sort-state').textContent).toBe('beta,alpha');
  });

  it('ignores unassigned files when choosing the group for imperative selection', () => {
    const ref = createRef<FileBrowserHandle>();
    render(
      <FileBrowser
        ref={ref}
        files={[
          { id: 'outside', name: 'Outside.txt' },
          { id: 'a', name: 'A.txt' },
          { id: 'b', name: 'B.txt' },
        ]}
        grouping={{ groups: [{ id: 'group', name: 'Group', fileIds: ['a', 'b'] }] }}
        disableDragAndDrop
      >
        <FileList />
      </FileBrowser>,
    );
    act(() => ref.current?.setFileSelection(new Set(['a'])));
    act(() => ref.current?.setFileSelection(new Set(['outside', 'b']), false));
    expect(ref.current?.getFileSelection()).toEqual(new Set(['a', 'b']));
  });

  it('exposes the supplemental status marker label to assistive technology', () => {
    render(
      <FileEntryStatus
        status={{
          label: 'Archived',
          color: 'green',
          marker: { label: 'Copy differs', color: 'orange', kind: 'changed' },
        }}
      />,
    );
    expect(screen.getByRole('img', { name: 'Archived', description: 'Archived: Copy differs' })).toBeTruthy();
  });

  it('allows list rows with details to measure their content instead of fixing their height', () => {
    const file = { id: 'file', name: 'File.txt', details: ['Source: archive', 'Checksum: verified'] };
    render(
      <FileBrowser files={[file]} disableDragAndDrop>
        <FileList />
      </FileBrowser>,
    );
    const list = screen.getByTestId('virtual-list');
    expect(list.hasAttribute('data-fixed-height')).toBe(false);
    expect(screen.getByText('Source: archive')).toBeTruthy();
    expect(screen.getByText('Checksum: verified')).toBeTruthy();
  });
});
