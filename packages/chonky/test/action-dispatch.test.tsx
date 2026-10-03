import { act, render } from '@testing-library/react';
import React, { createRef } from 'react';
import { vi } from 'vitest';

import { FileBrowser } from '../src/components/external/FileBrowser';
import { ChonkyActions } from '../src/action-definitions';
import { FileAction } from '../src/types/action.types';
import { FileBrowserHandle } from '../src/types/file-browser.types';
import { Logger } from '../src/util/logger';

describe('external action handlers', () => {
  it.each(['double-click', 'open selection', 'direct ref request'])(
    'honors registered OpenFiles overrides through %s',
    async (entry) => {
      const ref = createRef<FileBrowserHandle>();
      const file = { id: 'file', name: 'File.txt' };
      const effect = vi.fn(() => true);
      const override: FileAction = { ...ChonkyActions.OpenFiles, effect };
      const onFileAction = vi.fn();
      render(
        <FileBrowser
          ref={ref}
          files={[file]}
          fileActions={[override]}
          onFileAction={onFileAction}
          disableDragAndDrop
        />,
      );
      await act(async () => {
        if (entry === 'double-click') {
          await ref.current?.requestFileAction(ChonkyActions.MouseClickFile, {
            clickType: 'double',
            file,
            fileDisplayIndex: 0,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
          });
        } else if (entry === 'open selection') {
          ref.current?.setFileSelection(new Set([file.id]));
          await ref.current?.requestFileAction(ChonkyActions.OpenSelection, undefined);
        } else {
          await ref.current?.requestFileAction(ChonkyActions.OpenFiles, { targetFile: file, files: [file] });
        }
      });
      expect(effect).toHaveBeenCalledTimes(1);
      expect(onFileAction.mock.calls.filter(([data]) => data.id === ChonkyActions.OpenFiles.id)).toHaveLength(0);
    },
  );

  it.each([
    ['throw', new Error('Handler failed')],
    ['reject', new Error('Handler failed')],
    ['throw', null],
    ['reject', null],
  ])('handles a handler %s (%s) without dispatching the action twice', async (failure, reason) => {
    const ref = createRef<FileBrowserHandle>();
    const action: FileAction = { id: 'custom' };
    const onFileAction = vi.fn(() => {
      if (failure === 'throw') throw reason;
      return Promise.reject(reason);
    });
    const log = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    try {
      render(
        <FileBrowser ref={ref} files={[]} fileActions={[action]} onFileAction={onFileAction} disableDragAndDrop />,
      );
      await act(async () => {
        await ref.current?.requestFileAction(action, undefined).catch(() => {});
      });
      expect(onFileAction).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledExactlyOnceWith(
        `User-defined file action handler threw an error: ${reason instanceof Error ? reason.message : String(reason)}`,
      );
    } finally {
      log.mockRestore();
    }
  });

  it.each(['throw', 'reject'])('dispatches once after an effect %s with a non-Error reason', async (failure) => {
    const ref = createRef<FileBrowserHandle>();
    const action: FileAction = {
      id: 'custom',
      effect: () => {
        if (failure === 'throw') throw null;
        return Promise.reject(null);
      },
    };
    const onFileAction = vi.fn();
    const log = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    try {
      render(
        <FileBrowser ref={ref} files={[]} fileActions={[action]} onFileAction={onFileAction} disableDragAndDrop />,
      );
      await act(async () => {
        await ref.current?.requestFileAction(action, undefined);
      });
      expect(onFileAction).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toContain('null');
    } finally {
      log.mockRestore();
    }
  });
});
