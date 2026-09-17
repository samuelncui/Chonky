import { vi } from 'vitest';

// jsdom has no layout engine; browser tests cover actual resize measurements.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

Object.defineProperty(globalThis.CSS, 'escape', {
  configurable: true,
  value: globalThis.CSS.escape.bind(globalThis.CSS),
});

vi.mock('react-dnd', async () => {
  const React = await import('react');
  return {
    DndContext: React.createContext({ dragDropManager: null }),
    DndProvider: ({ children }: { children: React.ReactNode }) => children,
    useDrag: () => [{}, () => null, () => null],
    useDrop: () => [{}, () => null],
  };
});

vi.mock('react-dnd-html5-backend', () => ({
  getEmptyImage: () => null,
  HTML5Backend: {},
}));
