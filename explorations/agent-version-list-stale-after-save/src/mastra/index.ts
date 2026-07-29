import { Mastra } from '@mastra/core/mastra';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';

import { versionListBugAgent } from './agents/version-list-bug-agent';

const storage = new LibSQLStore({
  id: 'agent-version-list-stale-after-save-repro',
  url: 'file:mastra.db',
});

export const mastra = new Mastra({
  agents: { versionListBugAgent },
  storage,
  editor: new MastraEditor({}),
});
