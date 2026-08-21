# `@samuelncui/chonky`

Chonky is a file browser component for React. It supports file selection,
drag-and-drop, list and grid views, keyboard shortcuts, search, sorting, custom
actions, and custom icons.

This maintained fork updates the inactive upstream project for current React
applications. See the repository's [fork rationale](https://github.com/samuelncui/Chonky#why-this-fork)
and [changelog](https://github.com/samuelncui/Chonky/blob/master/CHANGELOG.md).

## Requirements

- React and React DOM 19.2.x
- Node.js 22.12 or later

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

See the [repository](https://github.com/samuelncui/Chonky) for the runnable
example and development instructions.

## License

MIT
