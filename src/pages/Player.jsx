import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'

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
  const { queue, currentSong, currentIdx, playing, progress, duration, togglePlay, next, prev, seek, playSong, seekTo } = usePlayer()
  const [panel, setPanel] = useState('queue')
  const [lyrics, setLyrics] = useState([])
  const [loadingLyrics, setLoadingLyrics] = useState(false)
  const lineRefs = useRef([])
  const lyricsContainer = useRef(null)

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
        <p style={{ fontSize: 48 }}>🎵</p>
        <p style={{ color: 'var(--muted2)', fontSize: 16 }}>No song playing</p>
        <button onClick={() => navigate('/dashboard')}
          style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          Browse Music →
        </button>
      </div>
    )
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 30% 40%, rgba(0,212,255,0.09) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 75% 65%, rgba(168,85,247,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top nav */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>
          ← Back
        </button>
        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--muted2)' }}>Now Playing</p>
        <div style={{ width: 90 }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', gap: 32, alignItems: 'flex-start', padding: '0 32px 120px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>

        {/* ── Left: Player ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20 }}>

          {/* Album art */}
          <div style={{ position: 'relative', marginBottom: 44 }}>
            <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)', animation: 'pulse-glow 3s ease-in-out infinite' }} />
            <div style={{ position: 'absolute', inset: -8, borderRadius: 36, border: '1px solid rgba(0,212,255,0.2)' }} />
            <div style={{
              width: 300, height: 300, borderRadius: 28, overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 80px rgba(0,212,255,0.2), 0 8px 32px rgba(0,0,0,0.6)',
              transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
              transform: playing ? 'scale(1)' : 'scale(0.95)'
            }}>
              {currentSong.cover_url
                ? <img src={currentSong.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(168,85,247,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>🎵</div>
              }
            </div>

            {/* Sound bars */}
            {playing && (
              <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ width: 3, background: '#00d4ff', borderRadius: 2, animation: `bars 0.7s ease-in-out infinite ${i * 0.13}s`, height: 8 }} />
                ))}
              </div>
            )}
          </div>

          {/* Song info */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>{currentSong.title}</h1>
            <p style={{ color: 'var(--muted2)', fontSize: 16 }}>{currentSong.artist}</p>
            {currentSong.album && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{currentSong.album}</p>}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', maxWidth: 440, marginBottom: 28 }}>
            <div
              style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 99, cursor: 'pointer', marginBottom: 10, position: 'relative' }}
              onClick={e => seek(e, e.currentTarget)}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #00d4ff, #a855f7)', borderRadius: 99, transition: 'width 0.5s linear', position: 'relative' }}>
                <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #00d4ff' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
              <span>{fmt(progress)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <button onClick={prev}
              style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 22, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.transform = 'scale(1)' }}>⏮</button>

            <button onClick={togglePlay}
              style={{ width: 68, height: 68, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#000', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 28px rgba(0,212,255,0.4)', fontWeight: 900, transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
              {playing ? '⏸' : '▶'}
            </button>

            <button onClick={next}
              style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 22, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted2)'; e.currentTarget.style.transform = 'scale(1)' }}>⏭</button>
          </div>
        </div>

        {/* ── Right: Queue / Lyrics panel ── */}
        <div style={{ width: 340, background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border)', borderRadius: 22, overflow: 'hidden', flexShrink: 0, backdropFilter: 'blur(12px)', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', marginTop: 20, maxHeight: 'calc(100vh - 180px)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', padding: '12px 12px', gap: 8, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {['queue', 'lyrics'].map(tab => (
              <button key={tab}
                onClick={() => setPanel(tab)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, transition: 'all 0.25s ease',
                  background: panel === tab ? 'rgba(0,212,255,0.12)' : 'transparent',
                  color: panel === tab ? '#fff' : 'var(--muted2)',
                  borderBottom: panel === tab ? '2px solid #00d4ff' : '2px solid transparent'
                }}>
                {tab === 'queue' ? '≡ Queue' : '📜 Lyrics'}
              </button>
            ))}
          </div>

          {/* Queue panel */}
          {panel === 'queue' && (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--muted2)' }}>{queue.length} songs in queue</p>
              </div>
              {queue.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted2)', fontSize: 14 }}>No songs in queue</div>
                : queue.map((s, i) => {
                  const isCurrent = i === currentIdx
                  return (
                    <div key={s.id}
                      onClick={() => playSong(queue, i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isCurrent ? 'rgba(0,212,255,0.08)' : 'transparent', borderLeft: isCurrent ? '3px solid #00d4ff' : '3px solid transparent', transition: 'all 0.2s', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                        {s.cover_url
                          ? <img src={s.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(168,85,247,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎵</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: isCurrent ? '#00d4ff' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{s.artist}</p>
                      </div>
                      {isCurrent && playing && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 20, flexShrink: 0 }}>
                          {[0, 1, 2].map(j => (
                            <div key={j} style={{ width: 3, background: '#00d4ff', borderRadius: 2, animation: `bars 0.7s ease-in-out infinite ${j * 0.18}s`, height: 8 }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* Lyrics panel */}
          {panel === 'lyrics' && (
            <div ref={lyricsContainer}
              style={{ overflowY: 'auto', flex: 1, padding: '12px 0', display: 'flex', flexDirection: 'column' }}>

              {/* Top fade */}
              <div style={{ position: 'sticky', top: 0, height: 40, background: 'linear-gradient(to bottom, rgba(12,14,26,0.95) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 2, marginBottom: -40, flexShrink: 0 }} />

              {loadingLyrics
                ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted2)' }}>Loading lyrics...</div>
                : lyrics.length === 0
                  ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted2)' }}>No lyrics found</div>
                  : lyrics.map((line, i) => {
                    const isActive = i === activeIdx
                    const isPast = i < activeIdx
                    return (
                      <div key={i}
                        ref={el => lineRefs.current[i] = el}
                        onClick={() => seekTo(line.t)}
                        style={{
                          padding: '8px 20px',
                          cursor: 'pointer',
                          borderRadius: 10,
                          margin: '1px 8px',
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(0,212,255,0.08)' : 'transparent' }}
                      >
                        <span style={{
                          fontFamily: isActive ? 'Syne, sans-serif' : 'DM Sans, sans-serif',
                          fontSize: isActive ? 16 : 13,
                          fontWeight: isActive ? 800 : 400,
                          color: isActive ? '#fff' : isPast ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.18)',
                          lineHeight: 1.65,
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'block',
                          textShadow: isActive ? '0 0 24px rgba(0,212,255,0.5)' : 'none',
                        }}>
                          {line.text}
                        </span>
                        {isActive && (
                          <div style={{ marginTop: 5, height: 2, width: 28, borderRadius: 99, background: 'linear-gradient(90deg, #00d4ff, #a855f7)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
                        )}
                      </div>
                    )
                  })
              }

              {/* Bottom fade */}
              <div style={{ position: 'sticky', bottom: 0, height: 40, background: 'linear-gradient(to top, rgba(12,14,26,0.95) 0%, transparent 100%)', pointerEvents: 'none', flexShrink: 0 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}