#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(appDir, 'wrangler.toml');
const deployDir = join(appDir, '.wrangler', 'deploy');
const generatedConfigPath = join(appDir, 'wrangler.generated.toml');
const deployRedirectPath = join(deployDir, 'config.json');

const env = process.env;
const requirePrivateConfig = env.MANJU_REQUIRE_PRIVATE_CONFIG === '1';

let config = readFileSync(sourcePath, 'utf8');
const applied = [];
const missing = [];

const firstEnv = (names) => names.map((name) => env[name]).find((value) => value && value.trim());

const escapeToml = (value) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function replaceString({ label, envNames, regex, validate, required = false, redact = false }) {
  const value = firstEnv(envNames);
  if (!value) {
    if (required) missing.push(`${label} (${envNames.join(' / ')})`);
    return;
  }
  if (validate && !validate(value)) {
    throw new Error(`${label} has an invalid value. Check ${envNames.join(' / ')}.`);
  }
  if (!regex.test(config)) {
    throw new Error(`Could not find ${label} in wrangler.toml.`);
  }
  config = config.replace(regex, (match) => match.replace(/"[^"]*"/, `"${escapeToml(value)}"`));
  applied.push(redact ? `${label}=<redacted>` : `${label}=<set>`);
}

replaceString({
  label: 'Worker name',
  envNames: ['MANJU_WORKER_NAME'],
  regex: /^name\s*=\s*"[^"]*"/m,
});

replaceString({
  label: 'D1 database_id',
  envNames: ['MANJU_D1_DATABASE_ID', 'CF_D1_DATABASE_ID', 'D1_DATABASE_ID'],
  regex: /database_id\s*=\s*"[^"]*"/,
  validate: (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  required: requirePrivateConfig && config.includes('REPLACE_WITH_D1_ID'),
});

replaceString({
  label: 'KV namespace id',
  envNames: ['MANJU_KV_NAMESPACE_ID', 'CF_KV_NAMESPACE_ID', 'KV_NAMESPACE_ID'],
  regex: /^\s*id\s*=\s*"[^"]*"/m,
  validate: (value) => /^[0-9a-f]{32}$/i.test(value),
  required: requirePrivateConfig && config.includes('REPLACE_WITH_KV_ID'),
});

replaceString({
  label: 'R2 bucket name',
  envNames: ['MANJU_R2_BUCKET_NAME'],
  regex: /bucket_name\s*=\s*"[^"]*"/,
});

replaceString({
  label: 'Queue name',
  envNames: ['MANJU_TASK_QUEUE_NAME'],
  regex: /queue\s*=\s*"[^"]*"/g,
});

replaceString({
  label: 'Seed key',
  envNames: ['MANJU_SEED_KEY'],
  regex: /SEED_KEY\s*=\s*"[^"]*"/,
  required: false,
  redact: true,
});

if (missing.length) {
  throw new Error(`Missing Cloudflare build variables: ${missing.join(', ')}`);
}

mkdirSync(deployDir, { recursive: true });
writeFileSync(generatedConfigPath, config);
writeFileSync(deployRedirectPath, JSON.stringify({ configPath: '../../wrangler.generated.toml' }, null, 2));

if (applied.length) {
  console.log(`Prepared Cloudflare build config with ${applied.join(', ')}.`);
} else {
  console.log('Prepared Cloudflare build config from wrangler.toml without private overrides.');
}
