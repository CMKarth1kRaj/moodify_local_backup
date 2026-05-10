import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { account, ID } from '../services/appwrite'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const { checkUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErr('')
    try {
      if (isLogin) {
        await account.createEmailPasswordSession(email, password)
      } else {
        await account.create(ID.unique(), email, password, name)
        await account.createEmailPasswordSession(email, password)
      }
      await checkUser()
      navigate('/dashboard')
    } catch (error) {
      setErr(error.message)
    }
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-form-side">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src="/logo.png" alt="Moodify Logo" style={{ width: 64, height: 64, marginBottom: 16, objectFit: 'contain' }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              {isLogin ? 'Enter your details to access your music.' : 'Join Moodify to start curating AI playlists.'}
            </p>
          </div>

          {err && (
            <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: 'var(--radius-md)', marginBottom: 24, fontSize: 14, fontWeight: 500, textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {err}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  className="form-input" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                className="form-input" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label">Password</label>
              <input 
                className="form-input" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>
            <button className="auth-btn" type="submit">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }} 
              onClick={() => { setIsLogin(!isLogin); setErr(''); }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>

      <div className="auth-image-side">
        <img 
          src="/authimg.jpg" 
          alt="Moodify Auth"
          className="auth-hero-image"
          onError={(e) => {
            // Fallback if local file access is restricted
            e.target.style.display = 'none';
          }}
        />
        <div className="auth-image-overlay">
          <h2 style={{ fontSize: 42, fontWeight: 900, color: 'white', marginBottom: 16 }}>Moodify</h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', maxWidth: 400 }}>
            Sync your music with your mood and listen together with friends in real-time.
          </p>
        </div>
      </div>
    </div>
  )
}