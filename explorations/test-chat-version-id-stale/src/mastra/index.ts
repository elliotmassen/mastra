import { Mastra } from '@mastra/core/mastra';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';

import { versionBugAgent } from './agents/version-bug-agent';

const storage = new LibSQLStore({
  id: 'test-chat-version-id-stale-repro',
  url: 'file:mastra.db',
});

export const mastra = new Mastra({
  agents: { versionBugAgent },
  storage,
  editor: new MastraEditor({}),
});
