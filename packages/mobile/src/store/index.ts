import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import identityReducer from './slices/identitySlice';
import credentialsReducer from './slices/credentialsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    identity: identityReducer,
    credentials: credentialsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
