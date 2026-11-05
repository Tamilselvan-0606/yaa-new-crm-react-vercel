const joinMessages = (list: any, format: (item: any) => string): string | null =>
  Array.isArray(list) ? list.map(format).join(', ') : null;

/**
 * Best human-readable message from an API / axios error.
 * Order: response.message, response.error.message, response.errors[], response.fields[], error.message, fallback.
 */
/** The field-level reasons of a validation error: { error: { message: 'Invalid request', fields: [{ path, message }] } }. */
const fieldDetails = (data: any): string | null => {
  const fields = data?.error?.fields ?? data?.fields;
  const text = joinMessages(fields, (f) => `${f.path?.join?.('.') ? `${f.path.join('.')}: ` : ''}${f.message}`);
  return text || null;
};

export const getApiErrorMessage = (err: any, fallback = 'Something went wrong.'): string => {
  const data = err?.response?.data;
  return (
    // A validation error says "Invalid request" and lists the real reasons in `fields`: show those.
    fieldDetails(data) ||
    data?.message ||
    data?.error?.message ||
    joinMessages(data?.errors, (e) => e.message || e) ||
    joinMessages(data?.fields, (f) => `${f.path?.join('.') ? `${f.path.join('.')}: ` : ''}${f.message}`) ||
    err?.message ||
    fallback
  );
};
