import {readFileSync} from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = String(input.tool_input?.command ?? '').replaceAll('\\', '/');

const PROTECTED = /(^|[\s"'=])(\.\/)?(docs\/|\.claude\/(rules|agents|hooks)\/|\.claude\/settings)/;
const WRITES = /(^|[^0-9&])>>?\s*\S|\btee\b|\bsed\s+-i|\b(mv|cp|rm|del|move|copy)\b|Set-Content|Add-Content|Out-File|Remove-Item/i;

if (PROTECTED.test(cmd) && WRITES.test(cmd)) {
    console.error('Blocked: shell writes to docs/, .claude/rules, agents, hooks or settings are the human\'s files.');
    process.exit(2);
}
