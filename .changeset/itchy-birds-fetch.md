---
'@mastra/core': minor
---

Added an `awaitGeneration` option to `generateTitle` so agents on serverless runtimes can wait for the thread title to finish generating and saving before the response returns.

**Why**: Thread titles are normally generated in the background after `generate()`/`stream()` returns. On serverless runtimes that freeze the execution environment right after the response is sent (for example AWS Lambda or Vercel Functions), that background work never gets a chance to finish, so the title can be silently lost. Setting `awaitGeneration: true` makes the agent wait for the title to be generated and persisted before the response resolves.

```typescript
const memory = new Memory({
  storage,
  options: {
    generateTitle: {
      model: openai('gpt-4o-mini'),
      awaitGeneration: true, // wait for the title before generate()/stream() resolves
    },
  },
});
```

This is opt-in; the default behavior (title generation runs in the background) is unchanged.
