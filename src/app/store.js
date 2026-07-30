// src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '../api/baseApi';
import authReducer, {
  authStateCleared,
  authStateSynced,
  tokenRefreshed,
} from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

// Enable refetchOnFocus and refetchOnReconnect
setupListeners(store.dispatch);

window.addEventListener('movira:token-refreshed', (event) => {
  const token = event.detail?.token;
  if (token) store.dispatch(tokenRefreshed({ token }));
});

window.addEventListener('movira:auth-cleared', () => {
  store.dispatch(authStateCleared());
});

// 🔹 Multi-tab sync for login + logout
window.addEventListener('storage', (event) => {
  if (event.key === 'logout') {
    store.dispatch(authStateCleared());
  }

  if (event.key === 'login') {
    const authState = localStorage.getItem('authState');
    if (authState) {
      store.dispatch(authStateSynced(JSON.parse(authState)));
    }
  }
});
