# `@samuelncui/chonky-icon-fontawesome`

This package provides the FontAwesome icon component for
`@samuelncui/chonky`.

This maintained fork updates the inactive upstream project for current React
applications. See the repository's [fork rationale](https://github.com/samuelncui/Chonky#why-this-fork)
and [changelog](https://github.com/samuelncui/Chonky/blob/master/CHANGELOG.md).

## Requirements

- React 19.2.x
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

## License

MIT
