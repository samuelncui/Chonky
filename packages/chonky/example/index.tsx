import { createRoot } from 'react-dom/client';
import { DuplicatesDemo } from './duplicates';
import { FilesDemo } from './files';
import { PresentationDemo } from './presentation';
import { SparseDemo } from './sparse';
import './showcase.css';

const examples = [
  { id: 'files', name: 'Ordinary files', component: FilesDemo },
  { id: 'duplicates', name: 'Identical files', component: DuplicatesDemo },
  { id: 'sparse', name: 'Sparse paging', component: SparseDemo },
  { id: 'presentation', name: 'Presentation', component: PresentationDemo },
];
const exampleId = new URLSearchParams(window.location.search).get('example');
const active = examples.find((example) => example.id === exampleId) ?? examples[0];
const Demo = active.component;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing root element');

createRoot(rootElement).render(
  <main className="demo-shell">
    <header className="demo-header">
      <a className="demo-brand" href="?example=files">
        Chonky
      </a>
      <span>React file browser · interactive showcase</span>
    </header>
    <nav className="demo-navigation" aria-label="Examples">
      {examples.map((example) => (
        <a
          key={example.id}
          href={`?example=${example.id}`}
          aria-current={active.id === example.id ? 'page' : undefined}
        >
          {example.name}
        </a>
      ))}
    </nav>
    <Demo />
    <p className="demo-site-note">
      All fixtures run in memory. Reset an example or reload to restore its starting data.
    </p>
  </main>,
);
