import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // This file is where you would import your CSS, but is not needed for a Tailwind-based app.

// Create the root for the React application.
// This is the starting point where the entire app is rendered.
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component into the root.
// The <React.StrictMode> component helps with finding potential problems in an application.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- PWA Service Worker Registration ---
// You would add the service worker registration code here as discussed previously.
//
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/service-worker.js')
//       .then(registration => {
//         console.log('Service Worker registered:', registration);
//       })
//       .catch(registrationError => {
//         console.log('Service Worker registration failed:', registrationError);
//       });
//   });
// }
