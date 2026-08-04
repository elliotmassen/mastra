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

## Fix

`packages/core/src/memory/types.ts` adds a new `generateTitle.awaitGeneration`
option (default `false`, fully backward compatible). When `true`,
`Agent#executeOnFinish` awaits the title-generation-and-persistence chain
before `generate()`/`stream()` resolves:

```ts
const memory = new Memory({
  storage,
  options: {
    generateTitle: {
      model: titleModel,
      awaitGeneration: true, // wait for title gen to finish before resolving
    },
  },
});
```

Use this on serverless runtimes where the execution environment can freeze
right after the response is sent. `run.mjs` and `repro.mjs` in this directory
both accept it (see below) and confirm the fix survives the exact freeze that
loses the title by default.

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
[freeze, awaitGeneration=true] agent.generate() resolved. Response: "Here is my answer to your question."

--- Result ---
freeze (default) title:              ""
warm (default) title:                "Capital of France"
freeze + awaitGeneration:true title:  "Capital of France"

BUG REPRODUCED: title generation is lost when the process exits right after generate() resolves.
FIX VERIFIED: with generateTitle.awaitGeneration: true, the title survives the same freeze.
```

Exits `0` when both the bug reproduces under default settings and the fix
holds under `awaitGeneration: true`; `1` otherwise — useful for checking
whether a regression landed.

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

# with the fix enabled -- freezes, but passes awaitGeneration=true
rm -f fixed.db*  && node run.mjs freeze ./fixed.db true && node check.mjs ./fixed.db
```

## What each run does

- **`run.mjs freeze <db> [awaitGeneration]`**: builds an `Agent` with
  `generateTitle` enabled (mock title model has a 200ms delay,
  representative of a real LLM round trip), calls `await agent.generate(...)`,
  then calls `process.exit(0)` immediately — exactly what a frozen Lambda
  container does. Pass `true` as the third argument to set
  `generateTitle.awaitGeneration: true`.
- **`run.mjs warm <db> [awaitGeneration]`**: identical setup, but waits
  500ms after `generate()` resolves before exiting, giving a detached title
  promise a chance to finish and persist.
- **`check.mjs`**: reads the persisted thread back out of the (file-backed)
  LibSQL store and prints its title.

All three runs get the same agent response text; only the persisted title
differs, which isolates the behavior to the detached promise (and the fix
for it) rather than the mock model or storage setup.
