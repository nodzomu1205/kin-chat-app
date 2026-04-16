# Next Session Handover

Updated: 2026-04-16

## Current State

The repository is in a good stopping state.

- `npx tsc --noEmit` passes
- `npm test` passes
- `npm run build` passes
- current test count: `67 files / 288 tests`

This wave substantially improved three areas:

- `app/page.tsx` is much thinner and now delegates through workspace-view builders
- `sendToGptFlow` is now a clearer coordinator with request/context/guard/finalize slices
- GPT settings and mobile live-surface UI text are now much cleaner, and the mobile panel switch no-op bug was fixed

## What Changed In This Wave

### 1. Page / controller composition is now much thinner

Done:

- `app/page.tsx` no longer directly assembles most controller/panel trees
- `useChatPageWorkspaceView.tsx` and `chatPageWorkspaceViewBuilders.ts` now own the page-facing controller/panel source wiring
- grouped controller args are now real boundaries rather than being immediately flattened again
- `useChatPageController.ts` now acts more like a composition hub than a broad reshaping file

Important:

- the page itself is no longer the main immediate danger
- the next UI-side structural hotspot is the broad source bundle entering `useChatPageWorkspaceView(...)` and its builders

### 2. `sendToGptFlow` was thinned into clearer slices

Done:

- request arg assembly lives behind `sendToGptFlowArgBuilders.ts`
- early gate handling lives behind `sendToGptFlowGuards.ts`
- request preparation lives behind `sendToGptFlowRequestPreparation.ts`
- request text and payload building live behind `sendToGptFlowRequestText.ts` and `sendToGptFlowRequestPayload.ts`
- request execution lives behind `sendToGptFlowRequest.ts`
- finalize side effects live behind `sendToGptFlowFinalize.ts`
- low-value `sendToGptFlowBundles.ts` staging was removed

Important:

- `sendToGptFlow.ts` is now readable, but `sendToGptFlowRequestPreparation.ts` and `sendToGptFlowState.ts` are still the next likely regrowth points
- future thinning should keep reducing broad prepared-request shaping rather than adding new bundle/staging helpers

### 3. GPT settings surface was largely stabilized

Done:

- rules and protocol blocks are now split out of `GptSettingsSections.tsx`
- shared settings primitives now cover:
  - select
  - number input
  - text input
  - textarea
  - readonly stat
  - badge
  - item card
  - section header row
  - action row
- `GptSettingsWorkspace.tsx` now uses those shared primitives broadly
- `GptSettingsProtocolSection.tsx` was restored to clean Japanese

Important:

- the settings surface is no longer the first structural hotspot it used to be
- remaining work here is more polish/information-architecture than emergency cleanup

### 4. Mobile live-surface cleanup landed

Done:

- `DrawerTabs.tsx` labels were restored to clean Japanese
- `GptToolbar.tsx` was rewritten cleanly
- `KinToolbar.tsx` was rewritten cleanly
- `KinPanel.tsx` live status text was restored
- the mobile panel switch no-op bug was fixed in `chatPageWorkspaceViewBuilders.ts`
- `GptSettingsWorkspace.tsx` now also has an internal `chat / task / library` view switch, which reduces dependence on the top header icons alone

Important:

- the exact bug was a self-looping mobile switch handler: the Kin panel switch was setting `activeTab` to `"kin"` instead of `"gpt"`
- other mobile tab setters were reviewed and no same-shape self-loop was found in the active runtime path

## Current Review Summary

No new high-confidence functional regression was found in the current repository state after the latest fixes.

The main remaining risks are structural:

1. broad source wiring around `useChatPageWorkspaceView(...)`
2. broad helper surfaces in `sendToGptFlowRequestPreparation.ts` and `sendToGptFlowState.ts`
3. ingest-side integration points that have not yet received the same cleanup depth
4. remaining non-settings UI surfaces that may still contain old copy/cleanup debt

## Working Rules For The Next Session

These are operational constraints, not optional notes.

1. Prefer structural fixes over hole-patching.
2. Do not treat “the main file is smaller” as the same thing as “authority is cleaner.”
3. Before claiming an old path is gone, verify it repo-wide with `rg`.
4. When a new adapter/builder hook is introduced, watch immediately for the same monolith regrowing one layer outward.
5. Do not add new staging/bundle helpers unless they truly own a behavior boundary.
6. Keep live mobile UI text and behavior under the same quality bar as the main desktop path.

In practical terms:

- do not reintroduce “thin wrapper” layers that only restate object shapes
- do not let `sendToGptFlowRequestPreparation.ts` become the new monolith
- do not let workspace-view builders turn into a second `app/page.tsx`
- do not assume mobile actions are safe just because desktop behavior works

## Mandatory Verification Discipline

Before saying a structural fix is complete:

1. identify all files that can write or reshape the relevant state
2. verify remaining routes repo-wide with `rg`
3. confirm which paths are active runtime vs compatibility only
4. run:
   - `npx tsc --noEmit`
   - `npm test`
   - `npm run build`
5. explicitly state what was verified and what was not

This is especially important for:

- mobile `activeTab` panel switching
- settings workspace view switching
- `sendToGptFlow` request-preparation shaping
- memory update context shaping
- task/protocol controller wiring

## Maintenance Work To Do Before The Next Feature Wave

### 1. Re-review workspace-view orchestration

Focus:

- `hooks/useChatPageWorkspaceView.tsx`
- `hooks/chatPageWorkspaceViewBuilders.ts`
- `hooks/useChatPagePanelsView.tsx`
- `app/page.tsx`

Goal:

- keep the page-side source bundle from regrowing into another hidden coordinator

### 2. Continue thinning GPT flow helpers

Focus:

- `lib/app/sendToGptFlowRequestPreparation.ts`
- `lib/app/sendToGptFlowState.ts`
- `lib/app/sendToGptFlow.ts`
- `lib/app/sendToGptFlowContext.ts`

Goal:

- keep the coordinator short without moving complexity into low-value bundle/staging layers

### 3. Review ingest integration next

Focus:

- `app/api/ingest/route.ts`
- `hooks/useIngestActions.ts`
- related ingest UI wiring

Goal:

- bring ingest-side integration quality closer to the current GPT-flow/page quality bar

### 4. Do a final live-surface copy sweep outside settings

Focus:

- `components/panels/gpt/GptMetaDrawer.tsx`
- `components/panels/kin/*`
- `components/panels/gpt/*Toolbar*`
- any remaining mobile-facing labels touched by future work

Goal:

- ensure the visible UI is consistently UTF-8-clean and understandable

## Recommended Next Review Files

Review these first before changing behavior:

1. `hooks/chatPageWorkspaceViewBuilders.ts`
2. `hooks/useChatPageWorkspaceView.tsx`
3. `lib/app/sendToGptFlowRequestPreparation.ts`
4. `lib/app/sendToGptFlowState.ts`
5. `lib/app/sendToGptFlow.ts`
6. `app/api/ingest/route.ts`
7. `hooks/useIngestActions.ts`
8. `components/panels/gpt/GptMetaDrawer.tsx`

## Suggested Next-Session Order

1. run a quick live regression pass for:
   - mobile panel switching
   - settings workspace switching
   - mobile GPT/Kin toolbar actions
2. review workspace-view source wiring and remove any low-value reshaping
3. continue `sendToGptFlow*` thinning where behavior ownership is still too broad
4. only then move into ingest-side cleanup or the next feature wave

## Verification Commands

```bash
npx tsc --noEmit
```

```bash
npm test
```

```bash
npm run build
```
