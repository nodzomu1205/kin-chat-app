# Kin Presentation Renderer

Standalone renderer for converting `PresentationSpec v0.1` JSON into PowerPoint
`.pptx` files.

The first milestone is a local CLI:

```powershell
npm install
npm run build
npm run render:dist -- examples/minimal.json output/minimal.pptx
```

During development, `npm run render -- <input> <output>` can run the TypeScript
source directly. If the local shell blocks `tsx`/esbuild subprocesses, use
`npm run build` followed by `npm run render:dist -- <input> <output>`.

## Slide Revision Flow

Slide-level edits should update the source JSON and then regenerate the `.pptx`.
This keeps revisions reproducible and avoids editing PowerPoint files directly.

```powershell
npm run build
npm run patch:dist -- ../docs/presentation-renderer/examples/business-proposal.json examples/patch-business-proposal.json output/business-proposal.patched.json
npm run render:dist -- output/business-proposal.patched.json output/business-proposal.patched.pptx
```

Patch operations use human-facing 1-based slide numbers:

```json
{
  "version": "0.1",
  "operations": [
    {
      "op": "updateSlide",
      "slideNumber": 2,
      "patch": {
        "title": "目指す体験を一言で言うと"
      }
    }
  ]
}
```

Supported patch operations:

- `updateDeck`
- `updateSlide`
- `replaceSlide`
- `insertSlide`
- `deleteSlide`
- `moveSlide`

## Scope

The v0.1 renderer supports:

- `title`
- `section`
- `bullets`
- `twoColumn`
- `table`
- `closing`

The JSON contract is documented in:

`../docs/presentation-renderer/presentation-spec-v0.1.md`

## Used From Kin Chat App

The renderer is intentionally kept as a standalone package, but the main Kin
Chat App invokes the compiled CLI from `/api/presentation-render`.

For deployment, the root app build compiles this package before `next build`:

```powershell
npm run build --prefix kin-presentation-renderer
```

Keep the source-of-truth exchange between the app and this renderer as JSON
input plus generated PPTX file paths. Do not couple the renderer to chat,
library, or GPT-specific app state.

## Project Shape

- `src/schema.ts`: Zod validation and TypeScript types
- `src/patch.ts`: JSON patch operations for slide-level revisions
- `src/renderer.ts`: PowerPoint generation
- `src/themes.ts`: theme definitions
- `src/cli.ts`: command line entry point
- `src/patch-cli.ts`: patch command line entry point
- `examples/`: sample `PresentationSpec` inputs
