import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import Sidebar from '../components/Sidebar'
import { Play, Music, Plus, Trash2, LayoutGrid } from 'lucide-react'

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
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [playlistSongs, setPlaylistSongs] = useState([])
  const [loadingSongs, setLoadingSongs] = useState(false)

  useEffect(() => {
    fetchPlaylists()
  }, [user?.id])

  const fetchPlaylists = async () => {
    if (!user?.id) return
    try {
      const { databases, DB_ID, COLLECTIONS } = await import('../services/appwrite')
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.PLAYLISTS, [
        Query.equal('user', user.id),
        Query.orderDesc('$createdAt'),
      ])
      setPlaylists(result.documents)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createPlaylist = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { databases, DB_ID, COLLECTIONS, ID } = await import('../services/appwrite')
      const playlist = await databases.createDocument(DB_ID, COLLECTIONS.PLAYLISTS, ID.unique(), {
        name: newName.trim(),
        mood: newMood,
        user: user.id,
        songs: [],
      })
      setPlaylists(prev => [playlist, ...prev])
      setShowCreate(false)
      setNewName('')
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const deletePlaylist = async (id) => {
    if (!confirm('Delete this playlist?')) return
    try {
      const { databases, DB_ID, COLLECTIONS } = await import('../services/appwrite')
      await databases.deleteDocument(DB_ID, COLLECTIONS.PLAYLISTS, id)
      setPlaylists(prev => prev.filter(p => p.$id !== id))
      setActivePlaylist(null)
    } catch (err) {
      console.error(err)
    }
  }

  const openPlaylist = async (playlist) => {
    setActivePlaylist(playlist)
    setLoadingSongs(true)
    try {
      const { databases, DB_ID, COLLECTIONS } = await import('../services/appwrite')
      
      // Manual expand for songs
      const resolvedSongs = await Promise.all(playlist.songs.map(async (sid) => {
        try {
          return await databases.getDocument(DB_ID, COLLECTIONS.SONGS, sid)
        } catch (e) { return null }
      }))
      setPlaylistSongs(resolvedSongs.filter(Boolean))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSongs(false)
    }
  }

  if (activePlaylist) {
    const m = moodMeta[activePlaylist.mood] || moodMeta.Chill
    return (
      <>
        <Sidebar />
        <main className="main-content">
          <section className="center-view">
            <div className="center-container">
              <div className="hero-card indigo">
                 <div className="hero-tag">{activePlaylist.mood}</div>
                 <h1 className="hero-title">{activePlaylist.name}</h1>
                 <p className="hero-desc">{playlistSongs.length} tracks in this collection.</p>
                 <div style={{ display: 'flex', gap: 12 }}>
                   {playlistSongs.length > 0 && (
                     <button className="btn-primary" onClick={() => playSong(playlistSongs, 0)}>
                       <Play size={18} fill="currentColor" /> Play All
                     </button>
                   )}
                   <button className="btn-primary" style={{ background: 'rgba(255,107,107,0.2)', color: '#ff6b6b' }} onClick={() => deletePlaylist(activePlaylist.$id)}>
                     <Trash2 size={18} /> Delete
                   </button>
                   <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }} onClick={() => setActivePlaylist(null)}>
                     Back to Library
                   </button>
                 </div>
              </div>

              <div className="section-header">
                <h2 className="section-title">Playlist Tracks</h2>
              </div>

              {loadingSongs ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading tracks...</div>
              ) : playlistSongs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface)', borderRadius: 24, border: '1px dashed var(--border)' }}>
                   <p style={{ color: 'var(--text-secondary)' }}>This playlist is empty. Add some songs!</p>
                </div>
              ) : (
                <div className="song-list">
                  {playlistSongs.map((song, i) => (
                    <div key={song.$id} className={`song-row ${currentSong?.$id === song.$id ? 'active' : ''}`} onClick={() => playSong(playlistSongs, i)}>
                      <img src={song.cover_url} className="song-cover" alt="cover" />
                      <div className="song-info">
                        <p className="song-title">{song.title}</p>
                        <p className="song-artist">{song.artist}</p>
                      </div>
                      <span className="song-duration">{fmt(song.duration)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            <div className="page-header">
              <h1 className="page-title">📚 Your Library</h1>
              <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ background: 'var(--accent)', color: 'white' }}>
                <Plus size={18} /> New Playlist
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading library...</div>
            ) : playlists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                 <LayoutGrid size={64} className="text-muted" style={{ marginBottom: 24, opacity: 0.2 }} />
                 <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Your library is empty</h2>
                 <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Start by creating a new playlist to organize your music.</p>
                 <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ background: 'var(--accent)', color: 'white' }}>Create First Playlist</button>
              </div>
            ) : (
              <div className="playlist-grid">
                {playlists.map(p => {
                  const m = moodMeta[p.mood] || moodMeta.Chill
                  return (
                    <div key={p.$id} className="item-card" onClick={() => openPlaylist(p)}>
                      <div className="item-card-cover" style={{ background: `linear-gradient(135deg, ${m.color}33, ${m.color}08)` }}>
                        {m.emoji}
                      </div>
                      <div className="item-card-content">
                        <h3 className="item-card-title">{p.name}</h3>
                        <p className="item-card-subtitle">{p.songs?.length || 0} songs • {p.mood}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </section>
      </main>

      {showCreate && (
        <div className="sidebar-overlay show" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setShowCreate(false)}>
          <div className="auth-card" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="section-title" style={{ marginBottom: 8 }}>New Playlist</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Create a space for your favorite tracks.</p>
            
            <div className="form-group">
              <label className="form-label">NAME</label>
              <input autoFocus className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="My Awesome Playlist" />
            </div>

            <div className="form-group">
              <label className="form-label">MOOD</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                 {moods.map(m => (
                   <button key={m} onClick={() => setNewMood(m)} 
                     style={{ 
                       padding: '10px 4px', borderRadius: 12, border: '1px solid var(--border)',
                       background: newMood === m ? 'var(--accent-light)' : 'transparent',
                       color: newMood === m ? 'var(--accent)' : 'inherit',
                       fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                     }}>
                     <span style={{ fontSize: 18 }}>{moodMeta[m].emoji}</span>
                     {m}
                   </button>
                 ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
               <button className="auth-btn" style={{ background: 'var(--surface)', color: 'var(--text-primary)' }} onClick={() => setShowCreate(false)}>Cancel</button>
               <button className="auth-btn" onClick={createPlaylist} disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}