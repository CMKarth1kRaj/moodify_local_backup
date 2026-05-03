import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useRecommendations } from '../hooks/useRecommendations'
import pb from '../services/pocketbase'

const moods = [
  { label: 'Happy',   emoji: '😊', color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  bg: 'linear-gradient(135deg, #fbbf24, #f97316)' },
  { label: 'Chill',   emoji: '😌', color: '#34d399', glow: 'rgba(52,211,153,0.3)',   bg: 'linear-gradient(135deg, #34d399, #059669)' },
  { label: 'Sad',     emoji: '😢', color: '#60a5fa', glow: 'rgba(96,165,250,0.3)',   bg: 'linear-gradient(135deg, #60a5fa, #6366f1)' },
  { label: 'Workout', emoji: '💪', color: '#f97316', glow: 'rgba(249,115,22,0.3)',   bg: 'linear-gradient(135deg, #f97316, #ef4444)' },
  { label: 'Focus',   emoji: '🧠', color: '#a855f7', glow: 'rgba(168,85,247,0.3)',   bg: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
  { label: 'Party',   emoji: '🎉', color: '#ff6b6b', glow: 'rgba(255,107,107,0.3)',  bg: 'linear-gradient(135deg, #ff6b6b, #f43f5e)' },
  { label: 'Romance', emoji: '💖', color: '#f472b6', glow: 'rgba(244,114,182,0.3)',  bg: 'linear-gradient(135deg, #f472b6, #ec4899)' },
  { label: 'Hype',    emoji: '🔥', color: '#00d4ff', glow: 'rgba(0,212,255,0.3)',    bg: 'linear-gradient(135deg, #00d4ff, #a855f7)' },
]

const moodColor = m => (moods.find(x => x.label === m) || moods[0]).color

const moodEmojis = { Happy: '😊', Chill: '😌', Sad: '😢', Workout: '💪', Focus: '🧠', Party: '🎉', Romance: '💖', Hype: '🔥' }
const moodColors = { Happy: '#fbbf24', Chill: '#34d399', Sad: '#60a5fa', Workout: '#f97316', Focus: '#a855f7', Party: '#ff6b6b', Romance: '#f472b6', Hype: '#00d4ff' }

const navLinks = [
  { icon: '🏠', label: 'Home',         active: true, path: '/dashboard' },
  { icon: '🔍', label: 'Search',                     path: '/search'   },
  { icon: '📚', label: 'Your Library',               path: '/library'  },
  { icon: '❤️', label: 'Liked Songs',                path: '/liked'    },
]

function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = String(Math.floor(secs % 60)).padStart(2, '0')
  return `${m}:${s}`
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { playSong } = usePlayer()
  const navigate = useNavigate()
  const [activeMood, setActiveMood]   = useState(null)
  const [hoveredSong, setHoveredSong] = useState(null)
  const [hoveredRec, setHoveredRec]   = useState(null)
  const [playlists, setPlaylists]     = useState([])
  const [trending, setTrending]       = useState([])
  const [featured, setFeatured]       = useState([])
  const [liveCount, setLiveCount]     = useState(0)

  const { recommendations, loading: recsLoading } = useRecommendations(user?.id)

  // Sidebar playlists
  useEffect(() => {
    if (!user?.id) return
    pb.collection('Playlist').getFullList({
      filter: `user = "${user.id}"`,
      sort: '-created',
      requestKey: 'sidebar-playlists',
    }).then(setPlaylists).catch(() => {})
  }, [user?.id])

  // Real trending songs from PocketBase
  useEffect(() => {
    pb.collection('songs').getFullList({
      sort: '-created',
      perPage: 5,
      requestKey: 'dashboard-trending',
    }).then(data => setTrending(data.slice(0, 5))).catch(() => {})
  }, [])

  // Real featured playlists from PocketBase (any user's public playlists)
  useEffect(() => {
    pb.collection('Playlist').getFullList({
      sort: '-created',
      perPage: 3,
      requestKey: 'dashboard-featured',
    }).then(data => setFeatured(data.slice(0, 3))).catch(() => {})
  }, [])

  // Real live listener count from jam_rooms
  useEffect(() => {
    pb.collection('jam_rooms').getFullList({
      filter: 'is_live = true',
      requestKey: 'dashboard-live-count',
    }).then(rooms => {
      const total = rooms.reduce((sum, r) => sum + (r.listeners || 0), 0)
      setLiveCount(total)
    }).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
        padding: '28px 14px', display: 'flex', flexDirection: 'column', gap: 4,
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 8px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #00d4ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🎵</div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>Moodify</span>
        </div>

        {navLinks.map(item => (
          <button key={item.label} 
          onClick={() => item.path && navigate(item.path)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
            border: 'none', background: item.active ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: item.active ? '#fff' : 'var(--muted2)', cursor: 'pointer', fontSize: 14,
            fontWeight: item.active ? 600 : 400, textAlign: 'left', transition: 'all 0.2s', width: '100%'
          }}
            onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted2)' } }}>
            <span style={{ fontSize: 17 }}>{item.icon}</span>{item.label}
          </button>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', marginBottom: 4 }}>
  <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Playlists</p>
  <button onClick={() => navigate('/library')}
    style={{ background: 'none', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
    title="Create playlist">
    +
  </button>
</div>

{playlists.length === 0 && (
  <p style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 12px' }}>No playlists yet</p>
)}

{playlists.map(pl => {
  const moodColors = { Happy: '#fbbf24', Chill: '#34d399', Sad: '#60a5fa', Workout: '#f97316', Focus: '#a855f7', Party: '#ff6b6b', Romance: '#f472b6', Hype: '#00d4ff' }
  const moodEmojis = { Happy: '😊', Chill: '😌', Sad: '😢', Workout: '💪', Focus: '🧠', Party: '🎉', Romance: '💖', Hype: '🔥' }
  const color = moodColors[pl.mood] || '#00d4ff'
  const emoji = moodEmojis[pl.mood] || '🎵'
  return (
    <button key={pl.id}
      onClick={() => navigate('/library')}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 13, textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted2)' }}>
      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}22`, border: `1px solid ${color}44`, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{emoji}</div>
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</span>
    </button>
  )
})}

        <div style={{ marginTop: 'auto', background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 14, padding: '16px 14px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>🎧 Jam Session</p>
          <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 12, lineHeight: 1.5 }}>Listen live with friends in sync</p>
          <button onClick={() => navigate('/jam')} style={{ width: '100%', padding: '9px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
            Join a Room →
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>

        {/* Sticky topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,7,15,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, opacity: 0.4 }}>🔍</span>
            <input placeholder="Search songs, artists, moods..."
              onChange={e => { if (e.target.value) navigate('/search') }}
              onKeyDown={e => { if (e.key === 'Enter') navigate('/search') }}
              onFocus={() => navigate('/search')}
              style={{ width: '100%', maxWidth: 360, padding: '10px 16px 10px 42px', borderRadius: 99, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }} onClick={logout}>👤</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1 }}>{user?.name || user?.email}</p>
              <p style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>Free plan</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '32px 32px 0' }}>

          {/* ── Hero ── */}
          <div style={{ marginBottom: 44, position: 'relative', borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(135deg, rgba(0,212,255,0.07) 0%, rgba(168,85,247,0.07) 55%, rgba(255,107,107,0.04) 100%)', border: '1px solid rgba(255,255,255,0.06)', padding: '40px 44px' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -50, right: 80, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.13) 0%, transparent 70%)', animation: 'float 7s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', bottom: -40, right: 200, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)', animation: 'float 9s ease-in-out infinite 2s' }} />
            <div style={{ position: 'relative' }}>
              <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 10, letterSpacing: '0.3px' }}>Good evening 👋</p>
              <h1 style={{ fontFamily: 'Syne', fontSize: 42, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 14, background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                What's your<br />mood today?
              </h1>
              <p style={{ color: 'var(--muted2)', fontSize: 15, maxWidth: 380, lineHeight: 1.65, marginBottom: 28 }}>
                Pick a vibe and our AI will instantly build a playlist made for this exact moment.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/playlist?mood=Hype')}
                  style={{ padding: '13px 26px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Syne, sans-serif', boxShadow: '0 8px 28px rgba(0,212,255,0.22)' }}>
                  Generate Playlist ✨
                </button>
                <button onClick={() => navigate('/jam')}
                  style={{ padding: '13px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, backdropFilter: 'blur(8px)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
                  {liveCount > 0 ? `${liveCount} people live now` : 'Join a live room'}
                </button>
              </div>
            </div>
          </div>

          {/* ── Mood Grid ── */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Pick a mood</h2>
              <span style={{ fontSize: 12, color: 'var(--muted2)' }}>AI curates your playlist instantly</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {moods.map((mood, i) => (
                <div key={mood.label}
                  onClick={() => { setActiveMood(mood.label); navigate(`/playlist?mood=${mood.label}`) }}
                  style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1.7', transition: 'all 0.25s ease', animation: `fadeUp 0.45s ease ${i * 0.04}s both`, border: activeMood === mood.label ? `2px solid ${mood.color}` : '2px solid transparent', boxSizing: 'border-box' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 20px 48px ${mood.glow}` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ position: 'absolute', inset: 0, background: mood.bg, opacity: 0.18 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(0,0,0,0.05), rgba(0,0,0,0.55))' }} />
                  <div style={{ position: 'absolute', top: -18, right: -18, width: 70, height: 70, borderRadius: '50%', background: mood.color, opacity: 0.2, filter: 'blur(18px)' }} />
                  <div style={{ position: 'relative', padding: '14px 16px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 26 }}>{mood.emoji}</span>
                    <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>{mood.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Recommendations ── */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>✨ Recommended For You</h2>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 20 }}>Based on your recent listening history</p>
            {recsLoading ? (
              <div style={{ display: 'flex', gap: 14 }}>
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ flex: '0 0 160px', height: 180, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', animation: 'pulse-glow 1.5s ease infinite' }} />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <div style={{ padding: '32px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🎧</p>
                <p style={{ fontSize: 14, color: 'var(--muted2)' }}>Play some songs to get personalised recommendations!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                {recommendations.map((song, i) => {
                  const color = moodColors[song.mood] || '#00d4ff'
                  return (
                    <div key={song.id}
                      onClick={() => playSong(recommendations, i)}
                      onMouseEnter={() => setHoveredRec(i)}
                      onMouseLeave={() => setHoveredRec(null)}
                      style={{ flex: '0 0 160px', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${color}22`, transition: 'all 0.22s ease', transform: hoveredRec === i ? 'translateY(-4px)' : 'none', boxShadow: hoveredRec === i ? `0 16px 36px ${color}20` : 'none' }}>
                      <div style={{ height: 110, background: song.cover_url ? `url(${song.cover_url}) center/cover` : `linear-gradient(135deg, ${color}30, ${color}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                        {!song.cover_url && '🎵'}
                        {hoveredRec === i && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>▶</div>
                        )}
                      </div>
                      <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                        <span style={{ display: 'inline-block', marginTop: 6, fontSize: 10, color, background: `${color}15`, padding: '2px 8px', borderRadius: 99, border: `1px solid ${color}22` }}>{song.mood}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Featured ── */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Featured playlists</h2>
              <span onClick={() => navigate('/library')} style={{ fontSize: 13, color: '#00d4ff', cursor: 'pointer' }}>See all →</span>
            </div>
            {featured.length === 0 ? (
              <div style={{ padding: '28px', borderRadius: 18, background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>No playlists yet — <span onClick={() => navigate('/library')} style={{ color: '#00d4ff', cursor: 'pointer' }}>create one</span></p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {featured.map((p, i) => {
                  const color = moodColors[p.mood] || '#00d4ff'
                  const emoji = moodEmojis[p.mood] || '🎵'
                  return (
                    <div key={p.id || i}
                      onClick={() => navigate(`/playlist?mood=${p.mood || 'Chill'}`)}
                      style={{ borderRadius: 18, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${color}22`, transition: 'all 0.25s ease', animation: `fadeUp 0.5s ease ${i * 0.08}s both` }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 48px ${color}20` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                      <div style={{ height: 130, background: `linear-gradient(135deg, ${color}20, ${color}06)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, position: 'relative', borderBottom: `1px solid ${color}18` }}>
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />
                        {emoji}
                      </div>
                      <div style={{ padding: '16px 18px', background: 'rgba(255,255,255,0.02)' }}>
                        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 12, lineHeight: 1.5 }}>{p.mood ? `${p.mood} vibes` : 'Mixed playlist'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color, fontWeight: 600 }}>{Array.isArray(p.songs) ? p.songs.length : 0} songs</span>
                          <span style={{ fontSize: 11, color, background: `${color}15`, padding: '3px 10px', borderRadius: 99, border: `1px solid ${color}22` }}>{p.mood || 'Mixed'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ── Trending ── */}
          <section style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' }}>Trending now 🔥</h2>
              <span onClick={() => navigate('/search')} style={{ fontSize: 13, color: '#00d4ff', cursor: 'pointer' }}>See all →</span>
            </div>
            {trending.length === 0 ? (
              <div style={{ padding: '28px', borderRadius: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--muted2)' }}>No songs in the library yet</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 60px', gap: 16, padding: '11px 20px', borderBottom: '1px solid var(--border)' }}>
                  {['#', 'TITLE', 'MOOD', 'TIME'].map(h => (
                    <span key={h} style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.8px' }}>{h}</span>
                  ))}
                </div>
                {trending.map((song, i) => {
                  const color = moodColor(song.mood)
                  return (
                    <div key={song.id || i}
                      onClick={() => playSong(trending, i)}
                      onMouseEnter={() => setHoveredSong(i)}
                      onMouseLeave={() => setHoveredSong(null)}
                      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 100px 60px', gap: 16, padding: '13px 20px', borderBottom: i < trending.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: hoveredSong === i ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.15s', alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color, border: `1px solid ${color}28` }}>{i + 1}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: song.cover_url ? `url(${song.cover_url}) center/cover` : `linear-gradient(135deg, ${color}28, ${color}0a)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${color}18`, flexShrink: 0 }}>
                          {!song.cover_url && (hoveredSong === i ? '▶' : '🎵')}
                          {song.cover_url && hoveredSong === i && <div style={{ position: 'absolute', fontSize: 18 }}>▶</div>}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{song.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--muted2)' }}>{song.artist}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color, background: `${color}12`, padding: '4px 10px', borderRadius: 99, border: `1px solid ${color}22`, width: 'fit-content' }}>{song.mood}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtDuration(song.duration)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}