import { useState, useEffect } from 'react'
<<<<<<< HEAD
import { getGeminiProactivePlaylist, searchYouTube } from '../services/ai'
=======
import pb from '../services/pocketbase'
>>>>>>> upstream/master

export function useRecommendations(userId) {
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let cancelled = false

<<<<<<< HEAD
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
=======
    async function buildRecommendations() {
      setLoading(true)
      try {
        // Step 1 — fetch last 20 history records with song expanded
        const history = await pb.collection('history').getFullList({
          filter: `user = "${userId}"`,
          sort: '-created',
          perPage: 20,
          expand: 'song',
          requestKey: 'recommendations-history',
        })

        if (cancelled) return

        if (history.length === 0) {
          setRecommendations([])
          setLoading(false)
          return
        }

        // Step 2 — count mood frequency from history
        const moodCount = {}
        const heardIds = new Set()

        history.forEach(record => {
          const song = record.expand?.song
          if (!song) return
          heardIds.add(song.id)
          if (song.mood) {
            moodCount[song.mood] = (moodCount[song.mood] || 0) + 1
          }
        })

        // Step 3 — find top 2 moods
        const topMoods = Object.entries(moodCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([mood]) => mood)

        if (topMoods.length === 0) {
          setRecommendations([])
          setLoading(false)
          return
        }

        // Step 4 — fetch songs matching those moods
        const moodFilter = topMoods.map(m => `mood = "${m}"`).join(' || ')
        const candidates = await pb.collection('songs').getFullList({
          filter: moodFilter,
          sort: '-created',
          requestKey: 'recommendations-songs',
        })

        if (cancelled) return

        // Step 5 — remove songs already heard
        const fresh = candidates.filter(s => !heardIds.has(s.id))

        // Shuffle for variety and cap at 10
        const shuffled = fresh.sort(() => Math.random() - 0.5).slice(0, 10)

        setRecommendations(shuffled)
      } catch (err) {
        if (!cancelled) setRecommendations([])
>>>>>>> upstream/master
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

<<<<<<< HEAD
    buildAIRecommendations()
=======
    buildRecommendations()
>>>>>>> upstream/master
    return () => { cancelled = true }
  }, [userId])

  return { recommendations, loading }
}
