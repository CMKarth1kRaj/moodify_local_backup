import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '../services/pocketbase'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useLikes } from '../hooks/useLikes'
import { getGeminiProactivePlaylist, searchYouTube } from '../services/ai'

const moodMeta = {
  Happy:   { color: '#fbbf24', emoji: '😊', bg: 'rgba(251,191,36,0.08)' },
  Chill:   { color: '#34d399', emoji: '😌', bg: 'rgba(52,211,153,0.08)' },
  Sad:     { color: '#60a5fa', emoji: '😢', bg: 'rgba(96,165,250,0.08)' },
  Workout: { color: '#f97316', emoji: '💪', bg: 'rgba(249,115,22,0.08)' },
  Focus:   { color: '#a855f7', emoji: '🧠', bg: 'rgba(168,85,247,0.08)' },
  Party:   { color: '#ff6b6b', emoji: '🎉', bg: 'rgba(255,107,107,0.08)' },
  Romance: { color: '#f472b6', emoji: '💖', bg: 'rgba(244,114,182,0.08)' },
  Hype:    { color: '#00d4ff', emoji: '🔥', bg: 'rgba(0,212,255,0.08)' },
}

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function Playlist() {
  const [params] = useSearchParams()
  const mood = params.get('mood') || 'Happy'
  const navigate = useNavigate()
  const meta = moodMeta[mood] || moodMeta.Happy
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredSong, setHoveredSong] = useState(null)
  const { playSong, currentSong, playing } = usePlayer()
  const { user } = useAuth()
  const { isLiked, toggleLike } = useLikes(user?.id)
  const [userPlaylists, setUserPlaylists] = useState([])
const [showAddTo, setShowAddTo] = useState(null) // song id
const [addingTo, setAddingTo] = useState(null)

useEffect(() => {
  if (!user?.id) return
  pb.collection('Playlist').getFullList({
    filter: `user = "${user.id}"`,
    requestKey: 'fetch-user-playlists',
  }).then(setUserPlaylists).catch(() => {})
}, [user?.id])

const addToPlaylist = async (playlistId, songId) => {
  setAddingTo(playlistId)
  try {
    const playlist = await pb.collection('Playlist').getOne(playlistId, { requestKey: 'get-playlist-' + playlistId })
    const existing = playlist.songs || []
    if (existing.includes(songId)) { setShowAddTo(null); return }
    await pb.collection('Playlist').update(playlistId, { songs: [...existing, songId] })
    setShowAddTo(null)
  } catch (err) {
    console.error('addToPlaylist error:', err)
  } finally {
    setAddingTo(null)
  }
}

useEffect(() => {
  const handler = () => setShowAddTo(null)
  document.addEventListener('click', handler)
  return () => document.removeEventListener('click', handler)
}, [])

  useEffect(() => {
    const fetchAISongs = async () => {
      try {
        setLoading(true)
        
        // 1. Get suggestions for this specific mood
        const suggestions = await getGeminiProactivePlaylist(mood)
        
        // 2. Resolve YouTube URLs
        const resolved = []
        for (const s of suggestions) {
          const ytSong = await searchYouTube(`${s.title} ${s.artist}`)
          if (ytSong) {
            resolved.push({
              ...ytSong,
              id: ytSong.id, // Use YouTube ID as the key
              album: "AI Collection",
              duration: 210, // Default duration if not available
              mood: mood
            })
          }
        }
        setSongs(resolved)
      } catch (err) {
        console.error("AI Playlist Error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAISongs()
  }, [mood])

  const handlePlay = (i) => {
    playSong(songs, i)
    navigate('/player')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* Mood hero banner */}
      <div style={{ background: meta.bg, borderBottom: `1px solid ${meta.color}22`, padding: '32px 24px 28px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: `${meta.color}22`, border: `2px solid ${meta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
              {meta.emoji}
            </div>
            <div>
              <p style={{ fontSize: 12, color: meta.color, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>AI Generated Playlist</p>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>{mood} Vibes</h1>
              <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 4 }}>{songs.length} songs • curated just for you</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              <button onClick={() => handlePlay(0)}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: meta.color, color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                ▶ Play All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Songs list */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 0' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>
            Loading songs...
          </div>
        )}

        {!loading && songs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🎵</p>
            <p>No songs found for this mood yet.</p>
          </div>
        )}

        {!loading && songs.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px 48px 48px 60px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
  <span style={{ fontSize: 12 }}>#</span>
  <span style={{ fontSize: 12 }}>TITLE</span>
  <span style={{ fontSize: 12 }}>ALBUM</span>
  <span style={{ fontSize: 12 }}>♥</span>
  <span style={{ fontSize: 12 }}>+</span>
  <span style={{ fontSize: 12, textAlign: 'right' }}>TIME</span>
</div>

            {songs.map((song, i) => {
              const isActive = currentSong?.id === song.id
              const liked = isLiked(song.id)
              const isHovered = hoveredSong === i

              return (
                <div key={song.id}
                  onMouseEnter={() => setHoveredSong(i)}
                  onMouseLeave={() => setHoveredSong(null)}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr 160px 48px 48px 60px', gap: 16,
                    padding: '14px 20px',
                    borderBottom: i < songs.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s', alignItems: 'center',
                    background: isActive ? `${meta.color}0a` : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                    borderLeft: isActive ? `3px solid ${meta.color}` : '3px solid transparent'
                  }}>

                  {/* Track number / play icon */}
                  <span
                    onClick={() => handlePlay(i)}
                    style={{ color: isActive ? meta.color : 'var(--muted)', fontSize: 13 }}>
                    {isActive && playing ? '▶' : isHovered ? '▶' : i + 1}
                  </span>

                  {/* Title + artist */}
                  <div onClick={() => handlePlay(i)}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: isActive ? meta.color : 'var(--text)', marginBottom: 2 }}>{song.title}</p>
                    <p style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.artist}</p>
                  </div>

                  {/* Album */}
                  <span onClick={() => handlePlay(i)} style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.album}</span>

                  {/* Heart button */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleLike(song.id) }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                      color: liked ? '#f472b6' : 'rgba(255,255,255,0.2)',
                      transition: 'all 0.2s', transform: liked ? 'scale(1.15)' : 'scale(1)',
                      padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={e => { if (!liked) e.currentTarget.style.color = 'rgba(244,114,182,0.6)' }}
                    onMouseLeave={e => { if (!liked) e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}>
                    {liked ? '♥' : '♡'}
                  </button>

                  <div style={{ position: 'relative' }}>
  <button
    onClick={e => { e.stopPropagation(); setShowAddTo(showAddTo === song.id ? null : song.id) }}
    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'rgba(255,255,255,0.2)', transition: 'all 0.2s', padding: 0 }}
    onMouseEnter={e => e.currentTarget.style.color = '#00d4ff'}
    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
    ＋
  </button>

  {showAddTo === song.id && (
    <div style={{ position: 'absolute', right: 0, top: 28, background: '#0e1021', border: '1px solid var(--border)', borderRadius: 14, padding: 8, zIndex: 100, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: 11, color: 'var(--muted2)', padding: '4px 8px 8px', fontWeight: 600 }}>ADD TO PLAYLIST</p>
      {userPlaylists.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted2)', padding: '8px', textAlign: 'center' }}>No playlists yet</p>
      )}
      {userPlaylists.map(pl => {
        const pm = moodMeta[pl.mood] || moodMeta.Chill
        return (
          <button key={pl.id} onClick={() => addToPlaylist(pl.id, song.id)}
            disabled={addingTo === pl.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, transition: 'background 0.15s', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 16 }}>{pm.emoji}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
          </button>
        )
      })}
    </div>
  )}
</div>

                  {/* Duration */}
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

export default Playlist