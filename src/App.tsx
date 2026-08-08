import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FloatingNav } from './components/FloatingNav'
import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import { ChallengePage } from './pages/ChallengePage'
import { DeckPage } from './pages/DeckPage'
import { HomePage } from './pages/HomePage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const isArena = pathname.startsWith('/challenge/')

  return (
    <div className={`app-shell ${isArena ? 'is-arena' : ''}`}>
      <ScrollToTop />
      {!isArena ? <SiteHeader /> : null}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decks/:setCode" element={<DeckPage />} />
        <Route path="/challenge/:setCode" element={<ChallengePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isArena ? <SiteFooter /> : null}
      {!isArena ? <FloatingNav /> : null}
    </div>
  )
}
