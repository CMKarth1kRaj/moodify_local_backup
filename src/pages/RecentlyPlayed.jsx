import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import Sidebar from '../components/Sidebar'
import { Play, Clock, Heart, History } from 'lucide-react'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function RecentlyPlayed() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, isLiked, toggleLike } = usePlayer()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) fetchHistory()
  }, [user?.id])

  const fetchHistory = async () => {
    try {
      const records = await pb.collection('history').getFullList({
        filter: `user = "${user.id}"`,
        sort: '-created',
        expand: 'song',
      })
      // Extract unique songs to avoid duplicates in the view
      const uniqueSongs = []
      const seen = new Set()
      for (const r of records) {
        if (r.expand?.song && !seen.has(r.expand.song.id)) {
          uniqueSongs.push(r.expand.song)
          seen.add(r.expand.song.id)
        }
      }
      setHistory(uniqueSongs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            <div className="hero-card indigo">
              <div className="hero-tag">Your Activity</div>
              <h1 className="hero-title">Recently Played</h1>
              <p className="hero-desc">The songs you've been listening to lately. Jump back in.</p>
              {history.length > 0 && (
                <button className="btn-primary" onClick={() => playSong(history, 0)}>
                  <Play size={18} fill="currentColor" /> Play All
                </button>
              )}
            </div>

            <div className="section-header">
              <h2 className="section-title">Listening History</h2>
            </div>

            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Fetching your history...</div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                 <History size={64} className="text-muted" style={{ marginBottom: 24, opacity: 0.2 }} />
                 <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>No recent activity</h2>
                 <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Start playing some music to see your history here.</p>
                 <button className="btn-primary" onClick={() => navigate('/dashboard')}>Discover Music</button>
              </div>
            ) : (
              <div className="song-list">
                {history.map((song, i) => {
                  const isActive = currentSong?.id === song.id
                  return (
                    <div key={`${song.id}-${i}`} className={`song-row ${isActive ? 'active' : ''}`} onClick={() => playSong(history, i)}>
                      <img src={song.cover_url} className="song-cover" alt="cover" />
                      <div className="song-info">
                        <p className="song-title">{song.title}</p>
                        <p className="song-artist">{song.artist}</p>
                      </div>
                      <span className="song-duration" style={{ marginRight: 16 }}>{fmt(song.duration)}</span>
                      <button 
                        className="song-action"
                        onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                        style={{ color: isLiked(song.id) ? 'var(--accent)' : 'inherit' }}
                      >
                        <Heart size={18} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </section>
      </main>
    </>
  )
}
