
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// After a redeploy, a client holding a stale index.html may request asset
// chunks whose hashes no longer exist (404), which silently breaks lazy
// sections. Reload once to pick up the fresh manifest; a sessionStorage guard
// prevents an infinite reload loop if the failure is not deploy-related.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('chunk-reloaded') === '1') return;
  sessionStorage.setItem('chunk-reloaded', '1');
  window.location.reload();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
