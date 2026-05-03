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

  const currentSong = currentIdx !== null ? queue[currentIdx] : null

  const playSong = (songs, idx) => {
    setQueue(songs)
    setCurrentIdx(idx)
    setPlaying(true)
  }

  const togglePlay = () => setPlaying(!playing)

  const next = () => {
    if (currentIdx < queue.length - 1) setCurrentIdx(currentIdx + 1)
  }

  const prev = () => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }

  // ── Native YouTube IFrame API ──
  useEffect(() => {
    if (!currentSong) return;

    const match = currentSong.audio_url.match(/v=([a-zA-Z0-9_-]+)/);
    if (!match) return;
    const videoId = match[1];

    let ytPlayer;

    const initPlayer = () => {
      // Destroy existing if needed (though we rebuild the div below)
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

  // Handle play/pause commands
  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      if (playing) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
    }
  }, [playing]);

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
    if (playerRef.current && playerRef.current.destroy) {
      playerRef.current.destroy();
    }
  }

  // ── History tracking ──
  useEffect(() => {
    if (currentIdx === null || !queue[currentIdx] || !pb.authStore.isValid) return
    const song = queue[currentIdx]
    const timer = setTimeout(async () => {
      try {
        await pb.collection('history').create({
          user: pb.authStore.model.id,
          song: song.id || '', 
          song_title: song.title 
        }, { requestKey: `hist-${Date.now()}` })
      } catch (e) {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [currentIdx, queue])

  return (
    <PlayerContext.Provider value={{ queue, currentSong, currentIdx, playing, progress, duration, playSong, togglePlay, next, prev, seek, seekTo, clearPlayer }}>
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