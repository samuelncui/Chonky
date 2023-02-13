import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { FullFileBrowser } from '../dist/chonky.esm.js';
import { ChonkyIconFA } from '../../chonky-icon-fontawesome';

const App = () => {
  const pathEntries = ['test', 'folder'];
  return (
    <div style={{ height: 400 }}>
      <FullFileBrowser
        iconComponent={ChonkyIconFA}
        folderChain={pathEntries.map((name, idx) => ({
          id: `${idx}`,
          name,
        }))}
        files={[
          { id: 'zxc', name: 'My File.txt' },
          { id: 'jre', name: 'My Folder' },
        ]}
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
