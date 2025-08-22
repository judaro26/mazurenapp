import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Find the root DOM element where the app will be rendered
const rootElement = document.getElementById('root');

// Use the createRoot API to render the React application
// This is the modern way to render a React app in a browser
// React.StrictMode is a tool for highlighting potential problems in an application
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
