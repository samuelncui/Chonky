# `@samuelncui/chonky`

Chonky is a file browser component for React. It supports file selection,
drag-and-drop, list and grid views, keyboard shortcuts, search, sorting, custom
actions, and custom icons.

## Installation

```shell
npm install @samuelncui/chonky @samuelncui/chonky-icon-fontawesome
```

## Usage

```tsx
import { FullFileBrowser } from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

export function FileBrowser() {
  return <FullFileBrowser files={[]} iconComponent={ChonkyIconFA} />;
}
```

See the [repository](https://github.com/samuelncui/Chonky) for the complete
example and development instructions.

## License

MIT
