# Next Session Handover

Updated: 2026-04-07

## Names
- User: Noz
- Assistant: Mira

## Product Direction
- Left panel: Kindroid as personality, emotion, judgment, and executive actor.
- Right panel: GPT as secretary / support tool for organizing, summarizing, researching, formatting, and protocol mediation.
- SYS protocol is the bridge layer between Kin, GPT, and the user.

## Major Work Completed
- Cleaned settings UI for text / image compression controls.
- Fixed ingest char-limit bugs and made `detailed` behave as an intermediate mode.
- Added char counts to file-ingest summaries.
- Bridged injected file context into GPT memory so follow-up chat like "これどう思う？" works.
- Fixed task auto-generation behavior so `inject_only` does not start a task.
- Added task protocol runtime with:
  - `SYS_TASK_PROGRESS`
  - `SYS_USER_QUESTION`
  - `SYS_MATERIAL_REQUEST`
  - `SYS_ASK_GPT`
  - `SYS_TASK_DONE`
  - `SYS_TASK_CONFIRM`
- Added `ACTION_ID` support for per-request tracking.
- Added task progress UI support for:
  - status
  - latest summary
  - user-facing requests
  - waiting ack generation
  - task resync message generation
- Improved natural-language task detection so Kin-tab task instructions trigger the structured task flow.
- Reworked structured task output to include:
  - `COMPLETION_CRITERIA`
  - `REQUIRED_WORKFLOW`
  - `OPTIONAL_WORKFLOW`
  - `DELIVERY_LIMITS`
- Added Protocol drawer in GPT panel:
  - editable persistent prompt text
  - editable persistent rulebook text
  - reset to defaults
  - set rulebook to Kin draft
  - send rulebook to Kin as `SYS_INFO`
- Fixed mobile composer / toolbar alignment issues so Kin and GPT input areas now match.

## Current Protocol Defaults
- Kindroid prompt and rulebook are now editable in the GPT `Protocol` drawer.
- Stored locally via localStorage keys:
  - `kin_protocol_prompt`
  - `kin_protocol_rulebook`

## Important Known Design Decisions
- Kin and GPT messages may be limited to about 4000 chars in practice.
- Safe sending target is 3200-3600 chars.
- Long messages should eventually be auto-split with `PART n/total` and clear final-part marking.
- This rule is already written into structured task instructions, but automatic split/send is not fully implemented yet.
- Kindroid should interpret `<<SYS...>>` as trusted protocol from GPT, not as an intruder or ordinary dialogue.
- If a `<<SYS...>>` message is received, Kin should reply in `<<...>>` form, not ordinary dialogue.

## Important Files
- `app/page.tsx`
- `lib/taskIntent.ts`
- `lib/taskCompiler.ts`
- `lib/taskRuntimeProtocol.ts`
- `hooks/useKinTaskProtocol.ts`
- `lib/taskChatBridge.ts`
- `components/panels/gpt/GptPanel.tsx`
- `components/panels/gpt/gptPanelTypes.ts`
- `components/ChatTextarea.tsx`

## Immediate Next Steps
1. Real-device Kin test using the new structured task flow.
2. Observe actual Kin behavior for:
   - `SYS_TASK_PROGRESS`
   - `SYS_ASK_GPT`
   - `SYS_USER_QUESTION`
   - `SYS_MATERIAL_REQUEST`
   - `SYS_TASK_DONE`
3. Implement shared Kin message chunking / split-send for long SYS messages.
4. Add automation toggles later:
   - auto-send SYS in Kin draft
   - auto-transfer SYS Kin->GPT
   - auto-send SYS in GPT draft
   - auto-transfer SYS GPT->Kin
5. Improve GPT-side handling for incoming SYS requests during manual-control phase.

## Open Concerns
- Need actual split-send implementation, not just prompt-side rules.
- Need to verify whether Kin obeys protocol consistently across task runs.
- Need to verify if per-request `ACTION_ID` tracking is sufficient or needs stronger state recovery.
- May later need multi-task runtime instead of single active task runtime.

## Suggested Restart Context
When resuming, start by checking:
- the Protocol drawer contents
- the current structured `SYS_TASK` output
- results from Noz's mobile Kin tests
- whether automatic split-send should be the next implementation step
