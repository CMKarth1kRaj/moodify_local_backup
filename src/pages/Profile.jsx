import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import pb from '../services/pocketbase'
import { 
  ArrowLeft, 
  Camera, 
  User, 
  LogOut, 
  Trash2, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef()
  
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const avatarUrl = user?.avatar 
    ? pb.files.getURL(user, user.avatar) 
    : `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=be5c2b&color=fff&size=128`

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      await pb.collection('users').update(user.id, { name })
      setMsg({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await pb.collection('users').update(user.id, formData)
      setMsg({ type: 'success', text: 'Avatar updated!' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Sidebar />
      <main className="main-content">
        <section className="center-view">
          <div className="center-container" style={{ maxWidth: 600 }}>
            
            <div className="section-header" style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button onClick={() => navigate(-1)} className="icon-button" style={{ border: 'none', background: 'var(--surface-hover)' }}>
                <ArrowLeft size={20} />
              </button>
              <h1 className="section-title">Account Settings</h1>
            </div>

            <div className="hero-card" style={{ padding: '40px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                <img 
                  src={avatarUrl} 
                  style={{ width: 128, height: 128, borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg)', boxShadow: 'var(--shadow-lg)', cursor: 'pointer' }}
                  alt="Avatar"
                  onClick={handleAvatarClick}
                />
                <button 
                  onClick={handleAvatarClick}
                  style={{ position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, background: 'var(--accent)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--surface)', cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>{user?.name || 'Your Name'}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>{user?.email}</p>

              {msg.text && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderRadius: 'var(--radius-md)', 
                  background: msg.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  color: msg.type === 'success' ? '#22C55E' : '#EF4444', 
                  marginBottom: 24, fontSize: 14, fontWeight: 600, border: `1px solid ${msg.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}` 
                }}>
                  {msg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {msg.text}
                </div>
              )}

              <form onSubmit={handleUpdate} style={{ textAlign: 'left' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} />
                    <span>Full Name</span>
                  </label>
                  <input 
                    className="form-input" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Enter your name"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
                  <button 
                    className="auth-btn" 
                    type="submit" 
                    disabled={loading}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    type="button"
                    className="auth-btn"
                    onClick={() => { logout(); navigate('/login'); }}
                    style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </form>
            </div>

            <div style={{ marginTop: 40, padding: 32, background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <Trash2 size={20} color="#EF4444" />
                <h3 style={{ color: '#EF4444', fontSize: 16, fontWeight: 700 }}>Danger Zone</h3>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Once you delete your account, there is no going back. Please be certain.</p>
              <button style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'none', border: '1px solid #EF4444', color: '#EF4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Delete Account
              </button>
            </div>

          </div>
        </section>
      </main>
    </>
  )
}
