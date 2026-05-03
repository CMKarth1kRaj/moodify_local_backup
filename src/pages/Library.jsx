import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

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

export default function Library() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, playing } = usePlayer()

  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMood, setNewMood] = useState('Chill')
  const [creating, setCreating] = useState(false)
  const [activePlaylist, setActivePlaylist] = useState(null) // null = grid view
  const [playlistSongs, setPlaylistSongs] = useState([])
  const [loadingSongs, setLoadingSongs] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchPlaylists()
  }, [user?.id])

  const fetchPlaylists = async () => {
    if (!user?.id) return
    try {
      const result = await pb.collection('Playlist').getFullList({
        filter: `user = "${user.id}"`,
        sort: '-created',
        requestKey: 'fetch-playlists',
      })
      setPlaylists(result)
    } catch (err) {
      console.error('fetchPlaylists error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createPlaylist = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const playlist = await pb.collection('Playlist').create({
        name: newName.trim(),
        mood: newMood,
        user: user.id,
        songs: [],
      })
      setPlaylists(prev => [playlist, ...prev])
      setShowCreate(false)
      setNewName('')
      setNewMood('Chill')
    } catch (err) {
      console.error('createPlaylist error:', err)
    } finally {
      setCreating(false)
    }
  }

  const deletePlaylist = async (id) => {
    try {
      await pb.collection('Playlist').delete(id)
      setPlaylists(prev => prev.filter(p => p.id !== id))
      setShowDeleteConfirm(null)
      if (activePlaylist?.id === id) setActivePlaylist(null)
    } catch (err) {
      console.error('deletePlaylist error:', err)
    }
  }

  const openPlaylist = async (playlist) => {
    setActivePlaylist(playlist)
    setLoadingSongs(true)
    try {
      if (!playlist.songs || playlist.songs.length === 0) {
        setPlaylistSongs([])
        return
      }
      const result = await pb.collection('Playlist').getOne(playlist.id, {
        expand: 'songs',
        requestKey: 'fetch-playlist-songs-' + playlist.id,
      })
      const songs = result.expand?.songs
      setPlaylistSongs(Array.isArray(songs) ? songs : songs ? [songs] : [])
    } catch (err) {
      console.error('openPlaylist error:', err)
    } finally {
      setLoadingSongs(false)
    }
  }

  const removeSongFromPlaylist = async (songId) => {
    try {
      const newSongs = activePlaylist.songs.filter(id => id !== songId)
      await pb.collection('Playlist').update(activePlaylist.id, { songs: newSongs })
      setActivePlaylist(prev => ({ ...prev, songs: newSongs }))
      setPlaylistSongs(prev => prev.filter(s => s.id !== songId))
    } catch (err) {
      console.error('removeSong error:', err)
    }
  }

  const meta = activePlaylist ? (moodMeta[activePlaylist.mood] || moodMeta.Chill) : null

  // ── Playlist detail view ──
  if (activePlaylist) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${meta.color}18, transparent)`, borderBottom: `1px solid ${meta.color}22`, padding: '32px 24px 28px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <button onClick={() => setActivePlaylist(null)}
              style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              ← Back to Library
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ width: 100, height: 100, borderRadius: 24, background: `linear-gradient(135deg, ${meta.color}44, ${meta.color}18)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, boxShadow: `0 16px 48px ${meta.color}30`, border: `2px solid ${meta.color}33` }}>
                {meta.emoji}
              </div>
              <div>
                <p style={{ fontSize: 12, color: meta.color, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Your Playlist</p>
                <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>{activePlaylist.name}</h1>
                <p style={{ color: 'var(--muted2)', fontSize: 14 }}>{playlistSongs.length} songs • {activePlaylist.mood}</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
                {playlistSongs.length > 0 && (
                  <button onClick={() => { playSong(playlistSongs, 0); navigate('/player') }}
                    style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: meta.color, color: '#000', fontWeight: 700, fontSize: 15, cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    ▶ Play All
                  </button>
                )}
                <button onClick={() => setShowDeleteConfirm(activePlaylist.id)}
                  style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.08)', color: '#ff6b6b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  🗑 Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Songs */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
          {loadingSongs && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>Loading songs...</div>}

          {!loadingSongs && playlistSongs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted2)' }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>🎵</p>
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>This playlist is empty</p>
              <p style={{ fontSize: 14, marginBottom: 24 }}>Go to a mood playlist and add songs here</p>
              <button onClick={() => navigate('/dashboard')}
                style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${meta.color}, #a855f7)`, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Browse Music →
              </button>
            </div>
          )}

          {!loadingSongs && playlistSongs.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px 60px 48px', gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
                <span style={{ fontSize: 12 }}>#</span>
                <span style={{ fontSize: 12 }}>TITLE</span>
                <span style={{ fontSize: 12 }}>ALBUM</span>
                <span style={{ fontSize: 12, textAlign: 'right' }}>TIME</span>
                <span style={{ fontSize: 12 }}></span>
              </div>

              {playlistSongs.map((song, i) => {
                const isActive = currentSong?.id === song.id
                return (
                  <div key={song.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '40px 1fr 160px 60px 48px', gap: 16,
                      padding: '14px 20px', borderBottom: i < playlistSongs.length - 1 ? '1px solid var(--border)' : 'none',
                      alignItems: 'center', transition: 'background 0.15s',
                      background: isActive ? `${meta.color}0a` : 'transparent',
                      borderLeft: isActive ? `3px solid ${meta.color}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>

                    <span onClick={() => { playSong(playlistSongs, i); navigate('/player') }}
                      style={{ color: isActive ? meta.color : 'var(--muted)', fontSize: 13, cursor: 'pointer' }}>
                      {isActive && playing ? '▶' : i + 1}
                    </span>
                    <div onClick={() => { playSong(playlistSongs, i); navigate('/player') }} style={{ cursor: 'pointer' }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: isActive ? meta.color : 'var(--text)', marginBottom: 2 }}>{song.title}</p>
                      <p style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.artist}</p>
                    </div>
                    <span style={{ color: 'var(--muted2)', fontSize: 13 }}>{song.album}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'right' }}>{fmt(song.duration)}</span>
                    <button onClick={() => removeSongFromPlaylist(song.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 16, transition: 'color 0.2s', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Delete confirm modal */}
        {showDeleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: '#0e1021', border: '1px solid var(--border)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 360, textAlign: 'center' }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>🗑</p>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Delete playlist?</h2>
              <p style={{ color: 'var(--muted2)', fontSize: 14, marginBottom: 24 }}>This can't be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDeleteConfirm(null)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => deletePlaylist(showDeleteConfirm)} style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: '#ff6b6b', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Library grid view ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ background: 'rgba(6,7,15,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', padding: '20px 32px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>
              ← Back
            </button>
            <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800 }}>📚 Your Library</h1>
          </div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,212,255,0.2)' }}>
            + New Playlist
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px' }}>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>Loading playlists...</div>}

        {!loading && playlists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📚</p>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No playlists yet</p>
            <p style={{ fontSize: 14, marginBottom: 24 }}>Create your first playlist to get started</p>
            <button onClick={() => setShowCreate(true)}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              + Create Playlist
            </button>
          </div>
        )}

        {!loading && playlists.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {playlists.map((playlist, i) => {
              const m = moodMeta[playlist.mood] || moodMeta.Chill
              return (
                <div key={playlist.id}
                  onClick={() => openPlaylist(playlist)}
                  style={{
                    borderRadius: 20, overflow: 'hidden', cursor: 'pointer',
                    border: `1px solid ${m.color}22`, transition: 'all 0.25s ease',
                    background: `linear-gradient(135deg, ${m.color}12, transparent)`,
                    animation: `fadeUp 0.4s ease ${i * 0.05}s both`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${m.color}22` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

                  {/* Cover art */}
                  <div style={{ height: 140, background: `linear-gradient(135deg, ${m.color}30, ${m.color}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)' }} />
                    {m.emoji}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px' }}>
                    <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 12, color: 'var(--muted2)' }}>{playlist.songs?.length || 0} songs</p>
                      <span style={{ fontSize: 11, color: m.color, background: `${m.color}15`, padding: '3px 8px', borderRadius: 99, border: `1px solid ${m.color}22` }}>{playlist.mood}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Create new card */}
            <div onClick={() => setShowCreate(true)}
              style={{
                borderRadius: 20, cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.02)', transition: 'all 0.25s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: 220, gap: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(168,85,247,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>+</div>
              <p style={{ color: 'var(--muted2)', fontSize: 14, fontWeight: 600 }}>New Playlist</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0e1021', border: '1px solid var(--border)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>New Playlist</h2>
            <p style={{ color: 'var(--muted2)', fontSize: 14, marginBottom: 24 }}>Give it a name and pick a mood</p>

            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              placeholder="Playlist name..."
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            {/* Mood picker */}
            <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 10, fontWeight: 600, letterSpacing: '0.5px' }}>MOOD</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
              {moods.map(mood => {
                const m = moodMeta[mood]
                const isSelected = newMood === mood
                return (
                  <button key={mood} onClick={() => setNewMood(mood)}
                    style={{
                      padding: '10px 8px', borderRadius: 10, border: `1px solid ${isSelected ? m.color : 'var(--border)'}`,
                      background: isSelected ? `${m.color}22` : 'transparent',
                      color: isSelected ? m.color : 'var(--muted2)', cursor: 'pointer',
                      fontSize: 12, fontWeight: isSelected ? 700 : 400, transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    {mood}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowCreate(false); setNewName(''); setNewMood('Chill') }}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>
                Cancel
              </button>
              <button onClick={createPlaylist} disabled={creating || !newName.trim()}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: creating || !newName.trim() ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}