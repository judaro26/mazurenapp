import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Create the root for the React application.
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- PWA Service Worker Registration ---
// Registers a service worker to enable PWA features like offline access and
// adding the app to the home screen.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered:', registration);
      })
      .catch(registrationError => {
        console.log('Service Worker registration failed:', registrationError);
      });
  });
}
