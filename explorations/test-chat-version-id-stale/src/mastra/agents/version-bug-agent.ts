import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const versionBugAgent = new Agent({
  id: 'version-bug-agent',
  name: 'Version Bug Agent',
  instructions: 'You are a helpful assistant. This is the original code-defined instructions, before any draft is saved.',
  model: openai('gpt-4o-mini'),
});
