import { Mastra } from '@mastra/core/mastra';
import { MastraEditor } from '@mastra/editor';
import { LibSQLStore } from '@mastra/libsql';

import { simpleAgent } from './agents/simple-agent';

const storage = new LibSQLStore({
  id: 'agent-editor-composer-input-bug-repro',
  url: 'file:mastra.db',
});

export const mastra = new Mastra({
  agents: { simpleAgent },
  storage,
  editor: new MastraEditor({
    builder: {
      enabled: true,
    },
  }),
});
