/**
 * @file main.tsx
 * @description Entry point cho Web App - Sát hạch Đường trường Pro.
 * Import App.tsx trực tiếp (tránh Vite resolve sai sang .jsx)
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
