// src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';

const AUTH_STATE_VERSION = 10;

// Load state from localStorage
const loadAuthState = () => {
  try {
    const authState = localStorage.getItem('authState');
    const parsedState = authState ? JSON.parse(authState) : undefined;
    return parsedState?.version === AUTH_STATE_VERSION ? parsedState : undefined;
  } catch {
    return undefined;
  }
};

// Save state to localStorage
const saveAuthState = (state) => {
  try {
    localStorage.setItem(
      'authState',
      JSON.stringify({
        version: AUTH_STATE_VERSION,
        token: state.token,
        user: state.user,
        sidebar: state.sidebar,
        permissions: state.permissions,
        actionPermissions: state.actionPermissions,
        allowedRoutes: state.allowedRoutes,
        locations: state.locations,
      })
    );
  } catch (err) {
    console.error('Failed to save auth state:', err);
  }
};

const initialState = loadAuthState() || {
  user: null,
  token: null,
  sidebar: [],
  permissions: [],
  actionPermissions: [],
  allowedRoutes: [],
  locations: [],
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.sidebar = action.payload.sidebar || [];
      state.permissions = action.payload.permissions || [];
      state.actionPermissions = action.payload.actionPermissions || [];
      state.allowedRoutes = action.payload.allowedRoutes || [];
      state.locations = action.payload.locations || [];
      state.error = null;
      saveAuthState(state);
      localStorage.setItem('login', Date.now());
    },
    tokenRefreshed: (state, action) => {
      state.token = action.payload.token;
      saveAuthState(state);
    },
    authStateSynced: (state, action) => {
      state.token = action.payload.token || null;
      state.user = action.payload.user || null;
      state.sidebar = action.payload.sidebar || [];
      state.permissions = action.payload.permissions || [];
      state.actionPermissions = action.payload.actionPermissions || [];
      state.allowedRoutes = action.payload.allowedRoutes || [];
      state.locations = action.payload.locations || [];
      state.error = null;
    },
    authStateCleared: (state) => {
      state.user = null;
      state.token = null;
      state.sidebar = [];
      state.permissions = [];
      state.actionPermissions = [];
      state.allowedRoutes = [];
      state.locations = [];
      state.error = null;
    },
    logout: (state) => {
      // reset everything
      state.user = null;
      state.token = null;
      state.sidebar = [];
      state.permissions = [];
      state.actionPermissions = [];
      state.allowedRoutes = [];
      state.locations = [];
      state.error = null;

      // clear storage + cookies
      localStorage.removeItem('authState');
      Cookies.remove('locationId');
      Cookies.remove('state');

      // trigger storage event for multi-tab sync
      localStorage.setItem('logout', Date.now());
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { loginSuccess, tokenRefreshed, authStateSynced, authStateCleared, logout, setError } =
  authSlice.actions;

export default authSlice.reducer;
