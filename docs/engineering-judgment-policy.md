# Engineering Judgment Policy

Updated: 2026-05-08

## Purpose

Use this policy when implementing features that require classification,
interpretation, routing, or other judgment-heavy logic.

## Judgment Rules

1. Do not patch complex judgment with brittle heuristics.

   Keyword checks, one-off fallback branches, and narrow rules are allowed only
   for simple validation or normalization. They must not become the authority for
   semantic classification when an LLM is already available or the decision is
   context-dependent.

2. Use LLMs with explicit staged logic.

   Passing a vague instruction to an LLM is still a bug risk. The prompt should
   define the decision purpose, the minimum required fields, the order of
   judgment, and what must not be inferred. Ask for reasoning fields only where
   they help downstream verification.

3. Prefer necessary and sufficient categories.

   Do not create fine-grained enums because they look professional. Every field
   must have a downstream consumer or a clear future use. If the product only
   needs `yes / no / unknown`, start there.

4. Store evidence for later decisions, not premature final decisions.

   Ingest-time metadata should preserve stable facts and useful planning
   material. Context-dependent decisions, such as whether an image should be the
   main visual on a specific slide, should be finalized only when the slide
   message and available layout are known.

5. Trace the full path before fixing a visible symptom.

   For classification bugs, inspect the prompt, raw model output, normalization,
   persistence, UI display, and downstream consumer before changing behavior.
   Do not add a fallback unless the primary route and its failure mode are
   understood.

6. Do not use the user as the first-line tester.

   Before asking the user to spend tokens, time, or attention on a live test,
   perform the maximum practical local verification first. For LLM-assisted
   workflows, this means checking prompts, schemas, examples, parsers,
   normalizers, persistence, renderer inputs, and rendered artifacts wherever
   those paths can be inspected without another user-run generation.
   A fix is not ready for user live testing just because the immediately
   edited function or visible symptom looks correct. Trace and verify the full
   workflow segment that the user will exercise.

7. State verification scope honestly.

   A feature is not "ready to test" merely because the touched function works.
   If any adjacent path remains unverified, name it as unverified and explain
   why. Do not imply end-to-end readiness until the end-to-end route has been
   traced or a representative local reproduction has passed.

8. Treat costly tests as scarce.

   Workflows that consume LLM tokens, image generation, external APIs, or user
   review cycles require extra diligence. Static inspection, focused unit tests,
   schema tests, parser round-trips, and artifact inspection should happen
   before requesting another live run from the user.

9. Gate high-cost product flows before user handoff.

   For multi-step flows such as PPT design, visual resolution, library image
   selection, and PPTX creation, do not hand work to the user after checking
   only the last changed line or one narrow helper. Before user live testing,
   run every practical local check that covers the whole path: design
   generation/formatting, command links, draft insertion, save/reload,
   selection and deselection, chat display, renderer input, artifact creation,
   UTF-8 validation, full app tests where feasible, and package-specific tests
   such as the presentation renderer suite. If an actual browser/API/manual
   step remains impossible to automate locally, explicitly say that this is the
   remaining verification boundary.

10. Keep simple product invariants in code, not in broad prompt pressure.

   If the intended behavior is simple, encode the invariant at the owning
   boundary instead of expanding global LLM constraints. For example:
   `adaptiveVisualMain` means primary visual plus a small body-text area;
   `adaptiveTextMain` means primary text plus supporting visuals; `/ppt
   Document ID + comment` means update the existing saved plan locally, not
   regenerate or reinterpret the whole deck. Do not solve these by adding broad
   prompt rules that also affect update flows.

11. Never persist incomplete LLM output over a complete saved artifact.

   Any update flow that starts from a saved structured document must validate
   that the incoming result still has the required canonical structure before
   writing it back. If a PPT update result lacks usable `slideFrames`, preserve
   the existing saved design and report that the update could not be applied.
   The same principle applies to task documents, memory records, and library
   artifacts: an incomplete parse is not an overwrite source.

12. Preserve unit-of-selection boundaries.

   When a workflow exposes slots, blocks, images, or document IDs as user
   addresses, the persistence model must preserve that same address granularity.
   Selecting one visual slot must not imply selection of sibling slots.
   Updating a visual label must update the persisted slot/match label used by
   downstream rendering, not only the visible design text.

13. Avoid fallback regrowth after a regression.

   A fallback is not a repair unless the primary route and the failure condition
   are proven. Repeated regressions in the PPT workflow came from adding
   compensating branches and broad prompts instead of restoring the intended
   boundary. Before adding any fallback, write down which invariant it protects,
   why the primary path cannot provide it, and which regression test proves the
   fallback does not become a second standard.
