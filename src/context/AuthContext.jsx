import { createContext, useContext, useState, useEffect } from 'react'
import pb from '../services/pocketbase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(pb.authStore.model)

  useEffect(() => {
    return pb.authStore.onChange((token, model) => {
      setUser(model)
    })
  }, [])

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}