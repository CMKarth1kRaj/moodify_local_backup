import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;
// User specified 2.5, using 2.5-flash as the closest valid identifier if 2.5 fails
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

/**
 * Uses Gemini to suggest songs based on a mood string.
 * Returns an array of { title, artist }
 */
export async function getGeminiProactivePlaylist(mood) {
  if (!model) {
    console.error("Gemini API key missing!");
    return [];
  }

  const prompt = `Suggest 10 popular, real songs that match the mood: "${mood}". 
  Return ONLY a valid JSON array of objects with "title" and "artist" keys. 
  Example: [{"title": "Song Name", "artist": "Artist Name"}]
  Do not include any other text or explanation.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();
    
    // Clean up markdown if AI included it
    if (text.includes("```")) {
      text = text.split("```")[1].replace("json", "").trim();
    }

    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}

/**
 * Searches YouTube for a song and returns the first video URL and metadata.
 */
export async function searchYouTube(query) {
  if (!YOUTUBE_KEY) return null;
  
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&maxResults=1&key=${YOUTUBE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        cover_url: item.snippet.thumbnails.high.url,
        audio_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        artist: item.snippet.channelTitle
      };
    }
  } catch (error) {
    console.error("YouTube Search Error:", error);
  }
  return null;
}
