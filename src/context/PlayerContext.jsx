import { createContext, useContext, useState, useRef, useEffect } from 'react'
import pb from '../services/pocketbase'

const PlayerContext = createContext()

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const currentSong = currentIdx !== null ? queue[currentIdx] : null

  useEffect(() => {
    if (currentSong?.audio_url) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(currentSong.audio_url)
      audioRef.current.play()
      setPlaying(true)
      setProgress(0)
      audioRef.current.ontimeupdate = () => {
        setProgress(audioRef.current.currentTime)
      }
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration)
      }
      audioRef.current.onended = () => {
        next()
      }
    }
  }, [currentIdx, queue])

  // ── History tracking ──────────────────────────────────────────
  // Wait 2s before saving so skipping songs doesn't spam the DB
  useEffect(() => {
    if (currentIdx === null || !queue[currentIdx]) return
    const song = queue[currentIdx]
    if (!pb.authStore.isValid) return

    const timer = setTimeout(async () => {
      try {
        await pb.collection('history').create({
          user: pb.authStore.model.id,
          song: song.id,
        }, { requestKey: `history-${song.id}-${Date.now()}` })
      } catch {
        // silently ignore — history is non-critical
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [currentIdx, queue])

  const playSong = (songs, idx) => {
    setQueue(songs)
    setCurrentIdx(idx)
  }

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause()
    } else {
      audioRef.current?.play()
    }
    setPlaying(!playing)
  }

  const next = () => {
    setCurrentIdx(i => (i < queue.length - 1 ? i + 1 : i))
  }

  const prev = () => {
    setCurrentIdx(i => (i > 0 ? i - 1 : i))
  }

  const seek = (e, el) => {
    const rect = el.getBoundingClientRect()
    const newTime = ((e.clientX - rect.left) / rect.width) * duration
    if (audioRef.current) audioRef.current.currentTime = newTime
    setProgress(newTime)
  }

  const seekTo = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      setProgress(seconds)
    }
  }

  const clearPlayer = () => {
  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current = null
  }
  setQueue([])
  setCurrentIdx(null)
  setPlaying(false)
  setProgress(0)
  setDuration(0)
  sessionStorage.removeItem('moodify_queue')
  sessionStorage.removeItem('moodify_idx')
}

  useEffect(() => {
    window.__moodifySeek = seekTo
  }, [])

  return (
    <PlayerContext.Provider value={{ queue, currentSong, currentIdx, playing, progress, duration, playSong, togglePlay, next, prev, seek, seekTo, clearPlayer }}>      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  return useContext(PlayerContext)
}