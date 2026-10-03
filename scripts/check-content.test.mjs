import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { checkContent, stageSource } from './check-content.mjs';

function temporary(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chonky-content-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function repository(t) {
  const root = temporary(t);
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Content test');
  git('config', 'user.email', 'content-test@example.invalid');
  const commit = (message = 'Public fixture') => {
    git('add', '.');
    git('-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  return { root, commit };
}

test('source staging includes changed and untracked inputs, excludes ignored data, and rejects symlinks', (t) => {
  const { root, commit } = repository(t);
  fs.writeFileSync(path.join(root, '.gitignore'), 'ignored\n');
  fs.writeFileSync(path.join(root, 'tracked'), 'old');
  commit();
  fs.writeFileSync(path.join(root, 'tracked'), 'current');
  fs.writeFileSync(path.join(root, 'untracked'), 'new');
  fs.writeFileSync(path.join(root, 'ignored'), 'private');
  const staged = path.join(temporary(t), 'source');
  stageSource(root, staged);
  assert.equal(fs.readFileSync(path.join(staged, 'tracked'), 'utf8'), 'current');
  assert.equal(fs.readFileSync(path.join(staged, 'untracked'), 'utf8'), 'new');
  assert(!fs.existsSync(path.join(staged, 'ignored')));
  assert(!fs.existsSync(path.join(staged, '.git')));
  fs.symlinkSync(path.join(root, 'ignored'), path.join(root, 'link'));
  assert.throws(() => stageSource(root, staged), /ordinary file/);
  fs.unlinkSync(path.join(root, 'ignored'));
  assert.throws(() => stageSource(root, staged), /ordinary file/);
});

test('pinned scanner is required; modified executable, default rules and project rules fail closed', (t) => {
  const root = temporary(t);
  fs.writeFileSync(path.join(root, 'public.txt'), 'Public content');
  const installed = process.env.GITLEAKS_BIN;
  assert(installed, 'Install the pinned scanner and set GITLEAKS_BIN; scanner tests must not skip');
  const scanner = path.join(temporary(t), 'gitleaks');
  fs.copyFileSync(installed, scanner);
  const rules = path.join(path.dirname(scanner), 'gitleaks-default.toml');
  fs.writeFileSync(rules, 'modified rules');
  assert.throws(() => checkContent('artifacts', root, undefined, scanner), /default credential rule checksum/);
  fs.writeFileSync(scanner, 'modified executable');
  assert.throws(() => checkContent('artifacts', root, undefined, scanner), /scanner checksum/);
  const changedScript = path.join(temporary(t), 'check-content.mjs');
  fs.copyFileSync(fileURLToPath(new URL('./check-content.mjs', import.meta.url)), changedScript);
  fs.writeFileSync(path.join(path.dirname(changedScript), 'content-rules.toml'), 'modified project rules');
  const result = spawnSync(process.execPath, [changedScript, 'artifacts', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /project content rule checksum/);
});

test('compressed npm contents are scanned and failures never print the credential or match', (t) => {
  const content = temporary(t);
  const artifacts = temporary(t);
  const dummy = ['ghp', randomBytes(18).toString('hex')].join('_');
  const privateContext = 'private-context-must-not-appear';
  fs.writeFileSync(path.join(content, 'fixture.txt'), `${privateContext}: ${dummy}\n`);
  execFileSync('tar', ['-czf', path.join(artifacts, 'fixture.tgz'), '-C', content, '.']);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./check-content.mjs', import.meta.url)), 'artifacts', artifacts],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /github-pat/);
  assert(!`${result.stdout}${result.stderr}`.includes(dummy));
  assert(!`${result.stdout}${result.stderr}`.includes(privateContext));
});

test('both release CLIs execute when invoked through symlinks', (t) => {
  const root = temporary(t);
  for (const name of ['check-content.mjs', 'verify-release.mjs']) {
    const link = path.join(root, name);
    fs.symlinkSync(fileURLToPath(new URL(name, import.meta.url)), link);
    const result = spawnSync(process.execPath, [link], { encoding: 'utf8', cwd: root });
    assert.equal(result.status, 1);
    assert(result.stderr.length > 0);
  }
});

test('artifact scans include generated code, dependencies, source maps, locks, and inline allows', (t) => {
  const root = temporary(t);
  const dummy = ['ghp', randomBytes(18).toString('hex')].join('_');
  for (const name of [
    'dist/generated.js',
    'node_modules/fixture/index.js',
    'vendor/fixture.js',
    'bundle.min.js.map',
    'pnpm-lock.yaml',
  ]) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `credential=${dummy} // gitleaks:allow\n`);
    fs.writeFileSync(path.join(root, '.gitleaksignore'), `${name}:github-pat:1\n`);
    assert.throws(() => checkContent('artifacts', root), /github-pat/);
    fs.rmSync(file);
  }
});

test('history exceptions match one published fingerprint only', (t) => {
  const { root, commit } = repository(t);
  const file = path.join(root, 'fixture.txt');
  const fixture = ['', 'Users', 'history-fixture', 'private.txt'].join('/') + '\n';
  fs.writeFileSync(file, fixture);
  const original = commit();
  fs.writeFileSync(file, 'Public fixture\n');
  commit();
  const ignore = path.join(root, '.gitleaksignore');
  fs.writeFileSync(ignore, `${original}:fixture.txt:personal-build-path:1\n`);
  checkContent('source', root, 'HEAD');

  fs.writeFileSync(file, fixture);
  assert.throws(() => checkContent('source', root, 'HEAD'), /personal-build-path/);
  const artifacts = temporary(t);
  fs.copyFileSync(file, path.join(artifacts, 'fixture.txt'));
  fs.copyFileSync(ignore, path.join(artifacts, '.gitleaksignore'));
  assert.throws(() => checkContent('artifacts', artifacts), /personal-build-path/);
  commit();
  fs.writeFileSync(file, 'Public fixture again\n');
  commit();
  assert.throws(() => checkContent('source', root, 'HEAD'), /personal-build-path/);
});

test('broad historical ignores are rejected and commit messages have no exceptions', (t) => {
  const { root, commit } = repository(t);
  fs.writeFileSync(path.join(root, 'fixture.txt'), 'Public fixture\n');
  commit(['https:/', 'service.internal', 'private'].join('/'));
  for (const fingerprint of [
    'fixture.txt:personal-build-path:1',
    `${'a'.repeat(40)}:*.txt:personal-build-path:1`,
    `${'a'.repeat(40)}:../fixture.txt:personal-build-path:1`,
  ]) {
    fs.writeFileSync(path.join(root, '.gitleaksignore'), fingerprint);
    assert.throws(() => checkContent('source', root, 'HEAD'), /History exceptions require exact/);
  }
  fs.writeFileSync(path.join(root, '.gitleaksignore'), '');
  assert.throws(() => checkContent('source', root, 'HEAD'), /private-service-url/);
});

test('public artifacts pass; empty directories and artifact symlinks fail', (t) => {
  const root = temporary(t);
  assert.throws(() => checkContent('artifacts', root), /must not be empty/);
  fs.writeFileSync(path.join(root, 'public.txt'), 'https://github.com/samuelncui/Chonky\n');
  checkContent('artifacts', root);
  fs.symlinkSync(path.join(root, 'public.txt'), path.join(root, 'link'));
  assert.throws(() => checkContent('artifacts', root), /ordinary files/);
});
