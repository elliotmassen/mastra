# Title generation is lost on frozen (serverless) execution environments

Demonstrates that `agent.generate()` / `agent.stream()` do not wait for
background thread-title generation to finish. On a long-lived server this
just means the title shows up a moment after the response returns. On a
serverless runtime that freezes the execution environment immediately after
the response is sent (AWS Lambda, Vercel Functions), that in-flight promise
never gets another turn of the event loop, so the title is silently lost —
no error, no retry, no signal to the caller.

## Root cause

`packages/core/src/agent/agent.ts`, inside `Agent#executeOnFinish`
(~line 7133), fires title generation as a **detached** promise:

```ts
void this.genTitle(userMessage, requestContext, observabilityContext, titleModel, titleInstructions, uiMessages)
  .then(async title => {
    if (title) {
      await memory.createThread({ threadId: thread.id, resourceId, memoryConfig, title, metadata: thread.metadata });
      if (typeof onTitleGenerated === 'function') {
        await onTitleGenerated(title);
      }
    }
  })
  .catch(error => {
    this.logger.error('Error persisting generated title:', error);
  });
```

`#executeOnFinish` never awaits this chain, so `agent.generate()` /
`agent.stream()` resolve before the title is generated or persisted.

Notably this is inconsistent with the other three places Mastra generates
titles — `agent-legacy.ts`, `loop/network/index.ts`, and
`agent/durable/preparation.ts` all **do** await title generation as part of
their finish step. Only the main (non-legacy, non-durable) agent path treats
it as fire-and-forget.

## Setup

From the repo root:

```bash
pnpm install
pnpm build:core
pnpm turbo build --filter ./stores/libsql
pnpm turbo build --filter ./packages/memory
```

Then, from this directory, run both scenarios and get a pass/fail summary in
one shot:

```bash
pnpm --filter @mastra/title-generation-lambda-repro run repro
# or just: node repro.mjs
```

```
[freeze] agent.generate() resolved. Response: "Here is my answer to your question."
[warm] agent.generate() resolved. Response: "Here is my answer to your question."

--- Result ---
freeze run title: ""
warm run title:   "Capital of France"

BUG REPRODUCED: title generation is lost when the process exits right after generate() resolves.
```

Exits `0` when the bug reproduces (freeze run has no title, warm run does),
`1` otherwise — useful for checking whether a fix landed.

### Running scenarios individually

```bash
pnpm --filter @mastra/title-generation-lambda-repro run freeze
pnpm --filter @mastra/title-generation-lambda-repro run check:freeze
# => thread.title = ""                     <-- title lost

pnpm --filter @mastra/title-generation-lambda-repro run warm
pnpm --filter @mastra/title-generation-lambda-repro run check:warm
# => thread.title = "Capital of France"    <-- title persisted correctly
```

Or directly with `node`, from this directory:

```bash
rm -f freeze.db* && node run.mjs freeze ./freeze.db && node check.mjs ./freeze.db
rm -f warm.db*   && node run.mjs warm   ./warm.db   && node check.mjs ./warm.db
```

## What each run does

- **`run.mjs freeze`**: builds an `Agent` with `generateTitle` enabled
  (mock title model has a 200ms delay, representative of a real LLM round
  trip), calls `await agent.generate(...)`, then calls `process.exit(0)`
  immediately — exactly what a frozen Lambda container does.
- **`run.mjs warm`**: identical setup, but waits 500ms after `generate()`
  resolves before exiting, giving the detached title promise a chance to
  finish and persist.
- **`check.mjs`**: reads the persisted thread back out of the (file-backed)
  LibSQL store and prints its title.

Both runs get the same agent response text; only the persisted title
differs, which isolates the bug to the detached promise rather than the
mock model or storage setup.
