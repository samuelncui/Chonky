import { act, render, screen } from '@testing-library/react';
import React, { createRef } from 'react';
import { ChonkyActions, FileBrowser, FileToolbar, getI18nId, I18nNamespace, type FileBrowserHandle } from '../src';

const files = [
  { id: 'visible', name: 'Visible' },
  { id: 'hidden', name: '.Hidden', isHidden: true },
];

it.each([
  { total: undefined, label: '2 items' },
  { total: null, label: 'Unknown total' },
  { total: 0, label: '0 items' },
  { total: 1, label: '1 item' },
  { total: 1200, label: '1,200 items' },
])('renders $label for totalFileCount=$total', ({ total, label }) => {
  render(
    <FileBrowser files={files} disableDragAndDrop>
      <FileToolbar totalFileCount={total} />
    </FileBrowser>,
  );
  expect(screen.getByText(label)).toBeTruthy();
});

it('retains the authoritative total when another listing batch arrives', () => {
  const browser = (count: number) => (
    <FileBrowser files={files.slice(0, count)} disableDragAndDrop>
      <FileToolbar totalFileCount={1200} />
    </FileBrowser>
  );
  const { rerender } = render(browser(1));
  expect(screen.getByText('1,200 items')).toBeTruthy();
  expect(screen.queryByText('1 item')).toBeNull();
  rerender(browser(2));
  expect(screen.getByText('1,200 items')).toBeTruthy();
  expect(screen.queryByText('2 items')).toBeNull();
});

it.each([undefined, null, 1200])('preserves selection and hidden counts with totalFileCount=%s', async (total) => {
  const ref = createRef<FileBrowserHandle>();
  render(
    <FileBrowser ref={ref} files={files} disableDragAndDrop>
      <FileToolbar totalFileCount={total} />
    </FileBrowser>,
  );
  await act(async () => {
    ref.current!.setFileSelection(new Set(['visible']));
    await ref.current!.requestFileAction(ChonkyActions.ToggleHiddenFiles, undefined);
  });
  expect(
    screen.getByText(total === undefined ? '1 item' : total === null ? 'Unknown total' : '1,200 items'),
  ).toBeTruthy();
  expect(screen.getByText('1 selected')).toBeTruthy();
  expect(screen.getByText('1 hidden')).toBeTruthy();
});

it('localizes unknown and numeric totals through static messages', () => {
  const i18n = {
    messages: {
      [getI18nId(I18nNamespace.Toolbar, 'unknownFileCount')]: 'Count unknown',
      [getI18nId(I18nNamespace.Toolbar, 'visibleFileCount')]: '{fileCount} entries in total',
    },
  };
  const browser = (total: number | null) => (
    <FileBrowser files={files} disableDragAndDrop i18n={i18n}>
      <FileToolbar totalFileCount={total} />
    </FileBrowser>
  );
  const { rerender } = render(browser(null));
  expect(screen.getByText('Count unknown')).toBeTruthy();
  rerender(browser(1200));
  expect(screen.getByText('1200 entries in total')).toBeTruthy();
});

it.each([undefined, null, 999])('keeps the sparse row total with totalFileCount=%s', (total) => {
  render(
    <FileBrowser
      files={[]}
      disableDragAndDrop
      grouping={{
        mode: 'continuous',
        sparse: { totalCount: 1_000_000, rows: [], onRangeChanged: () => {}, onToggleGroup: () => {} },
      }}
    >
      <FileToolbar totalFileCount={total} />
    </FileBrowser>,
  );
  expect(screen.getByText('1,000,000 rows')).toBeTruthy();
  expect(screen.queryByText('Unknown total')).toBeNull();
  expect(screen.queryByText('999 items')).toBeNull();
});
