import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useLikes } from '../hooks/useLikes'

const moodMeta = {
  Happy:   { color: '#fbbf24', emoji: '😊' },
  Chill:   { color: '#34d399', emoji: '😌' },
  Sad:     { color: '#60a5fa', emoji: '😢' },
  Workout: { color: '#f97316', emoji: '💪' },
  Focus:   { color: '#a855f7', emoji: '🧠' },
  Party:   { color: '#ff6b6b', emoji: '🎉' },
  Romance: { color: '#f472b6', emoji: '💖' },
  Hype:    { color: '#00d4ff', emoji: '🔥' },
}

const moods = Object.keys(moodMeta)

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Search() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, playing } = usePlayer()
  const { isLiked, toggleLike } = useLikes(user?.id)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [hoveredSong, setHoveredSong] = useState(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setSearched(true)
      try {
        const result = await pb.collection('songs').getFullList({
          filter: `title ~ "${query}" || artist ~ "${query}" || album ~ "${query}" || mood ~ "${query}"`,
          requestKey: 'search-' + query,
        })
        setResults(result)
      } catch (err) {
        console.error('search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  const handlePlay = (i) => {
    playSong(results, i)
    navigate('/player')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: 'rgba(6,7,15,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '20px 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            ← Back
          </button>

          {/* Big search input */}
          <div style={{ flex: 1, position: 'relative', maxWidth: 600 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, opacity: 0.5 }}>🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search songs, artists, albums, moods..."
              style={{
                width: '100%', padding: '14px 20px 14px 48px', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)',
                color: 'var(--text)', fontSize: 16, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#00d4ff'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            {query && (
              <button onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 18 }}>
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 0' }}>

        {/* Default state — browse by mood */}
        {!query && (
          <>
            <h2 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Browse by mood</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {moods.map(mood => {
                const meta = moodMeta[mood]
                return (
                  <div key={mood}
                    onClick={() => navigate(`/playlist?mood=${mood}`)}
                    style={{
                      borderRadius: 16, padding: '28px 20px', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}08)`,
                      border: `1px solid ${meta.color}33`, transition: 'all 0.25s ease',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${meta.color}22` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                    <span style={{ fontSize: 32 }}>{meta.emoji}</span>
                    <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: meta.color }}>{mood}</p>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 24, marginBottom: 12 }}>🔍</p>
            <p>Searching...</p>
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>😕</p>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No results for "{query}"</p>
            <p style={{ fontSize: 14 }}>Try searching for a different song, artist or mood</p>
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 20 }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for <span style={{ color: '#fff', fontWeight: 600 }}>"{query}"</span>
            </p>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 48px 60px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
                <span style={{ fontSize: 12 }}>#</span>
                <span style={{ fontSize: 12 }}>TITLE</span>
                <span style={{ fontSize: 12 }}>MOOD</span>
                <span style={{ fontSize: 12 }}>♥</span>
                <span style={{ fontSize: 12, textAlign: 'right' }}>TIME</span>
              </div>

              {results.map((song, i) => {
                const isActive = currentSong?.id === song.id
                const liked = isLiked(song.id)
                const isHovered = hoveredSong === i
                const meta = moodMeta[song.mood] || { color: '#00d4ff', emoji: '🎵' }

                return (
                  <div key={song.id}
                    onMouseEnter={() => setHoveredSong(i)}
                    onMouseLeave={() => setHoveredSong(null)}
                    style={{
                      display: 'grid', gridTemplateColumns: '40px 1fr 120px 48px 60px', gap: 16,
                      padding: '14px 20px',
                      borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer', transition: 'background 0.15s', alignItems: 'center',
                      background: isActive ? 'rgba(0,212,255,0.06)' : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                      borderLeft: isActive ? '3px solid #00d4ff' : '3px solid transparent',
                    }}>

                    {/* Number / play */}
                    <span onClick={() => handlePlay(i)} style={{ color: isActive ? '#00d4ff' : 'var(--muted)', fontSize: 13 }}>
                      {isActive && playing ? '▶' : isHovered ? '▶' : i + 1}
                    </span>

                    {/* Title + artist + cover */}
                    <div onClick={() => handlePlay(i)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        {song.cover_url
                          ? <img src={song.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : meta.emoji}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 15, color: isActive ? '#00d4ff' : 'var(--text)', marginBottom: 2 }}>{song.title}</p>
                        <p style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.artist}</p>
                      </div>
                    </div>

                    {/* Mood badge */}
                    <span onClick={() => navigate(`/playlist?mood=${song.mood}`)}
                      style={{ fontSize: 12, color: meta.color, background: `${meta.color}15`, padding: '4px 10px', borderRadius: 99, border: `1px solid ${meta.color}22`, width: 'fit-content', cursor: 'pointer' }}>
                      {meta.emoji} {song.mood}
                    </span>

                    {/* Heart */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleLike(song.id) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: liked ? '#f472b6' : 'rgba(255,255,255,0.2)', transition: 'all 0.2s', padding: 0 }}
                      onMouseEnter={e => { if (!liked) e.currentTarget.style.color = 'rgba(244,114,182,0.6)' }}
                      onMouseLeave={e => { if (!liked) e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}>
                      {liked ? '♥' : '♡'}
                    </button>

                    {/* Duration */}
                    <span onClick={() => handlePlay(i)} style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'right' }}>{fmt(song.duration)}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}