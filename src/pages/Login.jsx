import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '../services/pocketbase'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const navigate = useNavigate()

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Ambient background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite 2s' }} />
        <div style={{ position: 'absolute', top: '40%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,107,0.05) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite 1s' }} />
      </div>

      {/* Grid texture overlay */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, margin: '0 20px', animation: 'fadeUp 0.6s ease' }}>

        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--cyan), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
            <span style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>Moodify</span>
          </div>
          <p style={{ color: 'var(--muted2)', fontSize: 14, letterSpacing: '0.3px' }}>
            {isLogin ? 'Good to see you again' : 'Start your sonic journey'}
          </p>
        </div>

        {/* Glass card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(24px)', border: '1px solid var(--border)', borderRadius: 24, padding: '36px 32px' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {['Login', 'Sign Up'].map(label => (
              <button key={label}
                onClick={() => setIsLogin(label === 'Login')}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600, letterSpacing: '0.3px', transition: 'all 0.2s ease',
                  background: (isLogin ? 'Login' : 'Sign Up') === label ? 'linear-gradient(135deg, var(--cyan), var(--purple))' : 'transparent',
                  color: (isLogin ? 'Login' : 'Sign Up') === label ? '#fff' : 'var(--muted)',
                  boxShadow: (isLogin ? 'Login' : 'Sign Up') === label ? '0 4px 16px rgba(0,212,255,0.2)' : 'none'
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLogin && (
              <div style={{ animation: 'slideIn 0.25s ease' }}>
                <InputField name="username" placeholder="Username" value={form.username} onChange={handleChange} icon="👤" />
              </div>
            )}
            <InputField name="email" placeholder="Email address" type="email" value={form.email} onChange={handleChange} icon="✉️" />
            <InputField name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} icon="🔒" />

            {isLogin && (
              <div style={{ textAlign: 'right', marginTop: -6 }}>
                <span style={{ fontSize: 13, color: 'var(--cyan)', cursor: 'pointer' }}>Forgot password?</span>
              </div>
            )}

            <button
  onClick={async () => {
    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(form.email, form.password)
      } else {
        await pb.collection('users').create({
          name: form.username,
          email: form.email,
          password: form.password,
          passwordConfirm: form.password,
        })
        await pb.collection('users').authWithPassword(form.email, form.password)
      }
      navigate('/dashboard')
    } catch (err) {
      alert(err.message)
    }
  }}
  style={{
    marginTop: 8, padding: '14px', border: 'none', borderRadius: 12, cursor: 'pointer',
    background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
    color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '0.4px',
    boxShadow: '0 8px 24px rgba(0,212,255,0.25)', transition: 'all 0.2s ease',
    fontFamily: 'Syne, sans-serif', width: '100%'
  }}
  onMouseEnter={e => e.target.style.transform = 'translateY(-2px)'}
  onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
>
  {isLogin ? 'Enter Moodify →' : 'Create Account →'}
</button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--muted)', fontSize: 13 }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color: 'var(--cyan)', cursor: 'pointer' }} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up free' : 'Log in'}
          </span>
        </p>
      </div>
    </div>
  )
}

function InputField({ name, placeholder, type = 'text', value, onChange, icon }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none', opacity: 0.6 }}>{icon}</span>
      <input
        name={name} type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '13px 16px 13px 42px', borderRadius: 12, fontSize: 14,
          background: focused ? 'rgba(0,212,255,0.05)' : 'rgba(0,0,0,0.25)',
          border: `1px solid ${focused ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
          color: 'var(--text)', outline: 'none', transition: 'all 0.2s ease',
          boxShadow: focused ? '0 0 0 3px rgba(0,212,255,0.08)' : 'none'
        }}
      />
    </div>
  )
}

export default Login