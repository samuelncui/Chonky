import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function verifyRelease(repository, commit, baseline, tag, previousTip) {
  const git = (...args) =>
    execFileSync('git', ['-C', repository, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  assert(/^[a-f0-9]{40}$/.test(commit || ''), 'Set RELEASE_COMMIT to the exact approved commit');
  assert(/^[a-f0-9]{40}$/.test(baseline || ''), 'Set RELEASE_BASE_COMMIT to the reviewed public tip');
  assert(realpathSync(git('rev-parse', '--show-toplevel')) === realpathSync(repository), 'Use the repository root');
  assert(git('rev-parse', '--is-shallow-repository') === 'false', 'Release checks require complete Git history');
  assert(git('rev-parse', 'HEAD') === commit, 'RELEASE_COMMIT must match HEAD');
  assert(git('status', '--porcelain=v1', '--untracked-files=all') === '', 'Release inputs must be clean');
  assert(git('rev-parse', `${baseline}^{commit}`) === baseline, 'Public baseline must identify a commit');
  if (previousTip) assert(previousTip === baseline, 'Push previous tip differs from the approved public baseline');
  if (commit !== baseline) {
    assert(
      git('show', '-s', '--format=%P', commit) === baseline,
      'Squash reviewed unpublished work into one commit directly above the public baseline before publication',
    );
  }

  const packages = ['chonky', 'chonky-icon-fontawesome'].map((name) =>
    JSON.parse(readFileSync(path.join(repository, 'packages', name, 'package.json'), 'utf8')),
  );
  assert(packages[0].version === packages[1].version, 'Both package versions must match');
  if (tag !== undefined) {
    assert(/^v\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/.test(tag), 'Release tag must use the v<version> format');
    assert(
      packages.every((pkg) => pkg.version === tag.slice(1)),
      'Release tag must match both package versions',
    );
    // Local preflight precedes tag approval; an existing tag must identify this source.
    if (git('tag', '--list', tag)) {
      assert(git('rev-parse', `${tag}^{commit}`) === commit, 'Release tag must resolve to RELEASE_COMMIT');
    }
  }
  return commit;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const commit = verifyRelease(
      process.cwd(),
      process.env.RELEASE_COMMIT,
      process.env.RELEASE_BASE_COMMIT,
      process.argv[2],
      process.env.RELEASE_PREVIOUS_TIP,
    );
    console.log(`Release source ${commit}; public baseline ${process.env.RELEASE_BASE_COMMIT}; versions match.`);
  } catch (error) {
    console.error(
      error.code === 'ERR_ASSERTION'
        ? error.message
        : 'Release source check failed; check Git inputs and package metadata',
    );
    process.exitCode = 1;
  }
}
