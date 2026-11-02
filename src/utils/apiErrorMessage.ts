const joinMessages = (list: any, format: (item: any) => string): string | null =>
  Array.isArray(list) ? list.map(format).join(', ') : null;

/**
 * Best human-readable message from an API / axios error.
 * Order: response.message, response.error.message, response.errors[], response.fields[], error.message, fallback.
 */
export const getApiErrorMessage = (err: any, fallback = 'Something went wrong.'): string => {
  const data = err?.response?.data;
  return (
    data?.message ||
    data?.error?.message ||
    joinMessages(data?.errors, (e) => e.message || e) ||
    joinMessages(data?.fields, (f) => `${f.path?.join('.') ? `${f.path.join('.')}: ` : ''}${f.message}`) ||
    err?.message ||
    fallback
  );
};
