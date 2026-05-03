# 🎵 Moodify — AI-Powered Music Streaming App

Moodify is a mood-based music streaming web app built with **React + Vite** and **PocketBase** as the backend. Pick a vibe, get a playlist, jam with friends in real time, and let the AI recommend songs based on your listening history.

---

## ✨ Features

- 🎭 **Mood-based playlists** — Choose from 8 moods: Happy, Chill, Sad, Workout, Focus, Party, Romance, Hype
- 🤖 **AI Recommendations** — Smart suggestions based on your listening history
- 🎧 **Full Music Player** — Seek bar, queue, LRCLIB synced lyrics
- ❤️ **Liked Songs** — Heart songs and access them from one place
- 📚 **Library** — Create, manage, and delete your own playlists
- 🔍 **Search** — Real-time search with 300ms debounce
- 🟢 **Jam Sessions** — Listen live with friends in sync, with chat, reactions, and queue
- 📜 **Listening History** — Every song you play is tracked automatically
- 👤 **User Accounts** — Auth via PocketBase with display name

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Routing | react-router-dom |
| Backend | PocketBase (self-hosted) |
| Styling | Inline styles + CSS variables (no Tailwind) |
| Fonts | Syne (headings) + DM Sans (body) — Google Fonts |

---

## 📦 Prerequisites

- **Node.js** v18+ — [Download](https://nodejs.org)
- **PocketBase** executable — [Download](https://pocketbase.io/docs/)

---

## 🚀 How to Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/talikotaharish1-arch/moodify_Hrsh.git
cd moodify_Hrsh
```

### 2. Set up PocketBase

1. Download `pocketbase.exe` from https://pocketbase.io/docs/
2. Place it inside the `backend/` folder:
   ```
   moodify_Hrsh/
   └── backend/
       └── pocketbase.exe   ← place here
   ```
3. Start PocketBase:
   ```bash
   # Windows
   cd backend
   pocketbase.exe serve

   # Mac / Linux
   cd backend
   ./pocketbase serve
   ```
4. Open the admin panel at **http://127.0.0.1:8090/_/**
5. Create your admin account on first launch

---

### 3. Create PocketBase Collections

In the admin panel, create these collections with **exact** names and fields:

#### `users` (built-in Auth collection)
- `name` — Plain text

#### `songs`
| Field | Type |
|-------|------|
| title | Plain text |
| artist | Plain text |
| album | Plain text |
| duration | Number |
| mood | Plain text (e.g. `Chill`, `Happy`) |
| cover_url | URL |
| audio_url | URL |

#### `Playlist` *(capital P — required)*
| Field | Type |
|-------|------|
| name | Plain text |
| mood | Plain text |
| user | Relation → users (single) |
| songs | Relation → songs (multiple) |

#### `likes`
| Field | Type |
|-------|------|
| user | Relation → users (single) |
| song | Relation → songs (single) |

#### `history`
| Field | Type |
|-------|------|
| user | Relation → users (single) |
| song | Relation → songs (single) |

#### `jam_rooms`
| Field | Type |
|-------|------|
| name | Plain text |
| host | Relation → users (single) |
| current_songs | Relation → songs (single) |
| is_live | Bool |
| listeners | Number |
| playback_position | Number |
| is_playing | Bool |
| queue_songs | Relation → songs (multiple) |

#### `messages`
| Field | Type |
|-------|------|
| room | Relation → jam_rooms (single) |
| user | Relation → users (single) |
| text | Plain text |
| type | Plain text (optional) |

#### ⚠️ API Rules — set for ALL collections:
```
List   → @request.auth.id != ""
View   → @request.auth.id != ""
Create → @request.auth.id != ""
Update → @request.auth.id != ""
Delete → @request.auth.id != ""
```

---

### 4. Install frontend dependencies

```bash
# From the project root
npm install
```

### 5. Start the frontend dev server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📁 Project Structure

```
moodify/
├── backend/
│   └── pocketbase.exe          # Download separately — NOT in repo
├── src/
│   ├── components/
│   │   ├── MiniPlayer.jsx      # Persistent bottom player bar
│   │   └── ProtectedRoute.jsx
│   ├── context/
│   │   ├── AuthContext.jsx     # Login / auth state
│   │   └── PlayerContext.jsx   # Audio engine + history tracking
│   ├── hooks/
│   │   ├── useLikes.js         # Like / unlike songs
│   │   └── useRecommendations.js  # AI mood-based recommendations
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx       # Home — recommendations, trending, featured
│   │   ├── Playlist.jsx        # Songs filtered by mood
│   │   ├── Player.jsx          # Full player with LRCLIB lyrics
│   │   ├── LikedSongs.jsx
│   │   ├── Search.jsx
│   │   ├── Library.jsx
│   │   └── JamSession.jsx      # Real-time listening rooms
│   └── services/
│       └── pocketbase.js       # PocketBase client instance
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

---

## 🎨 Design System

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg` | `#06070f` | Page background |
| `--cyan` | `#00d4ff` | Primary accent |
| `--purple` | `#a855f7` | Secondary accent |
| `--coral` | `#ff6b6b` | Highlight |

Dark glassmorphism theme with animated ambient orbs, gradient text, and micro-animations.

---

## 📝 Important Notes

- `pocketbase.exe` is **not included** — download from [pocketbase.io](https://pocketbase.io/docs/) and place in `backend/`
- Mood field values must start with a **capital letter** — e.g. `Chill` not `chill`
- The playlist collection name is **`Playlist`** with a capital P — always
- `React.StrictMode` is intentionally **removed** to prevent PocketBase request abort errors

---

## 👤 Author

Built by **Harish** — [@talikotaharish1-arch](https://github.com/talikotaharish1-arch)
