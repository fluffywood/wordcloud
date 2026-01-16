import { useState, useEffect, useCallback } from 'react'

// Global toast store using a simple pub/sub pattern
let listeners = []
let toastId = 0

function emitToast(message, type) {
  const toast = { id: ++toastId, message, type }
  listeners.forEach(listener => listener(toast))
}

// Toast API
export const toast = {
  success: (message) => emitToast(message, 'success'),
  error: (message) => emitToast(message, 'error'),
}

// Toast Container Component
export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  // Dismiss all toasts function
  const dismissAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  // Dismiss a single toast
  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
  }, [])

  useEffect(() => {
    // Subscribe to toast events
    const handleToast = (newToast) => {
      setToasts(prev => [...prev, newToast])

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id))
      }, 4000)
    }

    listeners.push(handleToast)

    // Cleanup
    return () => {
      listeners = listeners.filter(l => l !== handleToast)
    }
  }, [])

  // Escape key handler to dismiss all toasts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && toasts.length > 0) {
        dismissAllToasts()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toasts.length, dismissAllToasts])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-lg shadow-lg
            flex items-center gap-2 min-w-[200px] max-w-[400px]
            animate-slide-in
            ${t.type === 'success'
              ? 'bg-surface border border-success text-text-primary'
              : 'bg-surface border border-error text-text-primary'}
          `}
        >
          {t.type === 'success' ? (
            <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-sm font-medium flex-1">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="ml-2 p-1 rounded hover:bg-elevated transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4 text-text-muted hover:text-text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
