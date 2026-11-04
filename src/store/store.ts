import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '../api/baseApi';
import { installApiCache } from '../api/queryCache';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

// Re-fetch RTK Query hooks that opted in after the browser comes back online (refetchOnFocus stays off on purpose).
setupListeners(store.dispatch);
// Serve repeat GETs from the shared cache and evict only what each mutation can change.
installApiCache(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
