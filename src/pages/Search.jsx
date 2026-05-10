import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import pb from '../services/pocketbase'
import Sidebar from '../components/Sidebar'
import { 
  Search as SearchIcon, 
  Music, 
  Heart, 
  TrendingUp,
  Smile,
  Coffee,
  CloudRain,
  Dumbbell,
  Brain,
  PartyPopper,
  Flame,
  HeartIcon
} from 'lucide-react'

const MOODS = [
  { name: 'Happy', icon: Smile, color: '#fbbf24' },
  { name: 'Chill', icon: Coffee, color: '#34d399' },
  { name: 'Sad', icon: CloudRain, color: '#60a5fa' },
  { name: 'Workout', icon: Dumbbell, color: '#f97316' },
  { name: 'Focus', icon: Brain, color: '#a855f7' },
  { name: 'Party', icon: PartyPopper, color: '#ff6b6b' },
  { name: 'Romance', icon: HeartIcon, color: '#ec4899' },
  { name: 'Hype', icon: Flame, color: '#ef4444' },
]

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Search() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, currentSong, queue, isLiked, toggleLike } = usePlayer()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&maxResults=20&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.items) {
          const songs = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            cover_url: item.snippet.thumbnails.high.url,
            audio_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            artist: item.snippet.channelTitle,
            duration: 210
          }))
          setResults(songs)
        }
      } catch (err) {
        console.error('search error:', err)
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            {/* Search Topbar */}
            <div className="topbar" style={{ marginBottom: 32 }}>
              <div className="search-container" style={{ maxWidth: '100%' }}>
                <SearchIcon className="search-icon" size={24} />
                <input 
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="What do you want to listen to?" 
                  className="search-input"
                  style={{ fontSize: 18, padding: '16px 20px 16px 60px' }}
                />
              </div>
            </div>

            {/* Results or Moods */}
            {!query ? (
              <>
                <div className="section-header">
                  <h2 className="section-title">Browse by Mood</h2>
                </div>
                <div className="mood-grid">
                  {MOODS.map(mood => {
                    const Icon = mood.icon
                    return (
                      <div 
                        key={mood.name} 
                        className="mood-card"
                        onClick={() => navigate(`/playlist?mood=${mood.name}`)}
                      >
                        <Icon size={40} color={mood.color} />
                        <p className="mood-name">{mood.name}</p>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div>
                <div className="section-header">
                  <h2 className="section-title">Top Results</h2>
                </div>
                {loading ? (
                  <div style={{ padding: '40px 0', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SearchIcon size={20} className="text-muted" style={{ animation: 'pulse 1.5s infinite' }} />
                    <p>Searching for "{query}"...</p>
                  </div>
                ) : (
                  <div className="song-list">
                    {results.map((song, i) => (
                      <div 
                        key={song.id} 
                        className={`song-row ${currentSong?.id === song.id ? 'active' : ''}`}
                        onClick={() => playSong(results, i)}
                      >
                        <img src={song.cover_url} className="song-cover" alt="thumb" />
                        <div className="song-info">
                          <p className="song-title">{song.title}</p>
                          <p className="song-artist">{song.artist}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                           <button 
                             className="song-action"
                             onClick={(e) => { e.stopPropagation(); toggleLike(song.id); }}
                             style={{ color: isLiked(song.id) ? 'var(--accent)' : 'inherit' }}
                           >
                             <Heart size={18} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                           </button>
                           <span className="song-duration" style={{ width: 40, textAlign: 'right' }}>{fmt(song.duration)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </section>

        {/* Right View */}
        <aside className="right-view">
          <div className="section-header">
            <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
            <h2 className="section-title" style={{ fontSize: 18, marginLeft: 8 }}>Trending</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Discover what others are listening to right now. 
            Search results are powered by real-time YouTube data.
          </p>
          <div style={{ marginTop: 24, padding: 20, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
             <Music size={24} className="text-muted" style={{ marginBottom: 12, opacity: 0.5 }} />
             <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tip: Try searching for a mood like "Focus" or "Hype".</p>
          </div>
        </aside>
      </main>
    </>
  )
}