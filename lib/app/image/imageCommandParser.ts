export type ParsedImageCommand =
  | {
      isImageCommand: false;
      body: string;
    }
  | {
      isImageCommand: true;
      intent: "createImage";
      body: string;
    }
  | {
      isImageCommand: true;
      intent: "reviseImage";
      imageId: string;
      body: string;
      applyTo?: string;
    };

const CREATE_IMAGE_PATTERN = /^\s*Create Image\s*:\s*([\s\S]+)$/iu;
const IMAGE_ID_PATTERN = /^\s*Image ID\s*:\s*(img_[A-Za-z0-9_-]+)\s*$/imu;
const APPLY_TO_PATTERN = /^\s*Apply to\s*:\s*(.+)$/imu;

export function parseImageCommand(text: string): ParsedImageCommand {
  const createMatch = text.match(CREATE_IMAGE_PATTERN);
  if (createMatch) {
    return {
      isImageCommand: true,
      intent: "createImage",
      body: createMatch[1].trim(),
    };
  }

  const imageIdMatch = text.match(IMAGE_ID_PATTERN);
  if (imageIdMatch) {
    const imageId = imageIdMatch[1].trim();
    const applyTo = text.match(APPLY_TO_PATTERN)?.[1]?.trim();
    const body = text
      .replace(IMAGE_ID_PATTERN, "")
      .replace(APPLY_TO_PATTERN, "")
      .trim();
    return {
      isImageCommand: true,
      intent: "reviseImage",
      imageId,
      body,
      applyTo,
    };
  }

  return {
    isImageCommand: false,
    body: text.trim(),
  };
}
