<p align="center">
    <img src="./logo/chonky-logo-v2.png" alt="Chonky v2 Logo" width="500" />
    <br />
    <a href="https://www.npmjs.com/package/@samuelncui/chonky">
        <img
            alt="NPM package"
            src="https://img.shields.io/npm/v/@samuelncui/chonky.svg?style=flat&colorB=ffac5c"
        />
    </a>
    <a href="https://tldrlegal.com/license/mit-license">
        <img
            alt="MIT license"
            src="https://img.shields.io/npm/l/%40samuelncui%2Fchonky?style=flat&colorB=dcd67a"
        />
    </a>
    <br />
    <br />
    <br />
</p>

Chonky is a file browser component for React. It tries to recreate the native file
browsing experience in your browser. This means your users can make selections, drag
& drop files, toggle between _List_ and _Grid_ file views, use keyboard shortcuts, and
much more!

This is a maintained fork of [Chonky] by [TimboKZ].

[Chonky]: https://github.com/TimboKZ/Chonky
[TimboKZ]: https://github.com/TimboKZ

## Why this fork

The upstream project is no longer actively maintained. This fork keeps Chonky
usable in current React applications by updating its framework dependencies,
replacing retired libraries, fixing integration issues, and improving large
directory performance. The packages use the `@samuelncui` scope so applications
can adopt the maintained fork explicitly.

See the [changelog](./CHANGELOG.md) before upgrading from an earlier release.

## Requirements

- React and React DOM 19.2.x
- Node.js 22.12 or later

## Usage

Add the forked npm packages:

```shell
npm install @samuelncui/chonky @samuelncui/chonky-icon-fontawesome
```

Add to your app:

```typescript
import { FullFileBrowser } from '@samuelncui/chonky';
import { ChonkyIconFA } from '@samuelncui/chonky-icon-fontawesome';

export function MyComponent() {
  return <FullFileBrowser files={[]} darkMode iconComponent={ChonkyIconFA} />;
}
```

See the runnable [example](./packages/chonky/example) and the
[`@samuelncui/chonky` package documentation](./packages/chonky/README.md).
The upstream [Chonky documentation](https://chonky.io/) remains useful for
general concepts, but APIs and compatibility may differ from this fork.

> Please [create an issue](https://github.com/samuelncui/Chonky/issues) if you have a
> problem or want to request a feature.

## License

MIT © Samuel N Cui. 2023

MIT © [Aperture Robotics, LLC.](https://github.com/aperturerobotics/react-chonky) 2023

MIT © [Tim Kuzhagaliyev](https://github.com/TimboKZ) 2020
