import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Music, 
  ListMusic, 
  Quote,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart
} from 'lucide-react'

const LYRICS_FALLBACK = [
  { t: 0, text: '♪' },
  { t: 3, text: 'Lyrics not found for this song' },
  { t: 6, text: 'Try a different track' },
]

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Player() {
  const navigate = useNavigate()
  const { 
    queue, currentSong, currentIdx, playing, progress, duration, 
    shuffle, repeat, muted, isLiked, toggleLike,
    togglePlay, toggleShuffle, toggleRepeat, toggleMute,
    next, prev, seek, playSong, seekTo 
  } = usePlayer()
  const [panel, setPanel] = useState('queue')
  const [lyrics, setLyrics] = useState([])
  const [loadingLyrics, setLoadingLyrics] = useState(false)
  const lineRefs = useRef([])
  const lyricsContainer = useRef(null)
  const touchStart = useRef(null)

  const onTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientY
  }

  const onTouchEnd = (e) => {
    if (touchStart.current === null) return
    const touchEnd = e.changedTouches[0].clientY
    const diff = touchEnd - touchStart.current
    if (diff > 100) { // Swipe down more than 100px
      navigate(-1)
    }
    touchStart.current = null
  }

  // Fetch lyrics from LRCLIB when song changes
  useEffect(() => {
    if (!currentSong) return
    const fetchLyrics = async () => {
      setLoadingLyrics(true)
      setLyrics([])
      try {
        const res = await fetch(
          `https://lrclib.net/api/get?artist_name=${encodeURIComponent(currentSong.artist)}&track_name=${encodeURIComponent(currentSong.title)}`
        )
        const data = await res.json()
        if (data.syncedLyrics) {
          const parsed = data.syncedLyrics
            .split('\n')
            .map(line => {
              const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
              if (!match) return null
              const t = parseInt(match[1]) * 60 + parseFloat(match[2])
              return { t, text: match[3].trim() || '♪' }
            })
            .filter(Boolean)
          setLyrics(parsed.length > 0 ? parsed : LYRICS_FALLBACK)
        } else {
          setLyrics(LYRICS_FALLBACK)
        }
      } catch {
        setLyrics(LYRICS_FALLBACK)
      } finally {
        setLoadingLyrics(false)
      }
    }
    fetchLyrics()
  }, [currentSong?.id])

  // Find active lyric line
  const activeIdx = lyrics.reduce((acc, line, i) => line.t <= progress ? i : acc, 0)

  // Auto scroll to active line
  useEffect(() => {
    const el = lineRefs.current[activeIdx]
    if (el && panel === 'lyrics') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIdx, panel])

  if (!currentSong) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <Music size={48} className="text-muted" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>No song playing</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Browse Music
        </button>
      </div>
    )
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div 
      onTouchStart={onTouchStart} 
      onTouchEnd={onTouchEnd}
      className="full-player-container"
    >

      {/* Swipe Indicator (Mobile) */}
      <div className="mobile-swipe-indicator" />

      {/* Ambient background (Apple Music style Liquid Glass) */}
      <div className="full-player-bg">
        {currentSong.cover_url && (
          <img src={currentSong.cover_url} alt="" />
        )}
        <div className="full-player-overlay" />
      </div>

      {/* Top nav */}
      <div className="full-player-nav">
        <button onClick={() => navigate(-1)} className="icon-button glass-btn">
          <ChevronDown size={24} />
        </button>
        <p className="full-player-title">Now Playing</p>
        <div style={{ width: 40 }} />
      </div>

      {/* Body */}
      <div className="full-player-body">

        {/* ── Left: Player ── */}
        <div className="full-player-main">

          {/* Album art */}
          <div className="full-player-art-wrapper">
            <div className={`full-player-art ${playing ? 'playing' : ''}`}>
              {currentSong.cover_url
                ? <img src={currentSong.cover_url} alt="cover" />
                : <div className="full-player-art-placeholder"><Music size={80} className="text-muted" /></div>
              }
            </div>
          </div>

          {/* Song info */}
          <div className="full-player-info">
            <div>
              <h1>{currentSong.title}</h1>
              <p>{currentSong.artist}</p>
            </div>
            <button 
              className="icon-button" 
              onClick={() => toggleLike(currentSong.id)}
              style={{ color: isLiked(currentSong.id) ? 'var(--accent)' : 'inherit' }}
            >
              <Heart size={28} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="full-player-progress">
            <div className="progress-bar-bg" onClick={e => seek(e, e.currentTarget)}>
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-times">
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="full-player-controls">
            <button className="icon-button" onClick={toggleShuffle} style={{ color: shuffle ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <Shuffle size={24} />
            </button>
            <button className="icon-button large" onClick={prev}>
              <SkipBack size={36} fill="currentColor" />
            </button>
            <button className="player-play-btn huge" onClick={togglePlay}>
              {playing ? <Pause size={42} fill="currentColor" /> : <Play size={42} fill="currentColor" style={{ marginLeft: 6 }} />}
            </button>
            <button className="icon-button large" onClick={next}>
              <SkipForward size={36} fill="currentColor" />
            </button>
            <button className="icon-button" onClick={toggleRepeat} style={{ color: repeat ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <Repeat size={24} />
            </button>
          </div>
          
          {/* Volume Control */}
          <div className="full-player-volume">
             <button className="icon-button" onClick={toggleMute}>
               {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
             </button>
             <div className="progress-bar-bg" style={{ flex: 1, height: 4 }}>
                <div className="progress-bar-fill" style={{ width: muted ? '0%' : '100%' }} />
             </div>
          </div>

        </div>

        {/* ── Right: Queue / Lyrics panel ── */}
        <div className="full-player-sidepanel">

          {/* Toggle */}
          <div className="sidepanel-tabs">
            {['queue', 'lyrics'].map(tab => (
              <button key={tab}
                onClick={() => setPanel(tab)}
                className={`sidepanel-tab ${panel === tab ? 'active' : ''}`}>
                {tab === 'queue' ? <ListMusic size={18} /> : <Quote size={18} />}
                {tab === 'queue' ? 'Queue' : 'Lyrics'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="sidepanel-content">
            {panel === 'queue' ? (
              <div className="song-list">
                {queue.map((s, i) => (
                  <div key={s.id}
                    onClick={() => playSong(queue, i)}
                    className={`song-row ${i === currentIdx ? 'active' : ''}`}
                    style={{ padding: '8px 12px', background: i === currentIdx ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none' }}
                  >
                    <img src={s.cover_url} className="song-cover" style={{ width: 44, height: 44, borderRadius: 8 }} alt="thumb" />
                    <div className="song-info">
                      <p className="song-title" style={{ fontSize: 15, color: 'var(--text-primary)' }}>{s.title}</p>
                      <p className="song-artist" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div ref={lyricsContainer} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 60 }}>
                {loadingLyrics ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>Loading lyrics...</p>
                ) : lyrics.map((line, i) => (
                  <div key={i}
                    ref={el => lineRefs.current[i] = el}
                    onClick={() => seekTo(line.t)}
                    style={{
                      padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
                      color: i === activeIdx ? 'var(--text-primary)' : i < activeIdx ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontWeight: i === activeIdx ? 800 : 600,
                      fontSize: i === activeIdx ? '24px' : '18px',
                      transition: 'all 0.3s ease',
                      textShadow: i === activeIdx ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
                      opacity: i > activeIdx + 5 ? 0.3 : 1
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}