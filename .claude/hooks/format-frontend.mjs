import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = String(input.tool_input?.file_path ?? '');
const norm = file.replaceAll('\\', '/');

if (!/\/frontend\/(src|e2e)\/.+\.(ts|tsx|css)$/.test(norm)) process.exit(0);
if (norm.includes('/src/api/generated/')) process.exit(0);

const frontend = path.join(process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), 'frontend');
if (!existsSync(path.join(frontend, 'node_modules', '.bin'))) process.exit(0);

try {
    execFileSync('npx', ['prettier', '--write', file],
        { cwd: frontend, stdio: 'ignore', shell: process.platform === 'win32' });
} catch { /* the gate (format:check) reports it */ }
