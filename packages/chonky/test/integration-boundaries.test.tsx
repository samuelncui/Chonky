import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { Provider, useDispatch, useSelector, useStore } from 'react-redux';
import { vi } from 'vitest';
import { ChonkyActions, FileBrowser, FileContextMenu, FileList, FileToolbar, type FileBrowserHandle } from '../src';
import { FileThumbnail } from '../src/components/file-list/FileThumbnail';

vi.mock('react-virtuoso', () => ({
  Virtuoso: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ scrollToIndex: vi.fn() }));
    return (
      <>
        {Array.from({ length: Math.min(props.totalCount, 20) }, (_, index) => (
          <React.Fragment key={props.computeItemKey(index)}>{props.itemContent(index)}</React.Fragment>
        ))}
      </>
    );
  }),
}));

it('keeps host selector, dispatch and store hooks in all slots and isolates browser stores', async () => {
  const host = configureStore({
    reducer: (state = { count: 0 }, action) => (action.type === 'increment' ? { count: state.count + 1 } : state),
  });
  const HostControl = ({ slot }: { slot: string }) => {
    const count = useSelector((state: { count: number }) => state.count);
    const dispatch = useDispatch();
    const store = useStore();
    expect(store).toBe(host);
    return (
      <button onClick={() => dispatch({ type: 'increment' })}>
        {slot}: {count}
      </button>
    );
  };
  const left = createRef<FileBrowserHandle>();
  const right = createRef<FileBrowserHandle>();
  const files = [{ id: 'file', name: 'File' }];
  render(
    <Provider store={host}>
      <FileBrowser ref={left} files={files} disableDragAndDrop footer={<HostControl slot="footer" />}>
        <HostControl slot="child" />
        <FileToolbar>
          <HostControl slot="toolbar" />
        </FileToolbar>
      </FileBrowser>
      <FileBrowser ref={right} files={files} disableDragAndDrop>
        <HostControl slot="other" />
      </FileBrowser>
    </Provider>,
  );
  for (const [index, slot] of ['child', 'toolbar', 'footer'].entries())
    fireEvent.click(screen.getByRole('button', { name: `${slot}: ${index}` }));
  expect(screen.getByRole('button', { name: 'other: 3' })).toBeTruthy();
  act(() => left.current?.setFileSelection(new Set(['file'])));
  expect(left.current?.getFileSelection()).toEqual(new Set(['file']));
  expect(right.current?.getFileSelection()).toEqual(new Set());
  act(() => right.current?.setFileSelection(new Set(['file'])));
  act(() => left.current?.setFileSelection(new Set()));
  expect(right.current?.getFileSelection()).toEqual(new Set(['file']));
  expect(host.getState()).toEqual({ count: 3 });
});

it('exposes native checkbox selection and resolves keyboard context menus from focus rather than previous selection', async () => {
  const ref = createRef<FileBrowserHandle>();
  const handler = vi.fn();
  render(
    <FileBrowser
      ref={ref}
      files={[
        { id: 'alpha', name: 'Alpha' },
        { id: 'bravo', name: 'Bravo' },
      ]}
      onFileAction={handler}
      disableDragAndDrop
    >
      <FileList />
      <FileContextMenu />
    </FileBrowser>,
  );
  const alpha = screen.getByRole('checkbox', { name: 'Select Alpha' });
  const bravo = screen.getByRole('checkbox', { name: 'Select Bravo' });
  expect(alpha.closest('[role="listitem"]')?.getAttribute('tabindex')).toBeNull();
  fireEvent.click(alpha);
  expect((alpha as HTMLInputElement).checked).toBe(true);
  act(() => bravo.focus());
  fireEvent.contextMenu(bravo);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Open selection' }));
  await waitFor(() =>
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ChonkyActions.OpenFiles.id,
        payload: { files: [expect.objectContaining({ id: 'bravo' })] },
      }),
    ),
  );
  fireEvent.keyDown(bravo, { key: ' ', code: 'Space' });
  expect((bravo as HTMLInputElement).checked).toBe(false);
  fireEvent.keyDown(bravo, { key: ' ', code: 'Space' });
  expect((bravo as HTMLInputElement).checked).toBe(true);
  expect(within(bravo.closest('[role="listitem"]') as HTMLElement).getAllByRole('checkbox')).toHaveLength(1);
  expect(document.querySelector('[aria-selected]')).toBeNull();
});

it('passes arbitrary valid thumbnail URLs to a native image and clears removed thumbnails', () => {
  const url = '/pictures/O\'Reilly-雪.jpg?caption="quoted"';
  const { container, rerender } = render(
    <FileBrowser files={[]}>
      <FileThumbnail className="custom-thumbnail" thumbnailUrl={url} />
    </FileBrowser>,
  );
  expect(container.querySelector('img')?.getAttribute('src')).toBe(url);
  expect(container.querySelector('.custom-thumbnail')).toBeTruthy();
  rerender(
    <FileBrowser files={[]}>
      <FileThumbnail className="custom-thumbnail" thumbnailUrl={null} />
    </FileBrowser>,
  );
  expect(container.querySelector('img')).toBeNull();
});
