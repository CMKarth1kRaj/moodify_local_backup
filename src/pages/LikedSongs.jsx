import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { useLikes } from '../hooks/useLikes'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function LikedSongs() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, playing } = usePlayer()
  const { likedSongs, isLiked, toggleLike, loading } = useLikes(user?.id)

  const handlePlay = (i) => {
    playSong(likedSongs, i)
    navigate('/player')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(168,85,247,0.08))', borderBottom: '1px solid rgba(244,114,182,0.2)', padding: '32px 24px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 100, height: 100, borderRadius: 24, background: 'linear-gradient(135deg, #f472b6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: '0 16px 48px rgba(244,114,182,0.3)' }}>
              ♥
            </div>
            <div>
              <p style={{ fontSize: 12, color: '#f472b6', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Your Collection</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Liked Songs</h1>
              <p style={{ color: 'var(--muted2)', fontSize: 14 }}>{likedSongs.length} songs you loved</p>
            </div>
            {likedSongs.length > 0 && (
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={() => handlePlay(0)}
                  style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f472b6, #a855f7)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 8px 24px rgba(244,114,182,0.3)', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  ▶ Play All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Songs */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>Loading...</div>
        )}

        {!loading && likedSongs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>♡</p>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No liked songs yet</p>
            <p style={{ fontSize: 14, marginBottom: 24 }}>Hit the ♡ on any song to save it here</p>
            <button onClick={() => navigate('/dashboard')}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f472b6, #a855f7)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Browse Music →
            </button>
          </div>
        )}

        {!loading && likedSongs.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px 48px 60px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
              <span style={{ fontSize: 12 }}>#</span>
              <span style={{ fontSize: 12 }}>TITLE</span>
              <span style={{ fontSize: 12 }}>ALBUM</span>
              <span style={{ fontSize: 12 }}>♥</span>
              <span style={{ fontSize: 12, textAlign: 'right' }}>TIME</span>
            </div>

            {likedSongs.map((song, i) => {
              const isActive = currentSong?.id === song.id
              return (
                <div key={song.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 160px 48px 60px', gap: 16,
                    padding: '14px 20px', borderBottom: i < likedSongs.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s', alignItems: 'center',
                    background: isActive ? 'rgba(244,114,182,0.08)' : 'transparent',
                    borderLeft: isActive ? '3px solid #f472b6' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>

                  <span onClick={() => handlePlay(i)} style={{ color: isActive ? '#f472b6' : 'var(--muted)', fontSize: 13 }}>
                    {isActive && playing ? '▶' : i + 1}
                  </span>

                  <div onClick={() => handlePlay(i)}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: isActive ? '#f472b6' : 'var(--text)', marginBottom: 2 }}>{song.title}</p>
                    <p style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.artist}</p>
                  </div>

                  <span onClick={() => handlePlay(i)} style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.album}</span>

                  <button
                    onClick={e => { e.stopPropagation(); toggleLike(song.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#f472b6', transition: 'all 0.2s', padding: 0 }}
                    title="Unlike">
                    ♥
                  </button>

                  <span onClick={() => handlePlay(i)} style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'right' }}>{fmt(song.duration)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}