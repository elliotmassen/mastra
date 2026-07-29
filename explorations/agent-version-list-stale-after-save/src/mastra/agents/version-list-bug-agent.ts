import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const versionListBugAgent = new Agent({
  id: 'version-list-bug-agent',
  name: 'Version List Bug Agent',
  instructions: 'You are a simple helpful assistant.',
  model: openai('gpt-4o-mini'),
});
