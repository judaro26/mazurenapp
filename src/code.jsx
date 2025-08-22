import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Wait until React mounts before hiding the loading screen
function hideLoadingScreen() {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) loadingDiv.style.display = 'none';
}

// Root element where React will mount
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

// Render the app and then hide loading screen
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Once React is mounted, hide the loading spinner
hideLoadingScreen();
