import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import { API_BASE_URL } from '../../../api/config';

// Converts a Blob into a base64 data URI string.
const blobToDataUri = (blob: Blob): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });

// Downloads a logo and returns it as a data URI for @react-pdf/renderer.
// Tries direct fetch first; if blocked by browser cache or CORS, automatically falls back
// to the backend API image proxy endpoint so PDF generation never fails.
export const fetchLogoDataUri = async (url?: string | null): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  // 1. Direct fetch from S3 (with CORS)
  try {
    // "reload" skips the browser cache: an image cached earlier by a plain <img> has no CORS headers and would make this fail.
    const res = await fetch(url, { mode: 'cors', cache: 'reload' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUri = await blobToDataUri(blob);
      if (dataUri) return dataUri;
    }
  } catch {
    // Direct fetch failed (e.g. disk-cache without CORS headers) - fall through to proxy
  }

  // 2. Fallback: Fetch via Backend Image Proxy (same-origin / whitelisted CORS)
  try {
    const proxyEndpoint = `${API_BASE_URL}/uploads/image-proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyEndpoint);
    if (res.ok) {
      const blob = await res.blob();
      return await blobToDataUri(blob);
    }
  } catch (proxyErr) {
    console.warn('Logo could not be loaded for PDF via proxy:', proxyErr);
  }

  return null;
};

// Renders a PDF with the logo URL / data URI passed to the document.
// 1. First converts the logo URL to a data URI (direct or via backend proxy).
// 2. Tries to render the PDF with the logo.
// 3. If rendering fails (e.g. invalid image / blocked URL), it renders again without the logo
//    so invoice / quotation printing NEVER fails.
export const renderPdfBlob = async (
  logoUrl: string | null | undefined,
  renderDocument: (logo: string | null) => ReactElement,
): Promise<Blob> => {
  const safeLogo = await fetchLogoDataUri(logoUrl);

  try {
    return await pdf(renderDocument(safeLogo)).toBlob();
  } catch (err) {
    console.warn('PDF rendering with logo failed, retrying without logo:', err);
    return await pdf(renderDocument(null)).toBlob();
  }
};
