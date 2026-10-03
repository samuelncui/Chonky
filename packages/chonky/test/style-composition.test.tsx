import { render, screen } from '@testing-library/react';
import React from 'react';
import { CompactEntry } from '../src/components/file-list/CompactEntry';
import { FileBrowser } from '../src/components/external/FileBrowser';
import { FolderChainButton } from '../src/components/external/FolderChainButton';

it('keeps disabled breadcrumbs disabled when another theme inserts a new base color', () => {
  const item = { file: { id: 'root', name: 'Root', isDir: true }, disabled: true, onClick: () => {} };
  render(
    <>
      <FileBrowser
        files={[]}
        muiThemeOptions={{ palette: { text: { primary: '#112233', disabled: '#556677' } } }}
        disableDragAndDrop
      >
        <FolderChainButton first current item={item} />
      </FileBrowser>
      <FileBrowser
        files={[]}
        muiThemeOptions={{ palette: { text: { primary: '#aabbcc', disabled: '#556677' } } }}
        disableDragAndDrop
      >
        <FolderChainButton first current item={{ ...item, file: { ...item.file, name: 'Other root' } }} />
      </FileBrowser>
    </>,
  );
  expect(getComputedStyle(screen.getByRole('button', { name: 'Other root' })).color).toBe('rgb(85, 102, 119)');
});

it('renders real focus and selection indicators in experimental Compact entries', () => {
  const entry = (selected: boolean, focused: boolean) => (
    <FileBrowser files={[]} disableDragAndDrop>
      <CompactEntry
        file={{ id: 'compact', name: 'Compact file' }}
        selected={selected}
        focused={focused}
        dndState={{ dndIsDragging: false, dndIsOver: false, dndCanDrop: false }}
      />
    </FileBrowser>
  );
  const { container, rerender } = render(entry(false, false));
  const indicators = () => Array.from(container.querySelector('[data-chonky-file-id="compact"]')!.children).slice(-2);
  expect(indicators().map((element) => getComputedStyle(element).display)).toEqual(['none', 'none']);
  rerender(entry(true, true));
  expect(indicators().map((element) => getComputedStyle(element).display)).toEqual(['block', 'block']);
});
