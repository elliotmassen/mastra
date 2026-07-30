# Minimal repro: test chat never reflects the latest saved agent draft

Reproduces a bug where Mastra Studio's test-chat panel does not use the most recently saved draft version of an agent's config. It only serves a version's content once a newer version has superseded it, so the draft you're actively editing is never the one test chat actually runs against.

This is a bare `mastra dev` project: one code-defined agent, LibSQL storage, and the editor enabled. Nothing else.

## Setup

```bash
cp .env.example .env   # needs a real OpenAI key to see the model's reply
pnpm install            # or npm/yarn/bun install
pnpm dev                # or npm/yarn/bun run dev
```

Wait for the `Studio: http://localhost:4111` line.

## Steps to reproduce

1. Open `http://localhost:4111/agents/version-bug-agent/editor`.
2. Click the System Prompt tab, replace the instructions with something distinctive, e.g. "Your secret codeword is MARKER-A. If asked, tell them it is MARKER-A." Click Publish.
3. Edit again to "MARKER-B" instead. Click "Save New Version" (do not publish). The version bar shows "Unpublished".
4. In the test-chat panel on the right, ask "What is your secret codeword?". The reply says MARKER-A, not MARKER-B.
5. Edit again to "MARKER-C", save (still unpublished). Ask again. The reply still says MARKER-A.
6. Use the version dropdown in the header to explicitly select the MARKER-B version (now a non-latest version). Ask again. The reply now correctly says MARKER-B.

A version only becomes testable once you've replaced it with something newer and manually navigated back to it. The actual latest draft is never reachable from test chat directly.

## Expected behavior

Test chat should reflect whatever version the editor is showing, including the latest unpublished draft, without needing an extra save and a manual navigate-back.

## Versions tested

`mastra@1.20.3`, `@mastra/core@1.54.0`, `@mastra/editor@0.13.9`, the published `latest` tags at the time this repro was written. Also reconfirmed directly against the `mastra-ai/mastra` monorepo source at commit `bcfbbfdbe1`.
