import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Playlist from './pages/Playlist'
import Player from './pages/Player'
import Lyrics from './pages/Lyrics'
import JamSession from './pages/JamSession'
import ProtectedRoute from './components/ProtectedRoute'
import MiniPlayer from './components/MiniPlayer'
import LikedSongs from './pages/LikedSongs'
import Search from './pages/Search'
import Library from './pages/Library'

function AppContent() {
  const location = useLocation()
  const hideMiniPlayer = ['/jam', '/player'].includes(location.pathname)

  return (
    <>
      <Routes>
        <Route path="/"          element={<Login />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/playlist"  element={<ProtectedRoute><Playlist /></ProtectedRoute>} />
        <Route path="/player"    element={<ProtectedRoute><Player /></ProtectedRoute>} />
        <Route path="/lyrics"    element={<ProtectedRoute><Lyrics /></ProtectedRoute>} />
        <Route path="/jam"       element={<ProtectedRoute><JamSession /></ProtectedRoute>} />
        <Route path="/liked" element={<ProtectedRoute><LikedSongs /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
      </Routes>
      {!hideMiniPlayer && <MiniPlayer />}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App