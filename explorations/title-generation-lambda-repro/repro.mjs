// Single entry point: runs both the "freeze" and "warm" scenarios back to
// back and prints a clear pass/fail summary, instead of requiring four
// separate manual commands.

import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { LibSQLStore } from '@mastra/libsql';

function cleanDb(dbFile) {
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    rmSync(`${dbFile}${suffix}`, { force: true });
  }
}

async function readTitle(dbFile) {
  const storage = new LibSQLStore({ id: `repro-storage-${dbFile}`, url: `file:${dbFile}` });
  const thread = await storage.stores.memory.getThreadById({ threadId: 'repro-thread' });
  return thread?.title ?? null;
}

function runScenario(mode, dbFile) {
  cleanDb(dbFile);
  const output = execFileSync('node', ['run.mjs', mode, dbFile], { encoding: 'utf8' });
  process.stdout.write(output);
}

runScenario('freeze', './freeze.db');
const freezeTitle = await readTitle('./freeze.db');

runScenario('warm', './warm.db');
const warmTitle = await readTitle('./warm.db');

console.log('\n--- Result ---');
console.log(`freeze run title: ${JSON.stringify(freezeTitle)}`);
console.log(`warm run title:   ${JSON.stringify(warmTitle)}`);

const reproduced = freezeTitle === '' && warmTitle === 'Capital of France';

if (reproduced) {
  console.log('\nBUG REPRODUCED: title generation is lost when the process exits right after generate() resolves.');
} else {
  console.log('\nNOT REPRODUCED: freeze run persisted a title, or warm run did not -- behavior may have changed.');
}

cleanDb('./freeze.db');
cleanDb('./warm.db');

process.exit(reproduced ? 0 : 1);
