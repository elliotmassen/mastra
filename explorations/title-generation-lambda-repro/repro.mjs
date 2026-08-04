// Single entry point: runs the "freeze", "warm", and "freeze + fix" scenarios
// back to back and prints a clear pass/fail summary, instead of requiring
// several separate manual commands.

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

function runScenario(mode, dbFile, awaitGeneration = false) {
  cleanDb(dbFile);
  const args = ['run.mjs', mode, dbFile];
  if (awaitGeneration) args.push('true');
  const output = execFileSync('node', args, { encoding: 'utf8' });
  process.stdout.write(output);
}

runScenario('freeze', './freeze.db');
const freezeTitle = await readTitle('./freeze.db');

runScenario('warm', './warm.db');
const warmTitle = await readTitle('./warm.db');

runScenario('freeze', './fixed.db', true);
const fixedTitle = await readTitle('./fixed.db');

console.log('\n--- Result ---');
console.log(`freeze (default) title:              ${JSON.stringify(freezeTitle)}`);
console.log(`warm (default) title:                ${JSON.stringify(warmTitle)}`);
console.log(`freeze + awaitGeneration:true title:  ${JSON.stringify(fixedTitle)}`);

const bugReproduced = freezeTitle === '' && warmTitle === 'Capital of France';
const fixVerified = fixedTitle === 'Capital of France';

if (bugReproduced) {
  console.log('\nBUG REPRODUCED: title generation is lost when the process exits right after generate() resolves.');
} else {
  console.log('\nBUG NOT REPRODUCED: freeze run persisted a title, or warm run did not -- behavior may have changed.');
}

if (fixVerified) {
  console.log('FIX VERIFIED: with generateTitle.awaitGeneration: true, the title survives the same freeze.');
} else {
  console.log('FIX NOT VERIFIED: title was still lost even with awaitGeneration: true.');
}

cleanDb('./freeze.db');
cleanDb('./warm.db');
cleanDb('./fixed.db');

process.exit(bugReproduced && fixVerified ? 0 : 1);
