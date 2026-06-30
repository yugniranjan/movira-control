import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { Toaster } from 'sonner';
import Loader from './components/Loader';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  useEffect(() => {
    // Handle browser window focus events
    const onFocus = () => {
      store.dispatch({ type: 'api/refetchOnFocus' });
    };

    // Handle online/offline events
    const onOnline = () => {
      store.dispatch({ type: 'api/refetchOnReconnect' });
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <div data-app="admin">
          <Toaster position="top-right" richColors offset={60} dir="ltr"/>
          <AppRoutes />
        </div>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
