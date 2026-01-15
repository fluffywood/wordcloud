import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#141B34',
          color: '#F3F4F6',
          border: '1px solid #1E293B',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#F3F4F6',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#F3F4F6',
          },
        },
      }}
    />
  </StrictMode>,
)
