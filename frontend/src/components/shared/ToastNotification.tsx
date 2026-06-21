/**
 * ToastNotification Component
 *
 * Configures and renders the react-hot-toast Toaster with
 * ACIA-consistent styling. Placed once in the App root.
 *
 * Usage in other components:
 *   import toast from 'react-hot-toast'
 *   toast.success('Action completed')
 *   toast.error('Something went wrong')
 */

import { Toaster } from 'react-hot-toast'

export default function ToastNotification() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          borderRadius: '0.75rem',
          fontSize: '0.875rem',
          padding: '12px 16px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: {
            primary: '#16a34a',
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#dc2626',
            secondary: '#ffffff',
          },
          duration: 5000,
        },
      }}
    />
  )
}