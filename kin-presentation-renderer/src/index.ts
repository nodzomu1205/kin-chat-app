export {
  parsePresentationSpec,
  presentationSpecSchema,
  slideSchema,
  type PresentationSpec,
  type SlideSpec
} from "./schema.js";
export { renderPresentation, renderPresentationToFile } from "./renderer.js";
export {
  renderPresentationRequest,
  type RenderRequest,
  type RenderResult
} from "./renderRequest.js";
export {
  applyPresentationPatch,
  parsePresentationPatch,
  presentationPatchSchema,
  type PresentationPatch,
  type PresentationPatchOperation
} from "./patch.js";
