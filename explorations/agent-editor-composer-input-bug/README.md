# Minimal repro: agent editor test-chat composer rejects typed input

Reproduces a bug where the test-chat composer on the agent **editor** page
(`/agents/:agentId/editor`) is focusable but silently rejects all typed
input, while the identical composer on the regular chat page
(`/agents/:agentId/chat/new`) works fine.

This is a bare `mastra dev` project: one code-defined agent, LibSQL storage,
and the editor enabled with the builder feature on — nothing else.

## Setup

```bash
cp .env.example .env   # dummy key is fine, no model call is needed for this repro
pnpm install            # or npm/yarn/bun install
pnpm dev                # or npm/yarn/bun run dev
```

Wait for the `Studio: http://localhost:4111` line.

## Steps to reproduce

1. Open `http://localhost:4111/agents/simple-agent/editor`.
2. Click into the composer textarea at the bottom ("Enter your message...")
   and type anything.
3. Nothing appears — the field stays empty.
4. For contrast, open `http://localhost:4111/agents/simple-agent/chat/new`
   and type the same thing — it works normally.

## Expected behavior

Typing in the editor's test-chat composer should work the same as it does
on the regular chat page.

## Observed behavior

- The textarea is focusable (cursor blinks), `disabled`/`readOnly` are both
  `false`, and there are no console errors at load, focus, or while typing.
- Programmatically setting the textarea's value and dispatching an `input`
  event shows the value reverting to `""` shortly after:

  ```js
  const t = document.querySelector('textarea');
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  set.call(t, 'hello');
  t.dispatchEvent(new Event('input', { bubbles: true }));
  // -> t.value is "" shortly after
  ```

## Versions tested

`@mastra/core@1.50.0`, `@mastra/editor@0.13.5`, `mastra@1.18.1` — and
reconfirmed against the latest published versions at the time this repro
was written. The `package.json` here pins `latest` so re-running it will
always test against whatever is current.
