import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 3200,
            style: {
              background: '#22252f',
              color: '#fff',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontWeight: 600,
              padding: '12px 16px',
              boxShadow: '0 18px 40px -16px rgba(0,0,0,.5)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' }, duration: 4500 },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);