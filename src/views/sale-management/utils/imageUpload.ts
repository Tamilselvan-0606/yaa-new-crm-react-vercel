/**
 * Shared image-upload validation constants and helper across Sale Management modules.
 * Ensures only valid image files can be uploaded and all other file types are rejected.
 */

export const IMAGE_ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
] as const;

export const IMAGE_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
] as const;

export const IMAGE_FILE_ACCEPT = [
  ...IMAGE_ALLOWED_MIME_TYPES,
  ...IMAGE_ALLOWED_EXTENSIONS,
].join(',');

export const PRODUCT_ITEM_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const;

export const PRODUCT_ITEM_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

export const PRODUCT_ITEM_IMAGE_ACCEPT = [
  ...PRODUCT_ITEM_IMAGE_MIME_TYPES,
  ...PRODUCT_ITEM_IMAGE_EXTENSIONS,
].join(',');

export interface ValidateImageFileOptions {
  allowedMimeTypes?: readonly string[];
  allowedExtensions?: readonly string[];
  maxSizeBytes?: number;
  invalidTypeMessage?: string;
  tooLargeMessage?: string;
}

export type ImageValidationResult =
  | { valid: true; error?: undefined }
  | { valid: false; error: string };

const DEFAULT_INVALID_TYPE_MESSAGE =
  'Only image files (.png, .jpg, .jpeg, .webp, .gif, .bmp, .svg, .avif) are allowed.';

function getFileExtension(fileName: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const dotIdx = trimmed.lastIndexOf('.');
  return dotIdx >= 0 ? trimmed.slice(dotIdx) : '';
}

/**
 * Validates that a chosen file is strictly an allowed image file.
 * Rejects non-image MIME types, disallowed extensions, and mismatched MIME/extension pairs.
 */
export function validateImageFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
  options: ValidateImageFileOptions = {},
): ImageValidationResult {
  const allowedMimeTypes = options.allowedMimeTypes ?? IMAGE_ALLOWED_MIME_TYPES;
  const allowedExtensions = options.allowedExtensions ?? IMAGE_ALLOWED_EXTENSIONS;
  const invalidTypeMessage = options.invalidTypeMessage ?? DEFAULT_INVALID_TYPE_MESSAGE;

  const mime = (file.type || '').trim().toLowerCase();
  const ext = getFileExtension(file.name || '');
  const hasAllowedExtension = Boolean(ext && allowedExtensions.includes(ext));

  if (mime) {
    // Reject any non-image MIME or mismatched non-image filename extension.
    if (!allowedMimeTypes.includes(mime) || (ext && !hasAllowedExtension)) {
      return { valid: false, error: invalidTypeMessage };
    }
  } else if (!hasAllowedExtension) {
    return { valid: false, error: invalidTypeMessage };
  }

  if (typeof options.maxSizeBytes === 'number' && file.size > options.maxSizeBytes) {
    const mb = Math.max(1, Math.round(options.maxSizeBytes / (1024 * 1024)));
    return {
      valid: false,
      error: options.tooLargeMessage ?? `Image size must be less than ${mb} MB.`,
    };
  }

  return { valid: true };
}
