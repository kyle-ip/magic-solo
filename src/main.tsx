import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './i18n'
import './styles.css'

const redirect = sessionStorage.getItem('spa-redirect')
if (redirect) {
  sessionStorage.removeItem('spa-redirect')
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const path = redirect.startsWith(base) ? redirect.slice(base.length) || '/' : redirect
  window.history.replaceState(null, '', `${base}${path.startsWith('/') ? path : `/${path}`}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
