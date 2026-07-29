# Minimal repro: agent version dropdown/badge doesn't update after saving a draft

Reproduces a bug where saving a new draft version of an agent in Mastra Studio's editor does not refresh the version selector/header. The UI keeps showing "No versions yet" (or the previous version) until the page is manually reloaded, even though the save succeeded.

This is a bare `mastra dev` project: one code-defined agent, LibSQL storage, and the editor enabled. Nothing else. No model calls are needed to reproduce this, `.env.example`'s dummy key is fine.

## Setup

```bash
cp .env.example .env
pnpm install            # or npm/yarn/bun install
pnpm dev                # or npm/yarn/bun run dev
```

Wait for the `Studio: http://localhost:4111` line.

## Steps to reproduce

1. Open `http://localhost:4111/agents/version-list-bug-agent/editor`. The header reads "No versions yet".
2. Click the System Prompt tab, type anything, click "Save New Version". A "Draft saved" toast appears.
3. The header still reads "No versions yet", and the Publish button stays disabled, as if nothing was saved.
4. Reload the page. The header now correctly reads "v1" and Publish is enabled.
5. Repeat: edit again, Save New Version. The header stays on "v1" instead of advancing to "v2" until you reload again.

## Expected behavior

The version header/badge and dropdown should reflect a newly saved draft immediately, the same way the Publish flow already does elsewhere in the same UI.

## Verifying without reloading the page

The save did succeed server-side even though the UI hasn't caught up. Confirm with:

```bash
curl -s "http://localhost:4111/api/stored/agents/version-list-bug-agent/versions?requestContext=e30=" | python3 -m json.tool
```

This returns the newly created version right after step 2, before any page reload. The gap is purely a stale client-side query cache, not a server-side lag.

## Versions tested

`mastra@1.20.3`, `@mastra/core@1.54.0`, `@mastra/editor@0.13.9`, the published `latest` tags at the time this repro was written. Also reconfirmed directly against the `mastra-ai/mastra` monorepo source at commit `bcfbbfdbe1`.
