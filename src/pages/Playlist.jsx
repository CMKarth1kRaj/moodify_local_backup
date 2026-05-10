import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { getGeminiProactivePlaylist, getMoodPlaylist, searchYouTube } from '../services/ai'
import Sidebar from '../components/Sidebar'
import { 
  Play, 
  Heart, 
  Clock, 
  Music,
  Sparkles,
  Smile,
  Coffee,
  CloudRain,
  Dumbbell,
  Brain,
  PartyPopper
} from 'lucide-react'

const MOOD_META = {
  Happy:   { icon: Smile, color: '#fbbf24', heroClass: 'hero-card yellow' },
  Chill:   { icon: Coffee, color: '#34d399', heroClass: 'hero-card teal' },
  Sad:     { icon: CloudRain, color: '#60a5fa', heroClass: 'hero-card blue' },
  Workout: { icon: Dumbbell, color: '#f97316', heroClass: 'hero-card orange' },
  Focus:   { icon: Brain, color: '#a855f7', heroClass: 'hero-card purple' },
  Party:   { icon: PartyPopper, color: '#ff6b6b', heroClass: 'hero-card pink' },
}

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Playlist() {
  const [params] = useSearchParams()
  const mood = params.get('mood') || 'Happy'
  const navigate = useNavigate()
  const meta = MOOD_META[mood] || MOOD_META.Happy
  const MoodIcon = meta.icon
  
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [playlistId, setPlaylistId] = useState(null)
  const [dynamicTitle, setDynamicTitle] = useState(`${mood} Vibes`)
  const [dynamicCover, setDynamicCover] = useState('')
  const { playSong, currentSong, isLiked, toggleLike } = usePlayer()
  const { user } = useAuth()

  const fetchAISongs = async (forceRegen = false) => {
    if (!user?.id) return
    try {
      setLoading(true)
      
      const pb = await import('../services/pocketbase').then(m => m.default)
      
      if (!forceRegen) {
        try {
          const existing = await pb.collection('Playlist').getFirstListItem(`user='${user.id}' && mood='${mood}'`, { expand: 'songs' })
          if (existing) {
            setPlaylistId(existing.id)
            setSongs(existing.expand?.songs || [])
            setDynamicTitle(existing.name || `${mood} Vibes`)
            setDynamicCover(existing.cover_url || '')
            setLoading(false)
            return
          }
        } catch (e) {}
      }

      let context = { likedArtists: [], recentSongs: [] }
      try {
        const hist = await pb.collection('history').getList(1, 10, { filter: `user="${user.id}"`, expand: 'song', sort: '-created' })
        const likes = await pb.collection('likes').getList(1, 20, { filter: `user="${user.id}"`, expand: 'song' })
        
        const recent = hist.items.map(h => ({ title: h.expand?.song?.title, artist: h.expand?.song?.artist })).filter(s => s.title)
        const artists = likes.items.map(l => l.expand?.song?.artist).filter(Boolean)
        const uniqueArtists = [...new Set(artists)]
        
        context = { likedArtists: uniqueArtists, recentSongs: recent }
      } catch(e) {}

      const aiResult = await getMoodPlaylist(mood, context)
      const suggestions = aiResult?.songs || []
      const newTitle = aiResult?.playlistTitle || `${mood} Vibes`
      const coverSearch = aiResult?.coverSearchTerm || mood
      const newCover = `https://source.unsplash.com/featured/800x800/?${encodeURIComponent(coverSearch)}`

      setDynamicTitle(newTitle)
      setDynamicCover(newCover)

      const resolvedIds = []
      const resolvedSongs = []

      for (const s of suggestions) {
        const ytSong = await searchYouTube(`${s.title} ${s.artist}`)
        if (ytSong) {
          let pbSong
          try {
            pbSong = await pb.collection('songs').getFirstListItem(`audio_url='${ytSong.audio_url}'`)
          } catch (e) {
            pbSong = await pb.collection('songs').create({
              title: ytSong.title,
              artist: ytSong.artist,
              cover_url: ytSong.cover_url,
              audio_url: ytSong.audio_url,
              mood: mood
            })
          }
          resolvedIds.push(pbSong.id)
          resolvedSongs.push(pbSong)
        }
      }

      if (playlistId) {
        await pb.collection('Playlist').update(playlistId, { songs: resolvedIds, name: newTitle, cover_url: newCover })
      } else {
        const newPlaylist = await pb.collection('Playlist').create({
          name: newTitle,
          mood: mood,
          user: user.id,
          songs: resolvedIds,
          cover_url: newCover
        })
        setPlaylistId(newPlaylist.id)
      }

      setSongs(resolvedSongs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAISongs()
  }, [mood, user?.id])

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container">
            
            {/* Hero */}
            <div className={`hero-card ${mood.toLowerCase() === 'happy' ? 'yellow' : mood.toLowerCase() === 'chill' ? 'teal' : mood.toLowerCase() === 'sad' ? 'blue' : mood.toLowerCase() === 'workout' ? 'orange' : mood.toLowerCase() === 'focus' ? 'purple' : 'pink'}`} style={dynamicCover ? { backgroundImage: `url(${dynamicCover})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' } : {}}>
              {dynamicCover && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-tag" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                   <Sparkles size={14} fill="currentColor" /> AI Curated
                </div>
                <h1 className="hero-title">{dynamicTitle}</h1>
                <p className="hero-desc" style={{ opacity: 0.9 }}>Enjoy a custom selection of tracks generated just for you based on: "{mood}".</p>
                
                <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                   {songs.length > 0 && (
                     <button className="btn-primary" style={{ background: 'white', color: 'black' }} onClick={() => playSong(songs, 0)}>
                       <Play size={18} fill="currentColor" /> Play Mix
                     </button>
                   )}
                   <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => fetchAISongs(true)}>
                      <Sparkles size={18} /> Refresh AI
                   </button>
                </div>
              </div>
            </div>

            <div className="section-header">
              <h2 className="section-title">Tracks</h2>
            </div>

            {loading ? (
              <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Sparkles size={48} className="text-muted" style={{ marginBottom: 16, animation: 'pulse 2s infinite' }} />
                <p style={{ fontSize: 18, fontWeight: 700 }}>Gemini is curating your mix...</p>
              </div>
            ) : (
              <div className="song-list">
                {songs.map((song, i) => (
                  <div key={song.id} className={`song-row ${currentSong?.id === song.id ? 'active' : ''}`} onClick={() => playSong(songs, i)}>
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
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}