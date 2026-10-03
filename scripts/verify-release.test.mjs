import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { verifyRelease } from './verify-release.mjs';
import { checkContent } from './check-content.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chonky-release-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '--initial-branch=main');
  git('config', 'user.name', 'Release test');
  git('config', 'user.email', 'release-test@example.invalid');
  for (const name of ['chonky', 'chonky-icon-fontawesome']) {
    fs.mkdirSync(path.join(root, 'packages', name), { recursive: true });
    fs.writeFileSync(path.join(root, 'packages', name, 'package.json'), JSON.stringify({ name, version: '1.2.3' }));
  }
  const commit = () => {
    git('add', '.');
    git(
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      'commit',
      '--allow-empty',
      '-qm',
      'Public fixture',
    );
    return git('rev-parse', 'HEAD');
  };
  return { root, git, commit, baseline: commit() };
}

test('explicit unchanged public source or one release commit passes without rewriting refs', (t) => {
  const { root, git, baseline, commit } = fixture(t);
  assert.equal(verifyRelease(root, baseline, baseline, 'v1.2.3'), baseline);
  const head = commit();
  assert.equal(verifyRelease(root, head, baseline, 'v1.2.3', baseline), head);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.throws(() => verifyRelease(root, head, baseline, 'v1.2.3', head), /previous tip/);
});

test('absent or mismatched identities, dirty files, untracked inputs and versions fail', (t) => {
  const { root, baseline, commit } = fixture(t);
  assert.throws(() => verifyRelease(root, undefined, baseline), /RELEASE_COMMIT/);
  assert.throws(() => verifyRelease(root, baseline, undefined), /RELEASE_BASE_COMMIT/);
  assert.throws(() => verifyRelease(root, '0'.repeat(40), baseline), /match HEAD/);
  assert.throws(() => verifyRelease(root, baseline, baseline, '1.2.3'), /format/);
  assert.throws(() => verifyRelease(root, baseline, baseline, 'v2.0.0'), /both package versions/);
  const file = path.join(root, 'packages/chonky/package.json');
  fs.appendFileSync(file, '\n');
  assert.throws(() => verifyRelease(root, baseline, baseline), /clean/);
  const changed = commit();
  fs.writeFileSync(path.join(root, 'untracked'), 'new');
  assert.throws(() => verifyRelease(root, changed, baseline), /clean/);
  fs.rmSync(path.join(root, 'untracked'));
  fs.writeFileSync(file, JSON.stringify({ name: 'chonky', version: '2.0.0' }));
  const mismatched = commit();
  assert.throws(() => verifyRelease(root, mismatched, changed), /versions must match/);
});

test('multiple unpublished commits and merge commits must be squashed', (t) => {
  const { root, git, baseline, commit } = fixture(t);
  commit();
  const head = commit();
  assert.throws(() => verifyRelease(root, head, baseline), /Squash/);
  git('switch', '-qc', 'side', baseline);
  fs.writeFileSync(path.join(root, 'side'), 'Public content');
  commit();
  git('switch', '-q', 'main');
  git(
    '-c',
    'commit.gpgsign=false',
    '-c',
    'core.hooksPath=/dev/null',
    'merge',
    '--no-ff',
    '-qm',
    'Merge fixture',
    'side',
  );
  assert.throws(() => verifyRelease(root, git('rev-parse', 'HEAD'), head), /Squash/);
});

test('a tag resolving to different source and shallow history fail closed', (t) => {
  const { root, git, baseline, commit } = fixture(t);
  git('-c', 'tag.gpgSign=false', 'tag', 'v1.2.3');
  const head = commit();
  assert.throws(() => verifyRelease(root, head, baseline, 'v1.2.3'), /tag must resolve/);
  const shallow = path.join(root, 'shallow');
  execFileSync('git', ['clone', '-q', '--depth=1', `file://${root}`, shallow]);
  assert.throws(() => verifyRelease(shallow, head, baseline), /complete Git history/);
  assert.throws(() => checkContent('source', shallow, 'HEAD'), /complete Git history/);
});
