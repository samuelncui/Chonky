import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FullFileBrowser } from '../dist/chonky.esm.js';
import { ChonkyIconFA } from '../../chonky-icon-fontawesome'

const App = () => {
  return (
    <div style={{ height: 400 }}>
      <FullFileBrowser iconComponent={ChonkyIconFA} />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
