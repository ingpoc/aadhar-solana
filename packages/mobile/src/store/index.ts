import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './slices/authSlice';
import identityReducer from './slices/identitySlice';
import credentialsReducer from './slices/credentialsSlice';
import reputationReducer from './slices/reputationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    identity: identityReducer,
    credentials: credentialsReducer,
    reputation: reputationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in actions for async thunks
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use throughout the app
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export slices for convenience
export * from './slices/authSlice';
export * from './slices/identitySlice';
export * from './slices/credentialsSlice';
export * from './slices/reputationSlice';
