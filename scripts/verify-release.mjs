import { readFileSync } from 'node:fs';

const tag = process.argv[2];
if (!tag?.startsWith('v')) {
  throw new Error('Release tag must use the v<version> format');
}

const expectedVersion = tag.slice(1);
const packagePaths = ['packages/chonky/package.json', 'packages/chonky-icon-fontawesome/package.json'];

for (const packagePath of packagePaths) {
  const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (packageData.version !== expectedVersion) {
    throw new Error(`${packageData.name} is ${packageData.version}, expected ${expectedVersion}`);
  }
}

console.log(`Release ${tag} matches both package versions`);
