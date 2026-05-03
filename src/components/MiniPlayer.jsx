import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function MiniPlayer() {
  const { currentSong, playing, progress, duration, togglePlay, next, prev, seek } = usePlayer()
  const navigate = useNavigate()

  if (!currentSong) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(8,9,18,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 20, zIndex: 999 }}>

      {/* Album art + song info */}
      <div onClick={() => navigate('/player')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 240, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}>

        {/* Album cover */}
        <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
          {currentSong.cover_url
            ? <img src={currentSong.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #00d4ff22, #a855f722)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎵</div>
          }
        </div>

        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentSong.title}</p>
          <p style={{ color: 'var(--muted2)', fontSize: 12, marginTop: 2 }}>{currentSong.artist}</p>
        </div>
      </div>

      {/* Controls + progress */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button onClick={prev} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 18 }}>⏮</button>
          <button onClick={togglePlay}
            style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#000', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
            {playing ? '⏸' : '▶'}
          </button>
          <button onClick={next} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 18 }}>⏭</button>
        </div>
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 32 }}>{fmt(progress)}</span>
          <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 99, cursor: 'pointer' }}
            onClick={e => seek(e, e.currentTarget)}>
            <div style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #00d4ff, #a855f7)', borderRadius: 99, transition: 'width 0.5s linear' }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>{fmt(duration)}</span>
        </div>
      </div>

      {/* Open player */}
      <button onClick={() => navigate('/player')}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', color: 'var(--muted2)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
        Open ↑
      </button>
    </div>
  )
}

export default MiniPlayer