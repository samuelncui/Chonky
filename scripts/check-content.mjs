import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const version = '8.30.1';
const defaultChecksum = 'e163e53b9e7e8a8511e77271e2b323ed057759542a6d988258afe3a1fa329caf';
const projectChecksum = '0e2940fae1b97b740fc86455d580abf46d8ff611db3fbe07d7364dc37d2acbc1';
// Executable hashes from the checksum-verified official archives in install-gitleaks.sh.
const executableChecksums = {
  'linux-x64': '88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509',
  'darwin-x64': 'cee01fea7173f1b779dff188e1c26ecbcb4027d394acc573b23aaf0be260e291',
  'darwin-arm64': 'ba52fb1bfabbcde42f032afad3d6e0b19dff8ed105229a16e7caa338bbc0e84f',
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (repository, ...args) =>
  execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });

function scannerRules(scanner, temporary) {
  assert(scanner && path.isAbsolute(scanner), 'Set GITLEAKS_BIN to the installed pinned executable');
  assert(
    sha256(fs.readFileSync(scanner)) === executableChecksums[`${process.platform}-${process.arch}`],
    'Unexpected scanner checksum; run scripts/install-gitleaks.sh',
  );
  const original = fs.readFileSync(path.join(path.dirname(scanner), 'gitleaks-default.toml'));
  assert(sha256(original) === defaultChecksum, 'Unexpected default credential rule checksum');
  const project = fs.readFileSync(new URL('./content-rules.toml', import.meta.url));
  assert(sha256(project) === projectChecksum, 'Unexpected project content rule checksum');
  // Keep credential rules, removing global exclusions for generated/dependency/lock files.
  const text = original.toString('utf8');
  const start = text.indexOf('\n[allowlist]\n');
  const end = text.indexOf('\n[[rules]]\n', start);
  assert(start >= 0 && end > start, 'Unexpected default credential configuration');
  const base = path.join(temporary, 'default-rules.toml');
  fs.writeFileSync(base, text.slice(0, start) + text.slice(end));
  const config = path.join(temporary, 'content-rules.toml');
  fs.writeFileSync(config, project.toString('utf8').replace('useDefault = true', `path = ${JSON.stringify(base)}`));
  return config;
}

export function stageSource(repository, destination) {
  const names = git(repository, 'ls-files', '--cached', '--others', '--exclude-standard', '-z')
    .split('\0')
    .filter(Boolean);
  for (const name of new Set(names)) {
    assert(!path.isAbsolute(name) && !name.split('/').includes('..'), 'Unsafe source path');
    const source = path.join(repository, name);
    const entry = fs.lstatSync(source, { throwIfNoEntry: false });
    if (!entry) continue;
    assert(entry.isFile(), 'Source input must be an ordinary file');
    const target = path.join(destination, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

function historyIgnores(repository, destination) {
  const source = path.join(repository, '.gitleaksignore');
  const entry = fs.lstatSync(source, { throwIfNoEntry: false });
  assert(!entry || entry.isFile(), 'History exceptions must be an ordinary file');
  const fingerprints = (entry ? fs.readFileSync(source, 'utf8') : '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  for (const fingerprint of fingerprints) {
    assert(
      /^[0-9a-f]{40}:[^:\r\n]+:[a-z0-9][a-z0-9-]*:[1-9][0-9]*$/.test(fingerprint),
      'History exceptions require exact commit:file:rule:line fingerprints',
    );
    const filename = fingerprint.split(':')[1];
    assert(
      !path.isAbsolute(filename) && !filename.split('/').includes('..') && !/[\\*?[\]]/.test(filename),
      'History exceptions require exact relative paths',
    );
  }
  fs.writeFileSync(destination, fingerprints.join('\n') + '\n');
  return destination;
}

function stageArtifacts(directory, destination) {
  const inventory = [];
  function visit(relative) {
    for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
      const member = path.join(relative, name);
      const source = path.join(directory, member);
      const entry = fs.lstatSync(source);
      assert(entry.isFile() || entry.isDirectory(), 'Artifacts must contain only ordinary files and directories');
      if (entry.isDirectory()) {
        visit(member);
        continue;
      }
      // Gitleaks 8.30.1 opens .tar.gz, but not .tgz. Published bytes remain untouched.
      const target = path.join(destination, member.endsWith('.tgz') ? `${member}.tar.gz` : member);
      assert(!fs.existsSync(target), 'Artifact scan paths overlap');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      inventory.push([member, sha256(fs.readFileSync(source))]);
    }
  }
  visit('');
  assert(inventory.length > 0, 'Artifact directory must not be empty');
  return sha256(JSON.stringify(inventory));
}

export function checkContent(mode, target, historyRange, scanner = process.env.GITLEAKS_BIN) {
  assert(
    ['source', 'artifacts'].includes(mode),
    'Usage: check-content.mjs <source|artifacts> <directory> [history-range]',
  );
  assert(target && fs.statSync(target).isDirectory(), 'Content directory is required');
  assert(!historyRange || mode === 'source', 'History range is only supported for source checks');
  const repository = path.resolve(target);
  if (mode === 'source') {
    historyRange ||= 'HEAD';
    assert(/^[A-Za-z0-9_][A-Za-z0-9_./~^-]*$/.test(historyRange), 'History range must be one Git revision or range');
    assert(
      git(repository, 'rev-parse', '--is-shallow-repository').trim() === 'false',
      'Content checks require complete Git history',
    );
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chonky-content-'));
  try {
    const config = scannerRules(scanner, temporary);
    const noIgnores = path.join(temporary, 'no-ignores');
    fs.writeFileSync(noIgnores, '');
    const staged = path.join(temporary, 'inputs');
    fs.mkdirSync(staged);
    const commands = [{ args: ['dir', staged], ignores: noIgnores }];
    let integrity;
    if (mode === 'source') {
      stageSource(repository, staged);
      commands.push({
        args: ['git', repository, `--log-opts=--full-history -m ${historyRange} --`],
        ignores: historyIgnores(repository, path.join(temporary, 'history-ignores')),
      });
      // Git diff scanning does not inspect commit messages. Scan them without history exceptions.
      const messages = path.join(temporary, 'messages.txt');
      fs.writeFileSync(messages, git(repository, 'log', '--format=%B', historyRange, '--'));
      commands.push({ args: ['dir', messages], ignores: noIgnores });
    } else {
      integrity = stageArtifacts(repository, staged);
    }
    for (const [index, command] of commands.entries()) {
      const report = path.join(temporary, `report-${index}.json`);
      const result = spawnSync(
        scanner,
        [
          ...command.args,
          '--config',
          config,
          '--redact=100',
          '--no-banner',
          '--no-color',
          '--ignore-gitleaks-allow',
          '--gitleaks-ignore-path',
          command.ignores,
          '--max-archive-depth=4',
          '--max-decode-depth=5',
          '--report-format=json',
          '--report-path',
          report,
        ],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      );
      // Neither match snippets nor raw tool diagnostics are safe for public logs.
      if (result.status !== 0) {
        const findings = fs.existsSync(report) ? JSON.parse(fs.readFileSync(report, 'utf8')) : [];
        const counts = {};
        for (const finding of findings) counts[finding.RuleID] = (counts[finding.RuleID] || 0) + 1;
        throw new Error(
          findings.length
            ? `Content check failed (${findings.length} findings): ${JSON.stringify(counts)}`
            : 'Content scanner failed; private diagnostics were suppressed',
        );
      }
    }
    console.log(
      `Public ${mode} passed Gitleaks ${version}${historyRange ? `; history ${historyRange} and commit messages` : `; inventory SHA256 ${integrity}`}.`,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkContent(...process.argv.slice(2));
  } catch (error) {
    console.error(
      error.code === 'ERR_ASSERTION' || error.message.startsWith('Content ')
        ? error.message
        : 'Content check failed; private diagnostics were suppressed',
    );
    process.exitCode = 1;
  }
}
