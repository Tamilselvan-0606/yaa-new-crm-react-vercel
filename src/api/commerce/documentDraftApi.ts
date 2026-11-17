import { baseApi } from '../baseApi';
import type {
  CreateDocumentDraftRequest,
  DocumentDraft,
  DraftApiEnvelope,
  ListDocumentDraftsParams,
  ReplaceDocumentDraftRequest,
} from './documentDraftTypes';

const BASE = '/commerce/document-drafts';

type Envelope<T> = DraftApiEnvelope<T>;
type DraftCall = { id: string; version?: number };

/** `If-Match` carries the draft `version` so a second browser tab cannot silently overwrite the first. */
const ifMatch = (version?: number): Record<string, string> | undefined =>
  typeof version === 'number' ? { 'If-Match': `"${version}"` } : undefined;

/**
 * Document Draft endpoints (RTK Query, tag `DocumentDraft`), used by `useBillDraft`:
 *
 *   find an unfinished draft   getDocumentDrafts       GET    /commerce/document-drafts      provides  id + LIST
 *   restore it                 getDocumentDraftById    GET    /commerce/document-drafts/:id  provides  id
 *   first product added        createDocumentDraft     POST   /commerce/document-drafts      invalidates LIST
 *   every later change         replaceDocumentDraft    PUT    /commerce/document-drafts/:id  invalidates id + LIST
 *   all rows removed / fresh   clearDocumentDraftItems DELETE /commerce/document-drafts/:id  invalidates id + LIST
 *   real bill saved            finalizeDocumentDraft   PATCH  /commerce/document-drafts/:id/status  invalidates id + LIST
 *
 * The backend's partial update (PATCH items.add/update/remove) and single-row delete are not used on purpose:
 * replacing the whole list in one transaction keeps the server identical to the form with one request.
 */
export const documentDraftEndpoints = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentDrafts: builder.query<Envelope<DocumentDraft[]>, ListDocumentDraftsParams | void>({
      query: (params) => {
        const query: Record<string, string | number> = {};
        Object.entries((params || {}) as ListDocumentDraftsParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') query[k] = v as string | number;
        });
        return { url: BASE, params: Object.keys(query).length > 0 ? query : undefined };
      },
      providesTags: (result) =>
        result?.data
          ? [...result.data.map(({ id }) => ({ type: 'DocumentDraft' as const, id })), { type: 'DocumentDraft', id: 'LIST' }]
          : [{ type: 'DocumentDraft', id: 'LIST' }],
    }),

    getDocumentDraftById: builder.query<Envelope<DocumentDraft>, string>({
      query: (id) => `${BASE}/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'DocumentDraft', id }],
    }),

    createDocumentDraft: builder.mutation<Envelope<DocumentDraft>, CreateDocumentDraftRequest>({
      query: (payload) => ({ url: BASE, method: 'POST', body: payload }),
      invalidatesTags: [{ type: 'DocumentDraft', id: 'LIST' }],
    }),

    replaceDocumentDraft: builder.mutation<
      Envelope<DocumentDraft>,
      DraftCall & { payload: ReplaceDocumentDraftRequest }
    >({
      query: ({ id, payload, version }) => ({ url: `${BASE}/${id}`, method: 'PUT', body: payload, headers: ifMatch(version) }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DocumentDraft', id },
        { type: 'DocumentDraft', id: 'LIST' },
      ],
    }),

    /** Deletes every line item; the draft header is never deleted. */
    clearDocumentDraftItems: builder.mutation<Envelope<DocumentDraft>, DraftCall>({
      query: ({ id, version }) => ({ url: `${BASE}/${id}`, method: 'DELETE', headers: ifMatch(version) }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DocumentDraft', id },
        { type: 'DocumentDraft', id: 'LIST' },
      ],
    }),

    /** DRAFT -> COMPLETE: locks the draft and removes it from the list. */
    finalizeDocumentDraft: builder.mutation<Envelope<DocumentDraft>, DraftCall>({
      query: ({ id, version }) => ({
        url: `${BASE}/${id}/status`,
        method: 'PATCH',
        body: { status: 'COMPLETE' },
        headers: ifMatch(version),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'DocumentDraft', id },
        { type: 'DocumentDraft', id: 'LIST' },
      ],
    }),
  }),
});

const ep = documentDraftEndpoints.endpoints;

/**
 * Thunk creators for `dispatch(...).unwrap()` in hooks. Reads always go to the server (a draft must be current when it
 * is offered or restored) and are not kept subscribed; writes invalidate the tags above.
 */
export const documentDraftCalls = {
  list: (params: ListDocumentDraftsParams = {}) => ep.getDocumentDrafts.initiate(params, { forceRefetch: true, subscribe: false }),
  getById: (id: string) => ep.getDocumentDraftById.initiate(id, { forceRefetch: true, subscribe: false }),
  create: (payload: CreateDocumentDraftRequest) => ep.createDocumentDraft.initiate(payload),
  replace: (id: string, payload: ReplaceDocumentDraftRequest, version?: number) =>
    ep.replaceDocumentDraft.initiate({ id, payload, version }),
  clearItems: (id: string, version?: number) => ep.clearDocumentDraftItems.initiate({ id, version }),
  finalize: (id: string, version?: number) => ep.finalizeDocumentDraft.initiate({ id, version }),
};

export const {
  useGetDocumentDraftsQuery,
  useGetDocumentDraftByIdQuery,
  useCreateDocumentDraftMutation,
  useReplaceDocumentDraftMutation,
  useClearDocumentDraftItemsMutation,
  useFinalizeDocumentDraftMutation,
} = documentDraftEndpoints;

/** `error.code` of a failed draft call (e.g. "DRAFT_NOT_FOUND"); an unwrapped RTK Query error keeps the body on `.data`. */
export const getDraftErrorCode = (err: unknown): string | undefined =>
  (err as { data?: { error?: { code?: string } } } | null)?.data?.error?.code;

/** Readable message of a failed draft call. */
export const getDraftErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { data?: { error?: { message?: string }; message?: string }; message?: string } | null;
  return e?.data?.error?.message || e?.data?.message || e?.message || fallback;
};
