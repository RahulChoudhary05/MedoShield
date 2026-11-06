import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => count < 1 && ![401, 403, 404, 422].includes(err?.response?.status),
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{ className: '!rounded-2xl !border-line !font-sans !shadow-lift', style: { fontFamily: 'Geist Variable, system-ui' } }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
