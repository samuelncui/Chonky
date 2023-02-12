import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { FullFileBrowser } from '../dist/index.esm';

const App = () => {
  return (
    <div style={{ height: 400 }}>
      <FullFileBrowser />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
