import { useState, useEffect } from 'react'
import pb from '../services/pocketbase'

export function useLikes(userId) {
  const [likes, setLikes] = useState([]) // array of like records
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchLikes()
  }, [userId])

  const fetchLikes = async () => {
    try {
      const result = await pb.collection('likes').getFullList({
        filter: `user = '${userId}'`,
        expand: 'song',
        requestKey: 'fetch-likes-' + userId,
      })
      setLikes(result)
    } catch (err) {
      // Silently ignore if collection is missing to avoid spamming the console
    } finally {
      setLoading(false)
    }
  }

  const isLiked = (songId) => likes.some(l => l.song === songId)

  const toggleLike = async (songId) => {
    const existing = likes.find(l => l.song === songId)
    if (existing) {
      // Unlike
      try {
        await pb.collection('likes').delete(existing.id)
        setLikes(prev => prev.filter(l => l.id !== existing.id))
      } catch (err) {
        console.error('unlike error:', err)
      }
    } else {
      // Like
      try {
        const newLike = await pb.collection('likes').create({
          user: userId,
          song: songId,
        })
        // optimistically add with song id
        setLikes(prev => [...prev, { ...newLike, song: songId }])
      } catch (err) {
        console.error('like error:', err)
      }
    }
  }

  const likedSongs = likes
    .filter(l => l.expand?.song)
    .map(l => l.expand.song)

  return { likes, likedSongs, isLiked, toggleLike, loading, refetch: fetchLikes }
}