import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'

function fmt(s) {
  if (!s) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const moodMeta = {
  Happy:   { color: '#fbbf24', emoji: '😊' },
  Chill:   { color: '#34d399', emoji: '🌙' },
  Sad:     { color: '#60a5fa', emoji: '🌧️' },
  Workout: { color: '#f97316', emoji: '💪' },
  Focus:   { color: '#a855f7', emoji: '🧠' },
  Party:   { color: '#ff6b6b', emoji: '🎉' },
  Romance: { color: '#f472b6', emoji: '💖' },
  Hype:    { color: '#00d4ff', emoji: '🔥' },
}

function JamSession() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playSong, clearPlayer } = usePlayer()

  const [view, setView] = useState('browse')
  const [activeRoom, setActiveRoom] = useState(null)
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchRooms()
    pb.collection('jam_rooms').subscribe('*', () => { fetchRooms() })
    return () => { pb.collection('jam_rooms').unsubscribe('*') }
  }, [])

  const fetchRooms = async () => {
    try {
      const result = await pb.collection('jam_rooms').getFullList({
        expand: 'host,current_songs',
        sort: '-created',
        requestKey: 'fetch-all-rooms',
      })
      setRooms(result)
    } catch (err) {
      console.error('fetchRooms error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async () => {
    if (!roomName.trim()) return
    setCreating(true)
    try {
      const room = await pb.collection('jam_rooms').create({
        name: roomName,
        host: user.id,
        is_live: true,
        listeners: 1,
        playback_position: 0,
      })
      const expanded = await pb.collection('jam_rooms').getOne(room.id, {
        expand: 'host,current_songs',
        requestKey: 'create-room-expand',
      })
      setActiveRoom(expanded)
      setView('room')
      setShowCreate(false)
      setRoomName('')
    } catch (err) {
      console.error('createRoom error:', err)
    } finally {
      setCreating(false)
    }
  }

  const joinRoom = async (room) => {
    try {
      await pb.collection('jam_rooms').update(room.id, {
        listeners: (room.listeners || 0) + 1,
      })
    } catch {}
    setActiveRoom(room)
    setView('room')
  }

  const leaveRoom = async (room) => {
  try {
    await pb.collection('jam_rooms').update(room.id, {
      listeners: Math.max((room.listeners || 1) - 1, 0),
    })
  } catch {}
  clearPlayer()
  setView('browse')
  setActiveRoom(null)
}

  // ── Delete room (host only) ──
  const deleteRoom = async (e, roomId) => {
    e.stopPropagation()
    if (!confirm('Delete this room?')) return
    try {
      await pb.collection('jam_rooms').delete(roomId)
      fetchRooms()
    } catch (err) {
      console.error('deleteRoom error:', err)
    }
  }

  const totalListeners = rooms.reduce((sum, r) => sum + (r.listeners || 0), 0)

  if (view === 'room' && activeRoom) {
    return <RoomView room={activeRoom} user={user} onBack={() => leaveRoom(activeRoom)} playSong={playSong} clearPlayer={clearPlayer} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '0 24px 80px' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '30%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)' }} />
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ paddingTop: 40, paddingBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, marginBottom: 8, display: 'block' }}>← Dashboard</button>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>🎧 Jam Sessions</h1>
            <p style={{ color: 'var(--muted2)', fontSize: 14, marginTop: 4 }}>Listen together, live and in sync</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '12px 22px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Syne, sans-serif', boxShadow: '0 8px 24px rgba(0,212,255,0.2)' }}>
            + Create Room
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399', animation: 'pulse-glow 2s ease infinite' }} />
          <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{totalListeners} people listening now</span>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>Loading rooms...</div>}

        {!loading && rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted2)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🎧</p>
            <p>No live rooms yet. Create one!</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {rooms.map((room) => {
            const song = room.expand?.current_songs
            const host = room.expand?.host
            const mood = song?.mood || 'Chill'
            const meta = moodMeta[mood] || moodMeta.Chill
            const color = meta.color
            const isMyRoom = user?.id === room.host

            return (
              <div key={room.id}
                style={{ background: `linear-gradient(135deg, ${color}0d, transparent)`, border: `1px solid ${color}33`, borderRadius: 20, padding: 24, transition: 'all 0.25s ease', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}22` }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>

                {/* Delete button for host */}
                {isMyRoom && (
                  <button onClick={(e) => deleteRoom(e, room.id)}
                    style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 8, color: '#ff6b6b', cursor: 'pointer', fontSize: 12, padding: '4px 10px', fontWeight: 600, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.12)'}>
                    ✕
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>{meta.emoji}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${color}22`, padding: '4px 10px', borderRadius: 99, border: `1px solid ${color}33`, marginRight: isMyRoom ? 60 : 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse-glow 2s infinite' }} />
                    <span style={{ fontSize: 12, color, fontWeight: 600 }}>{room.listeners || 0} live</span>
                  </div>
                </div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{room.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted2)', marginBottom: 4 }}>
                  Hosted by <span style={{ color }}>{host?.name || 'Unknown'}</span>
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                  🎵 {song?.title || 'No song playing'}
                </p>
                <button onClick={() => joinRoom(room)}
                  style={{ width: '100%', padding: '11px', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}11`, color, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}22`}
                  onMouseLeave={e => e.currentTarget.style.background = `${color}11`}>
                  {isMyRoom ? '👑 Re-enter Room →' : 'Join Session →'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: '#0e1021', border: '1px solid var(--border)', borderRadius: 24, padding: 36, width: '100%', maxWidth: 400 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Create a Room</h2>
            <p style={{ color: 'var(--muted2)', fontSize: 14, marginBottom: 24 }}>Start a live listening session</p>
            <input value={roomName} onChange={e => setRoomName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()}
              placeholder="Room name..."
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text)', fontSize: 14, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 13, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={createRoom} disabled={creating}
                style={{ flex: 1, padding: 13, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: creating ? 0.6 : 1 }}>
                {creating ? 'Creating...' : 'Create →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Room View ────────────────────────────────────────────────────────────────

function RoomView({ room, user, onBack, playSong }) {
  const { togglePlay, playing, seekTo, progress, duration } = usePlayer()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState('')
  const [currentRoom, setCurrentRoom] = useState(room)
  const [songs, setSongs] = useState([])
  const [showSongPicker, setShowSongPicker] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [toast, setToast] = useState(null)
  const [reactions, setReactions] = useState([])
  const [roomQueue, setRoomQueue] = useState([])
  const chatEndRef = useRef(null)
  const lastSongIdRef = useRef(null)
  const lastPlayingRef = useRef(true)

  const hostId = typeof room.host === 'string' ? room.host : room.host?.id || room.expand?.host?.id
  const isHost = user?.id === hostId

  useEffect(() => {
    let unsubMessages = null
    let unsubRoom = null
    let cancelled = false

    const init = async () => {
      await fetchMessages()
      await fetchRoom()
      if (cancelled) return

      try {
        unsubMessages = await pb.collection('messages').subscribe('*', (e) => {
  if (cancelled) return
  if (e.record.room !== room.id) return
  if (e.record.type === 'reaction' && e.record.user !== user?.id) {
    // Show other users' reactions floating
    const id = Date.now()
    setReactions(r => [...r, { id, emoji: e.record.text, x: 20 + Math.random() * 60 }])
    setTimeout(() => setReactions(r => r.filter(r2 => r2.id !== id)), 1500)
  } else {
    fetchMessages()
  }
})
      } catch (err) { console.error('messages subscribe error:', err) }

      try {
        unsubRoom = await pb.collection('jam_rooms').subscribe(room.id, (e) => {
          if (!cancelled) {
            // Sync play/pause state for non-hosts
            if (!isHost) {
              const roomPlaying = e.record.is_playing !== false
              setIsPlaying(roomPlaying)
              if (roomPlaying !== lastPlayingRef.current) {
                lastPlayingRef.current = roomPlaying
                // Force play or pause via global audio
                const audio = document.querySelector('audio')
                if (audio) {
                  if (roomPlaying) audio.play().catch(() => {})
                  else audio.pause()
                }
              }
            }
            fetchRoom()
          }
        })
      } catch (err) { console.error('room subscribe error:', err) }
    }

    init()

    return () => {
      cancelled = true
      if (unsubMessages) { try { unsubMessages() } catch {} }
      if (unsubRoom) { try { unsubRoom() } catch {} }
    }
  }, [room.id])

  const fetchRoom = async () => {
    try {
      const updated = await pb.collection('jam_rooms').getOne(room.id, {
        expand: 'host,current_songs,queue_songs',
        requestKey: 'fetch-room-' + room.id,
      })
      setCurrentRoom(updated)
      const q = updated.expand?.queue_songs
      setRoomQueue(Array.isArray(q) ? q : q ? [q] : [])
      setIsPlaying(updated.is_playing !== false)

      const newSong = updated.expand?.current_songs
      if (newSong && newSong.id !== lastSongIdRef.current) {
        lastSongIdRef.current = newSong.id
        playSong([newSong], 0)
        showToast(`🎵 Now Playing: ${newSong.title}`)
      }
    } catch (err) {
      if (!err?.isAbort) console.error('fetchRoom error:', err)
    }
  }

  useEffect(() => {
    if (!isHost) return
    let cancelled = false
    pb.collection('songs').getFullList({ requestKey: 'fetch-songs-host' })
      .then(result => { if (!cancelled) setSongs(result) })
      .catch(err => { if (!err?.isAbort) console.error('fetch songs:', err) })
    return () => { cancelled = true }
  }, [isHost])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
  try {
    const result = await pb.collection('messages').getFullList({
      filter: `room = "${room.id}" && type = ""`,
      expand: 'user',
      sort: 'created',
      requestKey: 'fetch-messages-' + room.id,
    })
    setMessages(result)
  } catch (err) {
    if (!err?.isAbort) console.error('fetchMessages error:', err)
  }
}
// Auto-play next queued song when current ends (host only)
useEffect(() => {
  if (!isHost) return
  if (!song) return

  const audio = document.querySelector('audio')
  if (!audio) return

  const handleEnded = async () => {
    if (roomQueue.length === 0) return
    const nextSong = roomQueue[0]
    const newQueue = roomQueue.slice(1)

    try {
      await pb.collection('jam_rooms').update(room.id, {
        current_songs: nextSong.id,
        queue_songs: newQueue.map(s => s.id),
        playback_position: 0,
        is_playing: true,
      })
      playSong([nextSong], 0)
      setRoomQueue(newQueue)
      showToast(`🎵 Now Playing: ${nextSong.title}`)
    } catch (err) {
      console.error('auto-next error:', err)
    }
  }

  audio.addEventListener('ended', handleEnded)
  return () => audio.removeEventListener('ended', handleEnded)
}, [isHost, roomQueue, songs?.id])

  const sendMessage = async () => {
    if (!message.trim()) return
    const text = message.trim()
    setMessage('')
    try {
      await pb.collection('messages').create({ room: room.id, user: user.id, text })
    } catch (err) {
      console.error('sendMessage error:', err)
      setMessage(text)
    }
  }
  const showToast = (msg) => {
  setToast(msg)
  setTimeout(() => setToast(null), 3000)
}
const sendReaction = async (emoji) => {
  const id = Date.now()
  // Show locally immediately
  setReactions(r => [...r, { id, emoji, x: 20 + Math.random() * 60 }])
  setTimeout(() => setReactions(r => r.filter(r2 => r2.id !== id)), 1500)

  // Send to all users via messages collection with type flag
  try {
    await pb.collection('messages').create({
      room: room.id,
      user: user.id,
      text: emoji,
      type: 'reaction',
    })
  } catch {}
}

  // Host toggles play/pause — syncs to all listeners via is_playing field
  const hostTogglePlay = async () => {
    const newPlaying = !isPlaying
    setIsPlaying(newPlaying)
    togglePlay()
    try {
      await pb.collection('jam_rooms').update(room.id, {
        is_playing: newPlaying,
      })
    } catch (err) {
      console.error('hostTogglePlay error:', err)
    }
  }

  const pickSong = async (song) => {
    try {
      await pb.collection('jam_rooms').update(room.id, {
        current_songs: song.id,
        playback_position: 0,
        is_playing: true,
      })
      const updated = await pb.collection('jam_rooms').getOne(room.id, {
        expand: 'host,current_songs,queue_songs',
        requestKey: 'pick-song-refetch',
      })
      setCurrentRoom(updated)
      lastSongIdRef.current = song.id
      setIsPlaying(true)
      playSong([song], 0)
      setShowSongPicker(false)
    } catch (err) {
      console.error('pickSong error:', err)
    }
  }

  const song = currentRoom.expand?.current_songs
  const mood = song?.mood || 'Chill'
  const meta = moodMeta[mood] || moodMeta.Chill
  const color = meta.color
  const hostName = currentRoom.expand?.host?.name || room.expand?.host?.name || 'Unknown'

  // Queue = all songs after current in the songs list


  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Room header */}
      <div style={{ background: `linear-gradient(135deg, ${color}15, transparent)`, borderBottom: `1px solid ${color}33`, padding: '20px 24px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>← Leave Room</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 40 }}>{meta.emoji}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{currentRoom.name}</h1>
            <p style={{ color: 'var(--muted2)', fontSize: 14 }}>
              {isHost ? <span style={{ color }}>👑 You are the host</span> : `Hosted by ${hostName}`}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: `${color}22`, padding: '6px 14px', borderRadius: 99 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, animation: 'pulse-glow 2s infinite' }} />
            <span style={{ color, fontWeight: 600, fontSize: 13 }}>{currentRoom.listeners || 0} listening</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', maxWidth: 1100, margin: '0 auto', width: '100%', padding: '24px', gap: 20 }}>

        {/* Left: Player + Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Now playing card */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${color}33`, borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: 24, overflow: 'hidden', margin: '0 auto 24px', border: `2px solid ${color}44`, boxShadow: isPlaying ? `0 0 32px ${color}44` : 'none', transition: 'box-shadow 0.4s ease' }}>
              {song?.cover_url
                ? <img src={song.cover_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{meta.emoji}</div>
              }
            </div>
            <p style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{song?.title || 'No song playing'}</p>
            <p style={{ color: 'var(--muted2)', marginBottom: 24 }}>{song?.artist || '—'}</p>

            {/* Host controls */}
            {isHost && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <button onClick={hostTogglePlay}
                  style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: `linear-gradient(135deg, ${color}, #a855f7)`, color: '#000', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, boxShadow: `0 4px 20px ${color}44`, transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {isPlaying ? '▶' : '⏸'}
                </button>
                 {/* Restart button */}
                <button onClick={() => { seekTo(0); pb.collection('jam_rooms').update(room.id, { playback_position: 0 }) }}
                  style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid rgba(255,255,255,0.1)`, background: 'rgba(255,255,255,0.05)', color: 'var(--muted2)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--muted2)' }}
                  title="Restart song">
                  ↺
                </button>

                <button onClick={() => setShowSongPicker(true)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${color}55`, background: `${color}11`, color, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                  🎵 Change Song
                </button>
              </div>
            )}

            {/* Progress bar */}
            <div style={{ width: '100%', marginBottom: 20, marginTop: 8 }}>
            <div
              style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99, cursor: isHost ? 'pointer' : 'default', marginBottom: 8 }}
              onClick={isHost ? (e => seekTo((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width * duration)) : undefined}>
                <div style={{ width: `${duration ? (progress / duration) * 100 : 0}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #a855f7)`, borderRadius: 99, transition: 'width 0.5s linear', position: 'relative' }}>
                  {isHost && <div style={{ position: 'absolute', right: -6, top: '50%', transform: 'translateY(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: `0 0 8px ${color}` }} />}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted2)' }}>
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>

            {/* Non-host status */}
            {!isHost && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isPlaying ? '#34d399' : 'var(--muted)', animation: isPlaying ? 'pulse-glow 2s infinite' : 'none' }} />
                <span style={{ fontSize: 13, color: isPlaying ? '#34d399' : 'var(--muted2)', fontWeight: 600 }}>
                  {isPlaying ? 'Playing' : 'Paused by host'}
                </span>
              </div>
            )}
          </div>

          {/* Up Next Queue */}
          {roomQueue.length > 0 && (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, padding: '20px 24px' }}>
    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted2)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>⏭ Up Next</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {roomQueue.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', width: 16, textAlign: 'center' }}>{i + 1}</span>
          <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {s.cover_url ? <img src={s.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="cover" /> : '🎵'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
            <p style={{ fontSize: 11, color: 'var(--muted2)' }}>{s.artist}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

          <p style={{ textAlign: 'center', color: 'var(--muted2)', fontSize: 13 }}>🔒 Synced playback — everyone hears the same thing</p>
        </div>

        {/* Chat */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', maxHeight: 'calc(100vh - 260px)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 600, fontSize: 15 }}>💬 Room Chat</p>
          </div>
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--muted2)', fontSize: 13, paddingTop: 20 }}>No messages yet. Say hi! 👋</p>
            )}
           {messages.map((m, i) => {
  const isYou = m.user === user?.id
  const name = m.expand?.user?.name || 'Unknown'
  return (
    <div key={m.id || i}
      style={{ display: 'flex', flexDirection: 'column', alignItems: isYou ? 'flex-end' : 'flex-start' }}
      onMouseEnter={e => { const ts = e.currentTarget.querySelector('.msg-time'); if (ts) ts.style.opacity = '1' }}
      onMouseLeave={e => { const ts = e.currentTarget.querySelector('.msg-time'); if (ts) ts.style.opacity = '0' }}>
      {!isYou && <span style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 3 }}>{name}</span>}
      <div style={{ padding: '8px 14px', borderRadius: 12, background: isYou ? `${color}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${isYou ? color + '33' : 'var(--border)'}`, maxWidth: '80%' }}>
        <p style={{ fontSize: 14, wordBreak: 'break-word' }}>{m.text || ''}</p>
      </div>
      <span className="msg-time" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, opacity: 0, transition: 'opacity 0.2s ease' }}>
        {new Date(m.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
})}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input value={message} onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something..."
              style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.3)', color: 'var(--text)', fontSize: 14, outline: 'none' }} />
            <button onClick={sendMessage} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: color, color: '#000', cursor: 'pointer', fontWeight: 700 }}>→</button>
          </div>
        </div>
      </div>

{/* Floating reactions */}
{reactions.map(r => (
  <div key={r.id} style={{
    position: 'fixed', bottom: 100, left: `${r.x}%`,
    fontSize: 36, pointerEvents: 'none', zIndex: 998,
    animation: 'floatUp 1.5s ease forwards',
  }}>
    {r.emoji}
  </div>
))}

{/* Reaction buttons */}
<div style={{
  position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', gap: 12, zIndex: 100,
  background: 'rgba(14,16,33,0.9)', border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)', borderRadius: 99, padding: '10px 20px',
}}>
  {['❤️', '🔥', '😭', '🎵'].map(emoji => (
    <button key={emoji} onClick={() => sendReaction(emoji)}
      style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', transition: 'transform 0.15s', padding: '4px 8px', borderRadius: 10 }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      {emoji}
    </button>
  ))}
</div>

{/* Toast notification */}
{toast && (
  <div style={{
    position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(14,16,33,0.95)', border: '1px solid rgba(255,255,255,0.12)',
    backdropFilter: 'blur(16px)', borderRadius: 14, padding: '12px 24px',
    color: '#fff', fontSize: 14, fontWeight: 600, zIndex: 999,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    animation: 'fadeUp 0.3s ease',
  }}>
    {toast}
  </div>
)}

      {/* Song Picker Modal */}
{showSongPicker && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
    <div style={{ background: '#0e1021', border: '1px solid var(--border)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 480, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Pick a Song</h2>
        <button onClick={() => setShowSongPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--muted2)', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 20 }}>Click to play now · Click + to add to queue</p>
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {songs.length === 0 && <p style={{ color: 'var(--muted2)', textAlign: 'center', padding: '20px 0' }}>No songs found</p>}
        {songs.map(s => {
          const isCurrentSong = song?.id === s.id
          const isQueued = roomQueue.some(q => q.id === s.id)
          return (
            <div key={s.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, border: `1px solid ${isCurrentSong ? color + '55' : isQueued ? 'rgba(168,85,247,0.4)' : 'var(--border)'}`, transition: 'all 0.15s', background: isCurrentSong ? `${color}11` : isQueued ? 'rgba(168,85,247,0.06)' : 'transparent' }}>
              <div onClick={() => pickSong(s)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: 'pointer' }}
                onMouseEnter={e => { if (!isCurrentSong) e.currentTarget.parentElement.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.parentElement.style.background = isCurrentSong ? `${color}11` : isQueued ? 'rgba(168,85,247,0.06)' : 'transparent' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.cover_url ? <img src={s.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="cover" /> : '🎵'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted2)' }}>{s.artist}</p>
                </div>
                {isCurrentSong && <span style={{ fontSize: 11, color, fontWeight: 700, flexShrink: 0 }}>NOW PLAYING</span>}
                {isQueued && !isCurrentSong && <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 700, flexShrink: 0 }}>IN QUEUE</span>}
              </div>

              {/* Add to queue button */}
              {!isCurrentSong && (
                <button onClick={async () => {
                  if (isQueued) {
                    // Remove from queue
                    const newQueue = roomQueue.filter(q => q.id !== s.id)
                    setRoomQueue(newQueue)
                    await pb.collection('jam_rooms').update(room.id, { queue_songs: newQueue.map(q => q.id) })
                  } else {
                    // Add to queue
                    const newQueue = [...roomQueue, s]
                    setRoomQueue(newQueue)
                    await pb.collection('jam_rooms').update(room.id, { queue_songs: newQueue.map(q => q.id) })
                  }
                }}
                  style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${isQueued ? '#a855f7' : 'rgba(255,255,255,0.15)'}`, background: isQueued ? 'rgba(168,85,247,0.15)' : 'transparent', color: isQueued ? '#a855f7' : 'var(--muted2)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                  {isQueued ? '−' : '+'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Queue preview */}
      {roomQueue.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 8, fontWeight: 600 }}>⏭ Queue ({roomQueue.length} songs)</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {roomQueue.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, padding: '4px 10px' }}>
                <span style={{ fontSize: 11, color: '#a855f7', fontWeight: 600 }}>{i + 1}. {q.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)}
    </div>
  )
}

export default JamSession