import { baseClient } from '../baseApi';

/**
 * AI product image recognition: POST /ai/products/analyze-image (see AI_PRODUCT_IMAGE_RECOGNITION.md).
 * The call only SUGGESTS values; nothing is stored. The product form applies the ones the user ticks.
 */

export interface ProductImageWarning {
  code: string;
  message: string;
  field?: string;
}

export interface ProductImageMatch {
  /** matched | ambiguous | suggested | unmatched | no_master_data */
  status?: string;
  [key: string]: unknown;
}

export interface ProductImageSuggestions {
  productName?: string | null;
  brand?: string | null;
  category?: string | null;
  subcategory?: string | null;
  productType?: string | null;
  model?: string | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  packaging?: string | null;
  netQuantity?: string | number | null;
  unit?: string | null;
  description?: string | null;
  sku?: string | null;
  barcode?: string | null;
  specifications?: unknown[];
  variantAttributes?: unknown[];
  confidence?: number;
  requiresReview?: boolean;
  uncertainFields?: string[];
  fieldEvidence?: Record<string, string>;
  matches?: { category?: ProductImageMatch; subcategory?: ProductImageMatch; unit?: ProductImageMatch; brand?: ProductImageMatch };
  /** IDs are present only when the record matched exactly one existing master record. */
  formSuggestions?: {
    name?: string | null;
    description?: string | null;
    sku?: string | null;
    categoryId?: string | null;
    subcategoryId?: string | null;
    baseUnitId?: string | null;
  };
  possibleDuplicates?: unknown[];
  warnings?: ProductImageWarning[];
  aiModel?: string;
}

export class ProductImageError extends Error {
  constructor(message: string, public code: string, public status: number) {
    super(message);
    this.name = 'ProductImageError';
  }
}

/** Friendly wording for the documented error codes. */
export function friendlyProductImageError(code: string | undefined, status: number, fallback: string): string {
  switch (code) {
    case 'IMAGE_REQUIRED': return 'Please choose a product image first.';
    case 'INVALID_IMAGE': return 'This image could not be read. Choose a different JPG, PNG or WebP image.';
    case 'FORBIDDEN': return 'You do not have permission to use AI on products.';
    case 'PRODUCT_NOT_FOUND': return 'This product could not be found.';
    case 'IMAGE_TOO_LARGE': return 'The image is too large. Choose a smaller image (up to 3 MB).';
    case 'UNSUPPORTED_IMAGE_TYPE': return 'Only JPG, PNG and WebP images can be analyzed.';
    case 'IMAGE_TOO_SMALL': return 'The image is too small to read. Choose a larger image.';
    case 'IMAGE_DIMENSIONS_TOO_LARGE': return 'The image dimensions are too large. Choose a smaller image.';
    case 'NO_PRODUCT_IDENTIFIED': return 'No product could be identified in this image. Try a clearer photo of the product or its label.';
    case 'MULTIPLE_PRODUCTS': return 'The image shows more than one product. Use a photo of a single product.';
    case 'AI_RATE_LIMITED':
    case 'VISION_RATE_LIMITED': return 'Too many image analyses. Please wait a minute and try again.';
    case 'IMAGE_ANALYSIS_FAILED': return 'The image could not be analyzed. Please try again or use a clearer image.';
    case 'VISION_UNAVAILABLE':
    case 'VISION_MODEL_UNSUPPORTED': return 'Image analysis is not available right now.';
    case 'VISION_TIMEOUT': return 'Image analysis took too long. Please try again.';
  }
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 502 || status === 503 || status === 504) return 'Image analysis is unavailable right now. Please try again in a moment.';
  return fallback;
}

export const productImageApi = {
  /** `image` is a data URI ("data:image/jpeg;base64,…"). `productId` is sent in Edit mode. */
  analyzeImage: async (image: string, productId?: string, signal?: AbortSignal): Promise<ProductImageSuggestions> => {
    const body: { image: string; product_id?: string } = { image };
    if (productId) body.product_id = productId;
    // Error bodies are read here (401 still goes through the shared interceptor so an expired token is refreshed).
    const res = await baseClient.post('/ai/products/analyze-image', body, { timeout: 60000, signal, validateStatus: (s) => s !== 401 });
    if (res.status >= 400) {
      const e = res.data?.error ?? {};
      throw new ProductImageError(friendlyProductImageError(e.code, res.status, e.message ?? 'The image could not be analyzed.'), e.code ?? 'AI_ERROR', res.status);
    }
    return (res.data?.data ?? res.data) as ProductImageSuggestions;
  },
};
