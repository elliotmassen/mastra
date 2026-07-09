import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

export const simpleAgent = new Agent({
  id: 'simple-agent',
  name: 'Simple Agent',
  instructions: 'You are a simple helpful assistant.',
  model: openai('gpt-4o-mini'),
});
