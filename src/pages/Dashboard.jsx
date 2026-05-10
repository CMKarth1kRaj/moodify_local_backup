import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useMobileNav } from '../context/MobileNavContext'
import Sidebar from '../components/Sidebar'
import client, { databases, DB_ID, COLLECTIONS } from '../services/appwrite'
import { Query } from 'appwrite'
import {
  Search,
  Bell,
  Menu,
  ChevronRight,
  Heart,
  Music,
  Headphones,
  Mic,
  Mic2,
  ListMusic,
  Clock,
  Send,
} from 'lucide-react'

function fmtDuration(s) {
  if (!s) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function fmtListeningTime(seconds) {
  if (!seconds || seconds < 60) return `${Math.round(seconds || 0)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Dashboard() {
  const { user } = useAuth()
  const { playSong, currentSong, queue, isLiked, toggleLike } = usePlayer()
  const { toggleSidebar } = useMobileNav()
  const navigate = useNavigate()

  const [trending,    setTrending]    = useState([])
  const [history,     setHistory]     = useState([])
  const [stats,       setStats]       = useState(null)
  const [likedCount,  setLikedCount]  = useState(0)
  const [topArtist,   setTopArtist]   = useState(null)
  const [greeting,    setGreeting]    = useState('')
  const [moodText,    setMoodText]    = useState('')
  const [moodActive,  setMoodActive]  = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Greeting
  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12)      setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else             setGreeting('Good evening')
  }, [])

  const fetchData = async () => {
    if (!user?.id) return

    try {
      // 1. Fetch Trending Songs
      const trendingRes = await databases.listDocuments(DB_ID, COLLECTIONS.SONGS, [
        Query.limit(6),
        Query.orderDesc('$createdAt')
      ])
      setTrending(trendingRes.documents)

      // 2. Fetch History (with Manual Expansion if needed, or assume relationships)
      const historyRes = await databases.listDocuments(DB_ID, COLLECTIONS.HISTORY, [
        Query.equal('user', user.id),
        Query.limit(5),
        Query.orderDesc('$createdAt')
      ])
      
      // If history items don't automatically include song data, we fetch them
      const historyWithSongs = await Promise.all(historyRes.documents.map(async (h) => {
        if (h.song && typeof h.song === 'string') {
          const song = await databases.getDocument(DB_ID, COLLECTIONS.SONGS, h.song)
          return { ...h, song }
        }
        return h
      }))
      setHistory(historyWithSongs)

      // 3. Fetch Likes Count
      const likesRes = await databases.listDocuments(DB_ID, COLLECTIONS.LIKES, [
        Query.equal('user', user.id)
      ])
      setLikedCount(likesRes.total)

      // 4. Fetch User Stats
      const statsRes = await databases.listDocuments(DB_ID, COLLECTIONS.USER_STATS, [
        Query.equal('user', user.id)
      ])
      if (statsRes.documents[0]) {
        let statsDoc = statsRes.documents[0]
        if (statsDoc.last_song && typeof statsDoc.last_song === 'string') {
          const lastSong = await databases.getDocument(DB_ID, COLLECTIONS.SONGS, statsDoc.last_song)
          statsDoc.last_song = lastSong
        }
        setStats(statsDoc)
      }

      // Derive top artist
      if (historyWithSongs.length > 0) {
        const artistCounts = {}
        historyWithSongs.forEach(h => {
          const artist = h.song?.artist
          if (artist) artistCounts[artist] = (artistCounts[artist] || 0) + 1
        })
        const top = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]
        if (top) setTopArtist({ name: top[0], count: top[1] })
      }
    } catch (e) {
      console.error("Dashboard fetch error", e)
    }
  }

  useEffect(() => {
    fetchData()

    // Real-time subscriptions
    const unsubscribe = client.subscribe([
      `databases.${DB_ID}.collections.${COLLECTIONS.USER_STATS}.documents`,
      `databases.${DB_ID}.collections.${COLLECTIONS.HISTORY}.documents`,
      `databases.${DB_ID}.collections.${COLLECTIONS.LIKES}.documents`
    ], (response) => {
      // Re-fetch on any relevant change for simplicity in this demo
      // In a production app, you'd handle individual events
      if (response.events.some(e => e.includes('.documents.'))) {
        fetchData()
      }
    })

    return () => unsubscribe()
  }, [user?.id])

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please type your mood instead.")
      setMoodActive(true)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setMoodActive(true)
      setMoodText('')
    }

    recognition.onresult = (event) => {
      let currentTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript
      }
      setMoodText(currentTranscript)
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error)
      if (event.error === 'not-allowed') {
        alert("Microphone access was denied. Please click the camera/mic icon in your browser's address bar to allow access.")
      } else if (event.error === 'no-speech') {
        console.warn("Browser didn't hear any speech. Check your system microphone settings.")
      }
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
  }

  const lastSong = stats?.expand?.last_song || null

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">

            {/* ── Topbar ── */}
            <div className="topbar" style={{ marginBottom: 32 }}>
              <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
                  className="search-input"
                  placeholder="Search for songs, artists, or moods..."
                  onFocus={() => navigate('/search')}
                />
              </div>
              <div className="topbar-actions">
                <button className="icon-button"><Bell size={18} /></button>
                <button className="hamburger-btn" onClick={toggleSidebar}><Menu size={24} /></button>
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=be5c2b&color=fff`}
                  className="user-avatar"
                  alt="Avatar"
                  onClick={() => navigate('/profile')}
                />
              </div>
            </div>

            {/* ── Greeting ── */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                {greeting}, {user?.name?.split(' ')[0] || 'there'} 👋
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4 }}>
                Here's what your listening looks like today.
              </p>
            </div>

            {/* ══════════════════════════════════════
                  BENTO GRID — all real data
                ══════════════════════════════════════ */}
            <div className="bento-grid">

              {/* [A] HERO — Last Listened (spans 2 cols × 2 rows) */}
              <div
                className="bento-item span-2 row-2"
                style={{
                  padding: 0,
                  background: lastSong ? 'black' : 'var(--surface)',
                  overflow: 'hidden',
                  cursor: lastSong ? 'pointer' : 'default',
                  minHeight: 340,
                }}
                onClick={() => lastSong && playSong([lastSong], 0)}
              >
                {lastSong ? (
                  <>
                    <img
                      src={lastSong.cover_url}
                      alt={lastSong.title}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(160deg, transparent 30%, rgba(0,0,0,0.95) 100%)',
                    }} />
                    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 28 }}>
                      <span style={{
                        alignSelf: 'flex-start',
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 999,
                        padding: '4px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'white',
                      }}>
                        Last Played · {timeAgo(history[0]?.created)}
                      </span>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                          {lastSong.artist}
                        </p>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 20 }}>
                          {lastSong.title}
                        </h2>
                        <button
                          className="btn-primary"
                          style={{ background: 'white', color: '#000', fontSize: 14, padding: '10px 20px' }}
                          onClick={(e) => { e.stopPropagation(); playSong([lastSong], 0) }}
                        >
                          <Music size={15} /> Play Again
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
                    <Headphones size={40} style={{ opacity: 0.3 }} />
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Nothing played yet</p>
                    <p style={{ fontSize: 13 }}>Your last song will appear here</p>
                  </div>
                )}
              </div>

              {/* [B] Listening Time */}
              <div className="bento-item bento-stat-card">
                <div className="bento-icon"><Clock size={44} /></div>
                <div>
                  <p className="bento-title">Listening Time</p>
                  <h3 className="bento-value">{fmtListeningTime(stats?.total_listening_time)}</h3>
                </div>
                <p className="bento-label">Total tracked</p>
              </div>

              {/* [C] Songs Played */}
              <div className="bento-item">
                <div className="bento-icon"><ListMusic size={44} /></div>
                <div>
                  <p className="bento-title">Songs Played</p>
                  <h3 className="bento-value">{history.length > 0 ? history.length + '+' : '0'}</h3>
                </div>
                <p className="bento-label">In your history</p>
              </div>

              {/* [D] Top Artist (spans 2 cols) */}
              <div
                className="bento-item span-2"
                style={{
                  background: topArtist
                    ? 'linear-gradient(135deg, var(--accent) 0%, #c84b23 100%)'
                    : 'var(--surface)',
                  border: 'none',
                  color: topArtist ? 'white' : undefined,
                }}
              >
                <div className="bento-icon" style={{ color: topArtist ? 'white' : 'var(--accent)', opacity: 0.2 }}>
                  <Mic2 size={44} />
                </div>
                <div>
                  <p className="bento-title" style={{ color: topArtist ? 'rgba(255,255,255,0.7)' : undefined }}>Top Artist</p>
                  <h3 className="bento-value" style={{ color: topArtist ? 'white' : undefined, fontSize: topArtist ? 22 : 16 }}>
                    {topArtist?.name || 'No data yet'}
                  </h3>
                </div>
                <p className="bento-label" style={{ color: topArtist ? 'rgba(255,255,255,0.7)' : undefined }}>
                  {topArtist ? `Listened ${topArtist.count} time${topArtist.count !== 1 ? 's' : ''}` : 'Play music to track your top artist'}
                </p>
              </div>

            </div>
            {/* ══════════════════════ end bento ══════════════════════ */}

            {/* ── AI Mood Input ── */}
            <div className="mood-hero-section">
              <div className={`mood-ring-container ${moodActive ? 'active' : ''} ${isListening ? 'listening' : ''}`} onClick={() => !isListening && startListening()}>
                <div className="mood-ring-glow" />
                <div className="mood-ring-outer">
                  <div className="mood-ring-inner">
                    <Mic size={32} />
                  </div>
                </div>
              </div>

              {!moodActive ? (
                <p className="mood-hero-label" onClick={() => startListening()}>Tap to describe your mood</p>
              ) : (
                <form className="mood-input-form" onSubmit={(e) => {
                  e.preventDefault()
                  if (moodText.trim()) {
                    navigate(`/playlist?mood=${encodeURIComponent(moodText.trim())}`)
                  }
                }}>
                  <input
                    autoFocus
                    className="mood-input"
                    placeholder={isListening ? "Listening..." : "How are you feeling right now?"}
                    value={moodText}
                    onChange={(e) => setMoodText(e.target.value)}
                  />
                  <button type="submit" className="mood-send-btn" disabled={!moodText.trim()}>
                    <Send size={20} />
                  </button>
                </form>
              )}
            </div>

            {/* ── Trending ── */}
            <div className="section-header">
              <h2 className="section-title">Trending Now</h2>
            </div>
            <div className="song-list">
              {trending.map((song, i) => (
                <div
                  className={`song-row ${currentSong?.$id === song.$id ? 'active' : ''}`}
                  key={song.$id}
                  onClick={() => playSong(trending, i)}
                >
                  {song.cover_url ? (
                    <img src={song.cover_url} className="song-cover" alt="cover" />
                  ) : (
                    <div className="song-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  <div className="song-info">
                    <p className="song-title">{song.title}</p>
                    <p className="song-artist">{song.artist}</p>
                  </div>
                  <span className="song-duration" style={{ marginRight: 12 }}>{fmtDuration(song.duration)}</span>
                  <button
                    className="song-action"
                    onClick={(e) => { e.stopPropagation(); toggleLike(song.$id) }}
                    style={{ color: isLiked(song.$id) ? 'var(--accent)' : undefined }}
                  >
                    <Heart size={18} fill={isLiked(song.$id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── Right Panel ── */}
        <aside className="right-view">
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: 18 }}>Now Playing</h2>
          </div>

          {currentSong ? (
            <>
              <div style={{ width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-xl)', background: 'var(--surface-hover)', overflow: 'hidden', marginBottom: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                {currentSong.cover_url ? (
                  <img src={currentSong.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="now playing" />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={64} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>{currentSong.title}</h3>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{currentSong.artist}</p>
              </div>
              <div style={{ marginBottom: 48 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.05em' }}>Next in Queue</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {queue.slice(0, 3).map((song, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {song.cover_url
                        ? <img src={song.cover_url} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} alt="next" />
                        : <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={16} style={{ color: 'var(--text-muted)' }} /></div>
                      }
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{song.artist}</p>
                      </div>
                    </div>
                  ))}
                  {queue.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Queue is empty.</p>}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', marginBottom: 48 }}>
              <Music size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <p style={{ fontSize: 14 }}>Pick a song to start listening</p>
            </div>
          )}

          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: 18 }}>Recent Activity</h2>
          </div>
          {history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {h.expand?.song?.cover_url
                    ? <img src={h.expand.song.cover_url} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} alt="history" />
                    : <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={14} style={{ color: 'var(--text-muted)' }} /></div>
                  }
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.expand?.song?.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(h.created)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No history yet.</p>
          )}
        </aside>

      </main>
    </>
  )
}