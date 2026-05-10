import { createContext, useContext, useState } from 'react'

const MobileNavContext = createContext()

export function MobileNavProvider({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <MobileNavContext.Provider value={{ isSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </MobileNavContext.Provider>
  )
}

export function useMobileNav() {
  return useContext(MobileNavContext)
}
