import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

// Timed lyrics (each line has a timestamp in seconds)
const lyricsData = {
  1: {
    title: 'Blinding Lights', artist: 'The Weeknd',
    color: '#00d4ff', emoji: '🌃',
    lines: [
      { t: 0,   text: '♪ Intro' },
      { t: 5,   text: "I've been tryna call" },
      { t: 9,   text: "I've been on my own for long enough" },
      { t: 13,  text: "Maybe you can show me how to love, maybe" },
      { t: 18,  text: "I'm going through withdrawals" },
      { t: 22,  text: "You don't even have to do too much" },
      { t: 26,  text: "You can turn me on with just a touch, baby" },
      { t: 31,  text: "I look around and" },
      { t: 34,  text: "Sin City's cold and empty" },
      { t: 38,  text: "No one's around to judge me" },
      { t: 42,  text: "I can't see clearly when you're gone" },
      { t: 47,  text: "I said, ooh, I'm blinded by the lights" },
      { t: 52,  text: "No, I can't sleep until I feel your touch" },
      { t: 57,  text: "I said, ooh, I'm drowning in the night" },
      { t: 62,  text: "Oh, when I'm like this, you're the one I trust" },
      { t: 68,  text: "Hey, hey, hey" },
      { t: 72,  text: "I'm running out of time" },
      { t: 76,  text: "'Cause I can see the sun light up the sky" },
      { t: 80,  text: "So I hit the road in overdrive, baby" },
      { t: 85,  text: "Oh, the city's cold and empty" },
      { t: 89,  text: "No one's around to judge me" },
      { t: 93,  text: "I can't see clearly when you're gone" },
      { t: 98,  text: "I said, ooh, I'm blinded by the lights" },
      { t: 103, text: "No, I can't sleep until I feel your touch" },
      { t: 108, text: "I said, ooh, I'm drowning in the night" },
      { t: 113, text: "Oh, when I'm like this, you're the one I trust" },
      { t: 120, text: "I'm just walking by to let you know" },
      { t: 124, text: "I'm gonna love you 'til my heart explodes" },
      { t: 128, text: "I'm just walking by to let you know" },
      { t: 132, text: "I'm gonna love you, baby, let it go" },
      { t: 137, text: "I said, ooh, I'm blinded by the lights" },
      { t: 142, text: "No, I can't sleep until I feel your touch" },
      { t: 147, text: "I said, ooh, I'm drowning in the night" },
      { t: 152, text: "Oh, when I'm like this, you're the one I trust" },
      { t: 158, text: "I said, ooh, I'm blinded by the lights" },
      { t: 163, text: "No, I can't sleep until I feel your touch" },
      { t: 168, text: "..." },
    ]
  }
}

function fmt(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Lyrics() {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const id        = parseInt(params.get('id') || '1')
  const data      = lyricsData[id] || lyricsData[1]

  const [progress, setProgress] = useState(0)
  const [playing,  setPlaying]  = useState(true)
  const intervalRef = useRef(null)
  const lyricsRef   = useRef(null)
  const lineRefs    = useRef([])

  const totalSecs = 202

  // Fake playback
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress(p => p >= totalSecs ? 0 : p + 1)
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [playing])

  // Find active line
  const activeIdx = data.lines.reduce((acc, line, i) => line.t <= progress ? i : acc, 0)

  // Auto-scroll to active line
  useEffect(() => {
    const el = lineRefs.current[activeIdx]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIdx])

  const pct = (progress / totalSecs) * 100

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Ambient backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 60% at 20% 30%, ${data.color}10 0%, transparent 65%)`, transition: 'all 1s' }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 40% 45% at 80% 70%, ${data.color}06 0%, transparent 65%)` }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top bar */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', background: 'rgba(6,7,15,0.6)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate(`/player?id=${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 16px', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>
          ← Player
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${data.color}30, ${data.color}10)`, border: `1px solid ${data.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            {data.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{data.title}</p>
            <p style={{ fontSize: 13, color: 'var(--muted2)' }}>{data.artist}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: data.color, animation: 'pulse-glow 2s infinite' }} />
          <span style={{ fontSize: 13, color: data.color, fontWeight: 600 }}>Synced</span>
        </div>
      </div>

      {/* Lyrics area */}
      <div ref={lyricsRef} style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 10, padding: '0 24px' }}>

        {/* Top fade */}
        <div style={{ position: 'sticky', top: 0, height: 80, background: `linear-gradient(to bottom, var(--bg) 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 2, marginBottom: -80 }} />

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 0 200px' }}>
          {data.lines.map((line, i) => {
            const isActive  = i === activeIdx
            const isPast    = i < activeIdx
            const isFuture  = i > activeIdx
            const isNear    = Math.abs(i - activeIdx) <= 1

            return (
              <div key={i}
                ref={el => lineRefs.current[i] = el}
                onClick={() => setProgress(line.t)}
                style={{
                  padding: '10px 0',
                  cursor: 'pointer',
                  transition: 'all 0.4s ease',
                  textAlign: 'center',
                }}>
                <span style={{
                  fontFamily: isActive ? 'Syne, sans-serif' : 'DM Sans, sans-serif',
                  fontSize: isActive ? 28 : isNear ? 20 : 17,
                  fontWeight: isActive ? 800 : isNear ? 600 : 400,
                  color: isActive
                    ? '#fff'
                    : isPast
                    ? `${data.color}80`
                    : 'rgba(255,255,255,0.18)',
                  letterSpacing: isActive ? '-0.5px' : 'normal',
                  lineHeight: 1.5,
                  transition: 'all 0.4s ease',
                  display: 'inline-block',
                  textShadow: isActive ? `0 0 40px ${data.color}60` : 'none',
                  // Karaoke highlight effect on active line
                  background: isActive
                    ? `linear-gradient(90deg, ${data.color} ${pct}%, rgba(255,255,255,0.85) ${pct}%)`
                    : 'none',
                  WebkitBackgroundClip: isActive ? 'text' : 'none',
                  WebkitTextFillColor: isActive ? 'transparent' : 'unset',
                }}>
                  {line.text}
                </span>

                {/* Active line glow pill */}
                {isActive && (
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ height: 3, width: 40, borderRadius: 99, background: `linear-gradient(90deg, ${data.color}, ${data.color}44)`, animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'fixed', bottom: 90, left: 0, right: 0, height: 100, background: `linear-gradient(to top, var(--bg) 0%, transparent 100%)`, pointerEvents: 'none', zIndex: 2 }} />
      </div>

      {/* ── Sticky player bar ── */}
      <div style={{ position: 'relative', zIndex: 20, background: 'rgba(8,9,18,0.95)', backdropFilter: 'blur(24px)', borderTop: '1px solid var(--border)', padding: '14px 32px' }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 32 }}>{fmt(progress)}</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99, cursor: 'pointer', position: 'relative' }}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setProgress(Math.round(((e.clientX - r.left) / r.width) * totalSecs)) }}>
            <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${data.color}, ${data.color}88)`, borderRadius: 99, position: 'relative', transition: 'width 0.5s linear' }}>
              <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, borderRadius: '50%', background: '#fff', boxShadow: `0 0 8px ${data.color}` }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>{fmt(totalSecs)}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <button style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 20 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}>⏮</button>

          <button onClick={() => setPlaying(p => !p)}
            style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${data.color}, ${data.color}88)`, color: '#000', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 24px ${data.color}44`, fontWeight: 900, transition: 'transform 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            {playing ? '⏸' : '▶'}
          </button>

          <button style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 20 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted2)'}>⏭</button>
        </div>
      </div>
    </div>
  )
}