import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useMobileNav } from '../context/MobileNavContext'
import { 
  Home, 
  Search, 
  Radio, 
  Heart, 
  Clock, 
  Moon, 
  Sun, 
  X,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const NAV_LIB = [
  { label: 'Browse', path: '/dashboard', icon: Home },
  { label: 'Library', path: '/library', icon: LayoutGrid },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Jam Session', path: '/jam', icon: Radio },
]

const NAV_MUSIC = [
  { label: 'Liked Songs', path: '/liked', icon: Heart },
  { label: 'Recently Played', path: '/recent', icon: Clock },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { isSidebarOpen, closeSidebar } = useMobileNav()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleNav = (path) => {
    navigate(path)
    closeSidebar()
  }

  return (
    <>
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} 
        onClick={closeSidebar} 
      />
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" onClick={() => !isCollapsed && navigate('/dashboard')} style={{ cursor: isCollapsed ? 'default' : 'pointer' }}>
          <img src="/logo.png" alt="Moodify Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          {!isCollapsed && <span className="sidebar-logo-text">Moodify</span>}
          <button 
            className="collapse-btn" 
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button 
            className="mobile-close" 
            onClick={(e) => { e.stopPropagation(); closeSidebar(); }}
            style={{ marginLeft: 'auto', fontSize: 24, display: 'none', color: 'var(--text-primary)' }}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!isCollapsed && <span className="nav-section-title">Menu</span>}
            {NAV_LIB.map(item => {
              const active = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={() => handleNav(item.path)}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="nav-item-icon"><Icon size={18} /></span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>

          <div className="nav-section">
            {!isCollapsed && <span className="nav-section-title">Your Collection</span>}
            {NAV_MUSIC.map(item => {
              const active = location.pathname === item.path
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`nav-item${active ? ' active' : ''}`}
                  onClick={() => handleNav(item.path)}
                  title={isCollapsed ? item.label : ''}
                >
                  <span className="nav-item-icon"><Icon size={18} /></span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="sidebar-footer">
          <button 
            onClick={toggleTheme} 
            className="nav-item" 
            style={{ 
              justifyContent: isCollapsed ? 'center' : 'flex-start', 
              background: 'var(--surface)', 
              border: '1px solid var(--border)',
              padding: isCollapsed ? '10px 0' : '10px 12px'
            }}
            title={isCollapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
          >
            <span className="nav-item-icon">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            {!isCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 768px) {
            .mobile-close { display: block !important; }
          }
        `}} />
      </aside>
    </>
  )
}
