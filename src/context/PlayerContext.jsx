import { createContext, useContext, useState, useRef, useEffect } from 'react'
import pb from '../services/pocketbase'

const PlayerContext = createContext()

export function PlayerProvider({ children }) {
  const [queue, setQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const playerRef = useRef(null)

  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [muted, setMuted] = useState(false)
  const [likes, setLikes] = useState([])

  const currentSong = currentIdx !== null ? queue[currentIdx] : null

  // Fetch likes on mount
  useEffect(() => {
    if (pb.authStore.isValid) {
      pb.collection('likes').getFullList({ filter: `user = '${pb.authStore.model.id}'` })
        .then(setLikes)
        .catch(() => {})
    }
  }, [pb.authStore.isValid])

  const playSong = (songs, idx) => {
    setQueue(songs)
    setCurrentIdx(idx)
    setPlaying(true)
  }



  const togglePlay = () => setPlaying(!playing)
  const toggleShuffle = () => setShuffle(!shuffle)
  const toggleRepeat = () => setRepeat(!repeat)
  const toggleMute = () => setMuted(!muted)

  const isLiked = (songId) => likes.some(l => l.song === songId)

  const toggleLike = async (songId) => {
    if (!pb.authStore.isValid) return
    const existing = likes.find(l => l.song === songId)
    if (existing) {
      try {
        await pb.collection('likes').delete(existing.id)
        setLikes(prev => prev.filter(l => l.id !== existing.id))
      } catch (e) {}
    } else {
      try {
        const res = await pb.collection('likes').create({ user: pb.authStore.model.id, song: songId })
        setLikes(prev => [...prev, res])
      } catch (e) {}
    }
  }

  const next = () => {
    if (repeat) {
      playerRef.current?.seekTo(0)
      playerRef.current?.playVideo()
      return
    }
    if (shuffle) {
      const nextIdx = Math.floor(Math.random() * queue.length)
      setCurrentIdx(nextIdx)
    } else if (currentIdx < queue.length - 1) {
      setCurrentIdx(currentIdx + 1)
    } else {
      setPlaying(false)
    }
  }

  const prev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }

  // Native YouTube IFrame API
  useEffect(() => {
    if (!currentSong) return;

    const match = currentSong.audio_url.match(/v=([a-zA-Z0-9_-]+)/);
    if (!match) return;
    const videoId = match[1];

    let ytPlayer;

    const initPlayer = () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }

      ytPlayer = new window.YT.Player('youtube-player-div', {
        height: '180',
        width: '320',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          playsinline: 1
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
            setDuration(e.target.getDuration());
            if (muted) e.target.mute();
            else e.target.unMute();
            if (playing) e.target.playVideo();
          },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) setPlaying(true);
            if (e.data === window.YT.PlayerState.PAUSED) setPlaying(false);
            if (e.data === window.YT.PlayerState.ENDED) next();
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
    };
  }, [currentSong?.audio_url]);

  // Handle play/pause & mute commands
  useEffect(() => {
    if (playerRef.current) {
      if (playing) playerRef.current.playVideo?.();
      else playerRef.current.pauseVideo?.();
      
      if (muted) playerRef.current.mute?.();
      else playerRef.current.unMute?.();
    }
  }, [playing, muted]);

  // Progress timer
  useEffect(() => {
    let timer;
    if (playing) {
      timer = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          setProgress(playerRef.current.getCurrentTime() || 0);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playing]);

  const seek = (e, el) => {
    const rect = el.getBoundingClientRect()
    const newPercent = (e.clientX - rect.left) / rect.width
    const newTime = newPercent * duration
    playerRef.current?.seekTo(newTime, true)
    setProgress(newTime)
  }

  const seekTo = (seconds) => {
    playerRef.current?.seekTo(seconds, true)
    setProgress(seconds)
  }

  const clearPlayer = () => {
    setQueue([])
    setCurrentIdx(null)
    setPlaying(false)
    setProgress(0)
    setDuration(0)
    if (playerRef.current) {
      try {
        if (playerRef.current.destroy) playerRef.current.destroy();
      } catch (e) {
        console.warn("Player cleanup failed", e);
      }
      playerRef.current = null;
    }
  }

  // History tracking
  useEffect(() => {
    if (currentIdx === null || !queue[currentIdx] || !pb.authStore.isValid) return
    const song = queue[currentIdx]
    const timer = setTimeout(async () => {
      try {
        await pb.collection('history').create({
          user: pb.authStore.model.id,
          song: song.id || '', 
        }, { requestKey: `hist-${Date.now()}` })
      } catch (e) {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [currentIdx, queue])

  // Real-time Stats Syncing (Batch)
  const lastSyncRef = useRef(0)
  const pendingSecondsRef = useRef(0)

  useEffect(() => {
    if (!playing || !currentSong || !pb.authStore.isValid) return

    const interval = setInterval(async () => {
      pendingSecondsRef.current += 1
      
      // Batch sync every 10 seconds
      if (pendingSecondsRef.current >= 10) {
        const secondsToSync = pendingSecondsRef.current
        pendingSecondsRef.current = 0
        
        try {
          const userId = pb.authStore.model.id
          let stats;
          
          try {
            stats = await pb.collection('user_stats').getFirstListItem(`user="${userId}"`)
            await pb.collection('user_stats').update(stats.id, {
              'total_listening_time+': secondsToSync,
              'last_song': currentSong.id,
              'favorite_artist': currentSong.artist, // Simple logic: last played artist for now
            })
          } catch (err) {
            // Create stats record if it doesn't exist
            await pb.collection('user_stats').create({
              user: userId,
              total_listening_time: secondsToSync,
              last_song: currentSong.id,
              favorite_artist: currentSong.artist
            })
          }
        } catch (e) {
          // If sync fails, add back to pending
          pendingSecondsRef.current += secondsToSync
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [playing, currentSong?.id])

  return (
    <PlayerContext.Provider value={{ 
      queue, currentSong, currentIdx, playing, progress, duration, 
      shuffle, repeat, likes, muted,
      playSong, togglePlay, setPlaying, toggleShuffle, toggleRepeat, toggleLike, isLiked, toggleMute,
      next, prev, seek, seekTo, clearPlayer 
    }}>
      {children}
      {currentSong && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '320px', height: '180px', pointerEvents: 'none' }}>
          <div id="youtube-player-div"></div>
        </div>
      )}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
