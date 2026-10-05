import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { candidateRunID, sealCandidate, selectCandidate, verifyCandidate } from './verify-candidate.mjs';

test('candidate selection uses the explicit dispatch input or approved Release marker', () => {
  assert.equal(candidateRunID('42'), '42');
  assert.equal(candidateRunID('', '# Release\n<!-- candidate_run_id: 42 -->\nChanges'), '42');
  assert.equal(candidateRunID(undefined, '<!--\n candidate_run_id: 42\n -->'), '42');
  assert.throws(() => candidateRunID('invalid', '<!-- candidate_run_id: 42 -->'), /approved Tests run ID/);
  for (const body of [
    '',
    'https://github.com/samuelncui/Chonky/actions/runs/42',
    '<!-- candidate_run_id: 42 --><!-- candidate_run_id: 43 -->',
  ]) {
    assert.throws(() => candidateRunID('', body), /identify one approved/);
  }
  for (const id of ['0', '1.5', '42; echo invalid', '9007199254740992']) {
    assert.throws(() => candidateRunID('', `<!-- candidate_run_id: ${id} -->`), /valid Tests run ID/);
  }
});

function metadata() {
  const expected = {
    runId: '42',
    commit: 'a'.repeat(40),
    baseline: 'b'.repeat(40),
    version: '1.2.3',
    lockSha256: 'c'.repeat(64),
  };
  const run = {
    id: 42,
    run_attempt: 2,
    repository: { id: 7, full_name: 'samuelncui/Chonky' },
    head_repository: { id: 7, full_name: 'samuelncui/Chonky' },
    path: '.github/workflows/tests.yml',
    workflow_id: 9,
    head_branch: 'master',
    head_sha: expected.commit,
    event: 'push',
    status: 'completed',
    conclusion: 'success',
  };
  const workflow = { id: 9, path: '.github/workflows/tests.yml' };
  const artifacts = [
    {
      id: 100,
      name: 'chonky-candidate-42-2',
      expired: false,
      expires_at: '2099-01-01T00:00:00Z',
      size_in_bytes: 512,
      digest: `sha256:${'d'.repeat(64)}`,
      workflow_run: {
        id: 42,
        repository_id: 7,
        head_repository_id: 7,
        head_sha: expected.commit,
        head_branch: 'master',
      },
    },
  ];
  return { expected, run, workflow, artifacts };
}

function fixture(t) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chonky-candidate-test-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const repository = path.join(temporary, 'repository');
  const candidate = path.join(temporary, 'candidate');
  fs.mkdirSync(repository);
  fs.mkdirSync(path.join(candidate, 'packages'), { recursive: true });
  const git = (...args) =>
    execFileSync('git', ['-C', repository, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Candidate test');
  git('config', 'user.email', 'candidate-test@example.invalid');
  fs.writeFileSync(path.join(repository, '.gitignore'), 'dist/\n');
  fs.writeFileSync(path.join(repository, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  for (const name of ['chonky', 'chonky-icon-fontawesome']) {
    const pkg = path.join(repository, 'packages', name);
    fs.mkdirSync(pkg, { recursive: true });
    fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: `@samuelncui/${name}`, version: '1.2.3' }));
    const staging = path.join(temporary, name);
    fs.mkdirSync(path.join(staging, 'package'), { recursive: true });
    fs.copyFileSync(path.join(pkg, 'package.json'), path.join(staging, 'package/package.json'));
    execFileSync('tar', ['-czf', path.join(candidate, 'packages', `${name}.tgz`), '-C', staging, 'package']);
  }
  const pages = path.join(repository, 'packages/chonky/example/dist');
  fs.mkdirSync(path.join(pages, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(pages, 'index.html'), '<script src="/Chonky/assets/demo.js"></script>\n');
  fs.writeFileSync(path.join(pages, 'assets/demo.js'), 'console.log("public fixture");\n');
  git('add', '.');
  git('-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Public fixture');
  const commit = git('rev-parse', 'HEAD');
  const identity = {
    repository: 'samuelncui/Chonky',
    workflowRef: 'samuelncui/Chonky/.github/workflows/tests.yml@refs/heads/master',
    ref: 'refs/heads/master',
    event: 'push',
    runId: '42',
    runAttempt: '2',
    commit,
    baseline: commit,
  };
  const manifest = sealCandidate(repository, candidate, identity);
  const selection = { ...identity, version: manifest.version, lockSha256: manifest.lockSha256, artifactId: '100' };
  const verify = (selected = selection, tag) => verifyCandidate(repository, candidate, selected, commit, commit, tag);
  return { temporary, repository, candidate, identity, manifest, selection, verify };
}

test('selection accepts only successful trusted master candidates and the current immutable attempt', () => {
  const { expected, run, workflow, artifacts } = metadata();
  for (const event of ['push', 'workflow_dispatch']) {
    const selected = selectCandidate({ ...run, event }, workflow, artifacts, expected);
    assert.equal(selected.artifactId, '100');
    assert.equal(selected.runAttempt, '2');
    assert.equal(selected.commit, expected.commit);
  }
  assert.equal(
    selectCandidate({ ...run, path: `${run.path}@master` }, workflow, artifacts, expected).artifactId,
    '100',
  );
});

test('mismatched, failed, expired, partial and unapproved candidate selections fail closed', async (t) => {
  const cases = [
    [
      'missing run ID',
      (m) => {
        m.expected.runId = undefined;
      },
      /run ID/,
    ],
    [
      'different run',
      (m) => {
        m.run.id = 43;
      },
      /run ID/,
    ],
    [
      'different repository',
      (m) => {
        m.run.repository.full_name = 'other/Chonky';
      },
      /trusted repository/,
    ],
    [
      'fork',
      (m) => {
        m.run.head_repository.id = 8;
      },
      /Fork/,
    ],
    [
      'other branch',
      (m) => {
        m.run.head_branch = 'feature';
      },
      /on master/,
    ],
    [
      'pull request',
      (m) => {
        m.run.event = 'pull_request';
      },
      /unapproved/,
    ],
    [
      'other event',
      (m) => {
        m.run.event = 'workflow_run';
      },
      /unapproved/,
    ],
    [
      'other workflow ID',
      (m) => {
        m.run.workflow_id = 10;
      },
      /workflow identity/,
    ],
    [
      'other workflow path',
      (m) => {
        m.run.path = '.github/workflows/demo.yml';
      },
      /workflow identity/,
    ],
    [
      'other workflow owner',
      (m) => {
        m.workflow.path = '.github/workflows/demo.yml';
      },
      /workflow identity/,
    ],
    [
      'unfinished run',
      (m) => {
        m.run.status = 'in_progress';
      },
      /successfully/,
    ],
    [
      'failed run',
      (m) => {
        m.run.conclusion = 'failure';
      },
      /successfully/,
    ],
    [
      'cancelled run',
      (m) => {
        m.run.conclusion = 'cancelled';
      },
      /successfully/,
    ],
    [
      'other commit',
      (m) => {
        m.run.head_sha = 'e'.repeat(40);
      },
      /approved source/,
    ],
    [
      'missing artifact',
      (m) => {
        m.artifacts = [];
      },
      /Exactly one/,
    ],
    [
      'duplicate artifact',
      (m) => {
        m.artifacts.push({ ...m.artifacts[0] });
      },
      /Exactly one/,
    ],
    [
      'previous attempt',
      (m) => {
        m.artifacts[0].name = 'chonky-candidate-42-1';
      },
      /run attempt/,
    ],
    [
      'expired flag',
      (m) => {
        m.artifacts[0].expired = true;
      },
      /expired/,
    ],
    [
      'expired date',
      (m) => {
        m.artifacts[0].expires_at = '2020-01-01';
      },
      /expired/,
    ],
    [
      'missing expiry',
      (m) => {
        delete m.artifacts[0].expires_at;
      },
      /expired/,
    ],
    [
      'empty artifact',
      (m) => {
        m.artifacts[0].size_in_bytes = 0;
      },
      /incomplete/,
    ],
    [
      'missing immutable digest',
      (m) => {
        delete m.artifacts[0].digest;
      },
      /immutable/,
    ],
    [
      'artifact from another run',
      (m) => {
        m.artifacts[0].workflow_run.id = 43;
      },
      /Artifact source/,
    ],
    [
      'artifact from another repository',
      (m) => {
        m.artifacts[0].workflow_run.repository_id = 8;
      },
      /Artifact source/,
    ],
    [
      'artifact from a fork',
      (m) => {
        m.artifacts[0].workflow_run.head_repository_id = 8;
      },
      /Artifact source/,
    ],
    [
      'artifact from another commit',
      (m) => {
        m.artifacts[0].workflow_run.head_sha = 'e'.repeat(40);
      },
      /Artifact source/,
    ],
    [
      'artifact from another ref',
      (m) => {
        m.artifacts[0].workflow_run.head_branch = 'feature';
      },
      /Artifact source/,
    ],
  ];
  for (const [name, change, error] of cases) {
    await t.test(name, () => {
      const m = metadata();
      change(m);
      assert.throws(() => selectCandidate(m.run, m.workflow, m.artifacts, m.expected), error);
    });
  }
});

test('sealed candidate records source, lock, both package hashes and exact Pages bytes without rebuilding', (t) => {
  const { candidate, manifest, verify } = fixture(t);
  assert.deepEqual(verify(undefined, 'v1.2.3'), manifest);
  assert.equal(manifest.files.length, 4);
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(candidate, file.path));
    assert.equal(file.sha256, createHash('sha256').update(bytes).digest('hex'));
    if (file.path.endsWith('.tgz')) assert.equal(file.sha512, createHash('sha512').update(bytes).digest('hex'));
  }
  assert.equal(
    fs.readFileSync(path.join(candidate, 'pages/index.html'), 'utf8'),
    '<script src="/Chonky/assets/demo.js"></script>\n',
  );
  assert.throws(() => verify(undefined, 'v2.0.0'), /both package versions/);
});

test('manifest identity, source, version and lock changes cannot reuse acceptance', async (t) => {
  const f = fixture(t);
  for (const key of [
    'repository',
    'workflowRef',
    'ref',
    'event',
    'runId',
    'runAttempt',
    'commit',
    'baseline',
    'version',
    'lockSha256',
  ]) {
    await t.test(key, () => {
      const manifest = { ...f.manifest, [key]: 'mismatch' };
      fs.writeFileSync(path.join(f.candidate, 'manifest.json'), JSON.stringify(manifest));
      assert.throws(() => f.verify(), new RegExp(`Candidate ${key}`));
    });
  }
});

test('changed or partial package and Pages files, extra files and symlinks fail closed', async (t) => {
  const cases = [
    [
      'changed package',
      (f) => fs.appendFileSync(path.join(f.candidate, 'packages/chonky.tgz'), 'modified'),
      /checksums/,
    ],
    [
      'changed Pages file',
      (f) => fs.appendFileSync(path.join(f.candidate, 'pages/assets/demo.js'), 'modified'),
      /checksums/,
    ],
    ['missing package', (f) => fs.rmSync(path.join(f.candidate, 'packages/chonky.tgz')), /two npm tarballs/],
    ['missing Pages index', (f) => fs.rmSync(path.join(f.candidate, 'pages/index.html')), /Pages output is incomplete/],
    ['missing Pages asset', (f) => fs.rmSync(path.join(f.candidate, 'pages/assets/demo.js')), /checksums/],
    [
      'extra package',
      (f) =>
        fs.copyFileSync(path.join(f.candidate, 'packages/chonky.tgz'), path.join(f.candidate, 'packages/extra.tgz')),
      /two npm tarballs/,
    ],
    ['extra root file', (f) => fs.writeFileSync(path.join(f.candidate, 'extra'), 'extra'), /unexpected files/],
    [
      'Pages symlink',
      (f) => fs.symlinkSync(path.join(f.candidate, 'pages/index.html'), path.join(f.candidate, 'pages/link')),
      /ordinary files/,
    ],
    [
      'manifest symlink',
      (f) => {
        fs.renameSync(path.join(f.candidate, 'manifest.json'), path.join(f.temporary, 'manifest.json'));
        fs.symlinkSync(path.join(f.temporary, 'manifest.json'), path.join(f.candidate, 'manifest.json'));
      },
      /ordinary file/,
    ],
    ['missing manifest', (f) => fs.rmSync(path.join(f.candidate, 'manifest.json')), /ENOENT/],
  ];
  for (const [name, change, error] of cases) {
    await t.test(name, (t) => {
      const f = fixture(t);
      change(f);
      assert.throws(() => f.verify(), error);
    });
  }
});

test('failed sealing leaves no manifest and never replaces a sealed candidate', (t) => {
  const { repository, candidate, identity } = fixture(t);
  assert.throws(() => sealCandidate(repository, candidate, identity), /already sealed/);
  fs.rmSync(path.join(candidate, 'manifest.json'));
  fs.rmSync(path.join(candidate, 'packages/chonky.tgz'));
  assert.throws(() => sealCandidate(repository, candidate, identity), /two npm tarballs/);
  assert(!fs.existsSync(path.join(candidate, 'manifest.json')));
});

test('consumer CLI exits unsuccessfully for corrupt inputs and a branch impersonating a publication tag', (t) => {
  const f = fixture(t);
  const selected = path.join(f.temporary, 'selection.json');
  fs.writeFileSync(selected, JSON.stringify(f.selection));
  const script = fileURLToPath(new URL('./verify-candidate.mjs', import.meta.url));
  const env = {
    ...process.env,
    RELEASE_COMMIT: f.identity.commit,
    RELEASE_BASE_COMMIT: f.identity.baseline,
    RELEASE_TAG: '',
  };
  fs.appendFileSync(path.join(f.candidate, 'pages/assets/demo.js'), 'modified');
  const verification = spawnSync(process.execPath, [script, 'verify', f.candidate, selected], {
    cwd: f.repository,
    env,
    encoding: 'utf8',
  });
  assert.equal(verification.status, 1);
  assert.match(verification.stderr, /checksums differ/);
  const selection = spawnSync(process.execPath, [script, 'select', selected], {
    cwd: f.repository,
    env: { ...env, RELEASE_TAG: 'v1.2.3', GITHUB_REF: 'refs/heads/v1.2.3' },
    encoding: 'utf8',
  });
  assert.equal(selection.status, 1);
  assert.match(selection.stderr, /approved version tag/);
});
