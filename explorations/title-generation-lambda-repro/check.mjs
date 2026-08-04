import { LibSQLStore } from '@mastra/libsql';

const dbFile = process.argv[2];
const storage = new LibSQLStore({ id: 'repro-storage', url: `file:${dbFile}` });

const thread = await storage.stores.memory.getThreadById({ threadId: 'repro-thread' });
console.log('thread.title =', JSON.stringify(thread?.title));
