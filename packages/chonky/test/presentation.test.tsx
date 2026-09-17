import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileNavbar } from '../src/components/external/FileNavbar';
import { FileEntryStatus } from '../src/components/file-list/FileEntryStatus';
import { FileList } from '../src/components/file-list/FileList';
import { GroupedFileList } from '../src/components/file-list/GroupedFileList';

const contextMenuTrigger = vi.fn();

vi.mock('../src/components/external/FileContextMenu-hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/components/external/FileContextMenu-hooks')>();
  return { ...original, useContextMenuTrigger: () => contextMenuTrigger };
});

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return <div data-testid="virtual-list">{props.totalCount ? props.itemContent(0) : null}</div>;
  }),
  VirtuosoGrid: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return <div data-testid="virtual-grid">{props.totalCount ? props.itemContent(0) : null}</div>;
  }),
}));

describe('presentation extensions', () => {
  beforeEach(() => {
    contextMenuTrigger.mockClear();
  });

  it('keeps editable footer content outside Chonky context-menu handling', () => {
    const { getByText } = render(
      <FileBrowser
        files={[]}
        footer={
          <div contentEditable suppressContentEditableWarning>
            Notes
          </div>
        }
        disableDragAndDrop
      >
        <div>Files</div>
      </FileBrowser>,
    );

    const footer = getByText('Notes');
    fireEvent.pointerDown(footer);
    expect(document.activeElement).not.toBe(footer);
    fireEvent.contextMenu(footer);
    expect(contextMenuTrigger).not.toHaveBeenCalled();

    fireEvent.contextMenu(getByText('Files'));
    expect(contextMenuTrigger).toHaveBeenCalledTimes(1);
  });

  it('renders accessible status and preserves its list slot when absent', () => {
    const { container, rerender } = render(<FileEntryStatus reserve />);
    const emptySlot = container.querySelector('[data-chonky-status-slot]');
    expect(emptySlot?.getAttribute('aria-hidden')).toBe('true');
    expect((emptySlot as HTMLElement).style.width).toBe('28px');

    rerender(
      <FileEntryStatus
        status={{
          label: 'Checksum warning',
          color: 'orange',
          marker: { label: 'Warning', color: 'red', kind: 'warning' },
        }}
        reserve
      />,
    );
    expect(screen.getByRole('img', { name: 'Checksum warning' }).hasAttribute('data-chonky-status-slot')).toBe(true);
    expect(screen.getByText('!').getAttribute('aria-hidden')).toBe('true');
  });

  it('uses application root content and copies the supplied display path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <FileBrowser files={[]} folderChain={[{ id: 'root', name: 'Root', isDir: true }]} disableDragAndDrop>
        <FileNavbar rootContent={<button type="button">Library</button>} path="Archive / 2026" />
      </FileBrowser>,
    );

    expect(screen.getByRole('button', { name: 'Library' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Copy path' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Archive / 2026'));
    expect(screen.getByRole('button', { name: 'Path copied' })).not.toBeNull();
  });

  it('clears selection when switching groups and does not turn headings into files', async () => {
    const browserRef = createRef<import('../src/types/file-browser.types').FileBrowserHandle>();
    const onGroupChange = vi.fn();
    const groups = [
      { id: 'source-a', name: 'Source A' },
      { id: 'source-b', name: 'Source B' },
    ];
    const { container, rerender } = render(
      <FileBrowser ref={browserRef} files={[{ id: 'file-a', name: 'File A' }]} disableDragAndDrop>
        <GroupedFileList groups={groups} activeGroupId="source-a" onGroupChange={onGroupChange} />
      </FileBrowser>,
    );

    browserRef.current?.setFileSelection(new Set(['file-a']));
    await waitFor(() => expect(browserRef.current?.getFileSelection()).toEqual(new Set(['file-a'])));
    expect(container.querySelector('[data-chonky-file-id="source-a"]')).toBeNull();
    expect(container.querySelector('[data-chonky-file-id="source-b"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Source B' }));
    expect(onGroupChange).toHaveBeenCalledWith('source-b');

    rerender(
      <FileBrowser ref={browserRef} files={[{ id: 'file-b', name: 'File B' }]} disableDragAndDrop>
        <GroupedFileList groups={groups} activeGroupId="source-b" onGroupChange={onGroupChange} />
      </FileBrowser>,
    );
    await waitFor(() => expect(browserRef.current?.getFileSelection()).toEqual(new Set()));
  });

  it('suppresses an empty placeholder until initial loading completes', () => {
    render(
      <FileBrowser files={[]} disableDragAndDrop>
        <FileList loading="initial" emptyPlaceholder={<span>Nothing here</span>} />
      </FileBrowser>,
    );

    expect(screen.queryByText('Nothing here')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Loading files' })).not.toBeNull();
  });
});
