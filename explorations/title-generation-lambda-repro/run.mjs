// Simulates a single Lambda invocation: build the agent, send one message,
// await the response, then behave exactly like the runtime does when it
// freezes the execution environment right after the response is sent.
//
// mode=freeze  -> process.exit() immediately after the awaited call returns
//                 (no extra turn of the event loop is given to anything else)
// mode=warm    -> keep the process alive for a bit before exiting, simulating
//                 a container that either stays warm or the freeze happens
//                 later than expected
//
// Usage: node run.mjs <freeze|warm> <db-file> [awaitGeneration]
//
// awaitGeneration ("true"/"false", default "false") sets memory options
// generateTitle.awaitGeneration -- the new opt-in fix that makes
// agent.generate()/stream() wait for title generation (and persistence)
// to finish before resolving.

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

const mode = process.argv[2];
const dbFile = process.argv[3];
const awaitGeneration = process.argv[4] === 'true';

if (!mode || !dbFile) {
  console.error('Usage: node run.mjs <freeze|warm> <db-file> [awaitGeneration]');
  process.exit(1);
}

// Minimal LanguageModelV2 mock: the main agent model just echoes a fixed
// reply, the title model returns a fixed title after a short delay (long
// enough that it clearly hasn't resolved by the time agent.generate()
// returns to the caller -- exactly what makes this a race).
function makeMockModel(replyText, { delayMs = 0 } = {}) {
  return {
    specificationVersion: 'v2',
    provider: 'mock-provider',
    modelId: 'mock-model',
    supportedUrls: {},
    async doGenerate() {
      if (delayMs) await new Promise(resolve => setTimeout(resolve, delayMs));
      return {
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
        content: [{ type: 'text', text: replyText }],
        warnings: [],
      };
    },
    async doStream() {
      const text = replyText;
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'stream-start', warnings: [] });
            controller.enqueue({ type: 'text-start', id: 't1' });
            controller.enqueue({ type: 'text-delta', id: 't1', delta: text });
            controller.enqueue({ type: 'text-end', id: 't1' });
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: { inputTokens: 10, outputTokens: 10, totalTokens: 20 },
            });
            controller.close();
          },
        }),
      };
    },
  };
}

const storage = new LibSQLStore({ id: 'repro-storage', url: `file:${dbFile}` });

const memory = new Memory({
  storage,
  options: {
    generateTitle: {
      // 200ms delay: representative of a real title-generation LLM call,
      // which always needs at least one network round trip.
      model: makeMockModel('Capital of France', { delayMs: 200 }),
      awaitGeneration,
    },
  },
});

const agent = new Agent({
  name: 'repro-agent',
  instructions: 'You are a helpful assistant.',
  model: makeMockModel('Here is my answer to your question.'),
  memory,
});

const threadId = 'repro-thread';
const resourceId = 'repro-user';

const result = await agent.generate('What is the capital of France?', {
  memory: { thread: { id: threadId, title: '' }, resource: resourceId },
});

console.log(
  `[${mode}${awaitGeneration ? ', awaitGeneration=true' : ''}] agent.generate() resolved. Response: "${result.text}"`,
);

if (mode === 'freeze') {
  // Exactly what a frozen Lambda execution environment does: no more code
  // runs, no more timers fire, no more microtasks are drained, until (if
  // ever) another invocation reuses this same warm container.
  process.exit(0);
} else {
  // Warm / kept-alive container: give the detached title promise a real
  // chance to finish and persist before we go away.
  await new Promise(resolve => setTimeout(resolve, 500));
  process.exit(0);
}
