import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRelease } from './verify-release.mjs';

const repositoryName = 'samuelncui/Chonky';
const workflowPath = '.github/workflows/tests.yml';
const ref = 'refs/heads/master';
const workflowRef = `${repositoryName}/${workflowPath}@${ref}`;
const packageNames = ['chonky', 'chonky-icon-fontawesome'];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJSON = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const isID = (value) => /^[1-9][0-9]*$/.test(String(value)) && Number.isSafeInteger(Number(value));

function sourceIdentity(repository, commit, baseline, tag) {
  verifyRelease(repository, commit, baseline, tag);
  return {
    commit,
    baseline,
    version: readJSON(path.join(repository, 'packages/chonky/package.json')).version,
    lockSha256: sha256(fs.readFileSync(path.join(repository, 'pnpm-lock.yaml'))),
  };
}

function verifyIdentity(identity) {
  assert(identity.repository === repositoryName, 'Candidate must come from the trusted repository');
  assert(
    identity.workflowRef === workflowRef && identity.ref === ref,
    'Candidate must use the Tests workflow on master',
  );
  assert(
    ['push', 'workflow_dispatch'].includes(identity.event),
    'Pull request and other candidate sources are unapproved',
  );
  assert(isID(identity.runId) && isID(identity.runAttempt), 'Candidate run and attempt must be positive integer IDs');
}

export function selectCandidate(run, workflow, artifacts, expected, now = Date.now()) {
  assert(
    isID(expected.runId) && String(run.id) === String(expected.runId),
    'Candidate run ID must match the requested run',
  );
  const identity = {
    repository: run.repository?.full_name,
    workflowRef,
    ref: `refs/heads/${run.head_branch}`,
    event: run.event,
    runId: String(run.id),
    runAttempt: String(run.run_attempt),
  };
  verifyIdentity(identity);
  assert(
    run.head_repository?.full_name === repositoryName && run.head_repository.id === run.repository.id,
    'Fork candidates are unapproved',
  );
  assert(
    workflow.path === workflowPath && run.workflow_id === workflow.id && run.path?.split('@')[0] === workflowPath,
    'Candidate workflow identity must match Tests',
  );
  assert(
    run.status === 'completed' && run.conclusion === 'success',
    'Candidate workflow must have completed successfully',
  );
  assert(run.head_sha === expected.commit, 'Candidate commit must match the approved source');
  const matches = artifacts.filter((artifact) => artifact.name === `chonky-candidate-${run.id}-${run.run_attempt}`);
  assert(matches.length === 1, 'Exactly one candidate artifact from the successful run attempt is required');
  const artifact = matches[0];
  assert(artifact.expired === false && Date.parse(artifact.expires_at) > now, 'Candidate artifact has expired');
  assert(isID(artifact.id) && artifact.size_in_bytes > 0, 'Candidate artifact is incomplete');
  assert(/^sha256:[a-f0-9]{64}$/.test(artifact.digest || ''), 'Candidate requires an immutable artifact digest');
  assert(
    artifact.workflow_run?.id === run.id &&
      artifact.workflow_run.repository_id === run.repository.id &&
      artifact.workflow_run.head_repository_id === run.repository.id &&
      artifact.workflow_run.head_sha === expected.commit &&
      artifact.workflow_run.head_branch === 'master',
    'Artifact source must match the selected candidate run',
  );
  return { ...expected, ...identity, artifactId: String(artifact.id) };
}

function inventory(directory) {
  const files = [];
  function visit(relative) {
    for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
      const member = path.posix.join(relative, name);
      const filename = path.join(directory, member);
      const entry = fs.lstatSync(filename);
      assert(entry.isFile() || entry.isDirectory(), 'Candidate must contain only ordinary files and directories');
      if (member === 'manifest.json') {
        assert(entry.isFile(), 'Candidate manifest must be an ordinary file');
        continue;
      }
      if (entry.isDirectory()) {
        visit(member);
      } else {
        const bytes = fs.readFileSync(filename);
        files.push({
          path: member,
          sha256: sha256(bytes),
          ...(member.endsWith('.tgz') ? { sha512: createHash('sha512').update(bytes).digest('hex') } : {}),
        });
      }
    }
  }
  visit('');
  assert(
    JSON.stringify(fs.readdirSync(path.join(directory, 'packages')).sort()) ===
      JSON.stringify(packageNames.map((name) => `${name}.tgz`).sort()),
    'Candidate must contain exactly the two npm tarballs',
  );
  assert(
    files.some((file) => file.path === 'pages/index.html'),
    'Candidate Pages output is incomplete',
  );
  assert(
    files.every((file) => file.path.startsWith('packages/') || file.path.startsWith('pages/')),
    'Candidate contains unexpected files',
  );
  return files;
}

export function sealCandidate(repository, directory, identity) {
  verifyIdentity(identity);
  assert(!fs.existsSync(path.join(directory, 'manifest.json')), 'Candidate is already sealed; create fresh outputs');
  const source = sourceIdentity(repository, identity.commit, identity.baseline);
  fs.cpSync(path.join(repository, 'packages/chonky/example/dist'), path.join(directory, 'pages'), { recursive: true });
  const files = inventory(directory);
  for (const name of packageNames) {
    const pkg = JSON.parse(
      execFileSync('tar', ['-xOf', path.join(directory, 'packages', `${name}.tgz`), 'package/package.json'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );
    assert(
      pkg.name === `@samuelncui/${name}` && pkg.version === source.version,
      'Packed package identity must match source',
    );
  }
  const manifest = { ...identity, ...source, files };
  fs.writeFileSync(path.join(directory, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}

export function verifyCandidate(repository, directory, selection, commit, baseline, tag) {
  verifyIdentity(selection);
  const source = sourceIdentity(repository, commit, baseline, tag);
  assert(fs.lstatSync(path.join(directory, 'manifest.json')).isFile(), 'Candidate manifest must be an ordinary file');
  const manifest = readJSON(path.join(directory, 'manifest.json'));
  for (const key of ['repository', 'workflowRef', 'ref', 'event', 'runId', 'runAttempt']) {
    assert(manifest[key] === selection[key], `Candidate ${key} must match the selected workflow run`);
  }
  for (const [key, value] of Object.entries(source)) {
    assert(manifest[key] === value && selection[key] === value, `Candidate ${key} must match approved source`);
  }
  assert.deepEqual(manifest.files, inventory(directory), 'Candidate file inventory or checksums differ');
  return manifest;
}

async function github(route) {
  assert(process.env.GITHUB_REPOSITORY === repositoryName, 'Candidate reuse requires the trusted repository');
  assert(process.env.GH_TOKEN, 'Candidate selection requires a GitHub Actions read token');
  const response = await globalThis.fetch(`https://api.github.com/repos/${repositoryName}/actions/${route}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  assert(response.ok, 'Candidate metadata is unavailable; expired or missing artifacts cannot be reused');
  return response.json();
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, directory, selectionFile] = process.argv.slice(2);
    const repository = process.cwd();
    if (mode === 'seal') {
      const manifest = sealCandidate(repository, directory, {
        repository: process.env.GITHUB_REPOSITORY,
        workflowRef: process.env.GITHUB_WORKFLOW_REF,
        ref: process.env.GITHUB_REF,
        event: process.env.GITHUB_EVENT_NAME,
        runId: process.env.GITHUB_RUN_ID,
        runAttempt: process.env.GITHUB_RUN_ATTEMPT,
        commit: process.env.RELEASE_COMMIT,
        baseline: process.env.RELEASE_BASE_COMMIT,
      });
      console.log(`Sealed candidate ${manifest.commit} version ${manifest.version}; ${manifest.files.length} files.`);
    } else if (mode === 'select') {
      if (process.env.RELEASE_TAG) {
        assert(
          process.env.GITHUB_REF === `refs/tags/${process.env.RELEASE_TAG}`,
          'Publication ref must be the approved version tag',
        );
      }
      const expected = {
        ...sourceIdentity(
          repository,
          process.env.RELEASE_COMMIT,
          process.env.RELEASE_BASE_COMMIT,
          process.env.RELEASE_TAG || undefined,
        ),
        runId: process.env.CANDIDATE_RUN_ID,
      };
      assert(isID(expected.runId), 'Set candidate_run_id to the approved Tests run ID');
      const [run, workflow, result] = await Promise.all([
        github(`runs/${expected.runId}`),
        github('workflows/tests.yml'),
        github(`runs/${expected.runId}/artifacts?per_page=100`),
      ]);
      assert(result.total_count === result.artifacts.length, 'Candidate artifact listing is incomplete');
      const selection = selectCandidate(run, workflow, result.artifacts, expected);
      fs.writeFileSync(directory, JSON.stringify(selection));
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `artifact_id=${selection.artifactId}\nrun_id=${selection.runId}\n`);
      console.log(`Selected immutable candidate artifact ${selection.artifactId} from Tests run ${selection.runId}.`);
    } else {
      assert(mode === 'verify', 'Usage: verify-candidate.mjs <seal|select|verify> <path> [selection-file]');
      const manifest = verifyCandidate(
        repository,
        directory,
        readJSON(selectionFile),
        process.env.RELEASE_COMMIT,
        process.env.RELEASE_BASE_COMMIT,
        process.env.RELEASE_TAG || undefined,
      );
      console.log(
        `Verified candidate ${manifest.commit} version ${manifest.version}; ${manifest.files.length} file checksums match.`,
      );
    }
  } catch (error) {
    console.error(
      error.code === 'ERR_ASSERTION'
        ? error.message
        : 'Candidate verification failed; check metadata and complete artifact inputs',
    );
    process.exitCode = 1;
  }
}
