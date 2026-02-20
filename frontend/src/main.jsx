import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sileo'
import 'sileo/styles.css'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppConfigProvider } from './context/AppConfigContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AppConfigProvider>
        <App />
        {/* Sileo — Reconfigurado para Dynamic Island position */}
        <Toaster position="top-center" />
      </AppConfigProvider>
    </AuthProvider>
  </StrictMode>,
)

