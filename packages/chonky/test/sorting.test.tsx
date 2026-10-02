import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Nullable } from 'tsdef';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { FileToolbar } from '../src/components/external/FileToolbar';
import { ChonkyActions } from '../src/action-definitions';
import { selectors, selectSortActionId, selectSortOrder } from '../src/redux/selectors';
import { useChonkySelector } from '../src/redux/store';
import { FileData } from '../src/types/file.types';
import { ChonkyIconName, ChonkyIconProps } from '../src/types/icons.types';
import { SortOrder } from '../src/types/sort.types';
import { defineFileAction } from '../src/util/helpers';

const files = [
  { id: 'gamma', name: 'Gamma', size: 20, modDate: '2024-02-01' },
  { id: 'alpha', name: 'Alpha', size: 10, modDate: '2024-01-01' },
  { id: 'beta', name: 'Beta', size: 30, modDate: '2024-03-01' },
];

const CustomSort = defineFileAction({
  id: 'sort_custom',
  sortKeySelector: (file: Nullable<FileData>) => file?.size,
  button: { name: 'Sort custom', toolbar: true, group: 'Options' },
} as const);
const CustomDescendingSort = defineFileAction({
  id: 'sort_custom_descending',
  sortKeySelector: (file: Nullable<FileData>) => file?.size,
  initialSortOrder: SortOrder.DESC,
  button: { name: 'Sort custom descending', toolbar: true, group: 'Options' },
} as const);

const Icon: React.FC<ChonkyIconProps> = ({ icon }) => <span data-icon={icon} />;

const sortLabels: Record<string, string> = {
  [ChonkyActions.SortFilesByName.id]: 'Sort by name',
  [ChonkyActions.SortFilesBySize.id]: 'Sort by size',
  [ChonkyActions.SortFilesByDate.id]: 'Sort by date',
  [CustomSort.id]: 'Sort custom',
  [CustomDescendingSort.id]: 'Sort custom descending',
};

const SortState = () => {
  const actionId = useChonkySelector(selectSortActionId);
  const order = useChonkySelector(selectSortOrder);
  const fileIds = useChonkySelector(selectors.getDisplayFileIds);
  return <output data-testid="sort-state" data-action={actionId} data-order={order} data-files={fileIds.join(',')} />;
};

const expectSort = async (actionId: string, order: SortOrder, fileIds: string[]) => {
  await waitFor(() => expect(screen.getByTestId('sort-state').getAttribute('data-files')).toBe(fileIds.join(',')));
  expect(screen.getByTestId('sort-state').getAttribute('data-action')).toBe(actionId);
  expect(screen.getByTestId('sort-state').getAttribute('data-order')).toBe(order);

  fireEvent.click(screen.getByRole('button', { name: 'Options' }));
  const item = screen.getByRole('menuitem', { name: sortLabels[actionId] });
  expect(
    item.querySelector(`[data-icon="${order === SortOrder.ASC ? ChonkyIconName.sortAsc : ChonkyIconName.sortDesc}"]`),
  ).not.toBeNull();
  fireEvent.keyDown(item.closest('[role="menu"]')!, { key: 'Escape' });
};

const clickSort = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Options' }));
  fireEvent.click(screen.getByRole('menuitem', { name }));
};

describe('sorting actions', () => {
  it.each([
    [ChonkyActions.SortFilesByName.id, SortOrder.ASC, ['alpha', 'beta', 'gamma']],
    [ChonkyActions.SortFilesBySize.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']],
    [ChonkyActions.SortFilesByDate.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']],
  ] as const)('applies the initial direction of defaultSortActionId %s', async (actionId, order, expected) => {
    render(
      <FileBrowser files={files} defaultSortActionId={actionId} iconComponent={Icon} disableDragAndDrop>
        <FileToolbar />
        <SortState />
      </FileBrowser>,
    );
    await expectSort(actionId, order, [...expected]);
  });

  it('selects the first direction for each action and toggles only the active action', async () => {
    render(
      <FileBrowser
        files={files}
        defaultSortActionId={null}
        fileActions={[CustomSort, CustomDescendingSort]}
        iconComponent={Icon}
        disableDragAndDrop
      >
        <FileToolbar />
        <SortState />
      </FileBrowser>,
    );

    clickSort('Sort by name');
    await expectSort(ChonkyActions.SortFilesByName.id, SortOrder.ASC, ['alpha', 'beta', 'gamma']);
    clickSort('Sort by size');
    await expectSort(ChonkyActions.SortFilesBySize.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']);
    clickSort('Sort by size');
    await expectSort(ChonkyActions.SortFilesBySize.id, SortOrder.ASC, ['alpha', 'gamma', 'beta']);
    clickSort('Sort by date');
    await expectSort(ChonkyActions.SortFilesByDate.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']);
    clickSort('Sort by date');
    await expectSort(ChonkyActions.SortFilesByDate.id, SortOrder.ASC, ['alpha', 'gamma', 'beta']);
    clickSort('Sort custom');
    await expectSort(CustomSort.id, SortOrder.ASC, ['alpha', 'gamma', 'beta']);
    clickSort('Sort custom descending');
    await expectSort(CustomDescendingSort.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']);
    clickSort('Sort by size');
    await expectSort(ChonkyActions.SortFilesBySize.id, SortOrder.DESC, ['beta', 'gamma', 'alpha']);
  });
});
