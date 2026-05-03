import { useState, useEffect } from 'react'
import { getGeminiProactivePlaylist, searchYouTube } from '../services/ai'

export function useRecommendations(userId) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function buildAIRecommendations() {
      setLoading(true)
      try {
        // 1. Get suggestions from Gemini
        // We can pass a generic "discovery" prompt or use the user's history if available
        const suggestions = await getGeminiProactivePlaylist("popular music discovery")
        
        if (cancelled) return

        // 2. Resolve YouTube URLs for each suggestion
        const resolvedSongs = []
        for (const s of suggestions.slice(0, 5)) { // Limit to 5 for speed
          const ytSong = await searchYouTube(`${s.title} ${s.artist}`)
          if (ytSong) {
            resolvedSongs.push({
              ...ytSong,
              mood: "AI Mix"
            })
          }
        }

        if (!cancelled) {
          setRecommendations(resolvedSongs)
        }
      } catch (err) {
        console.error("AI Recs Error:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    buildAIRecommendations()
    return () => { cancelled = true }
  }, [userId])

  return { recommendations, loading }
}
