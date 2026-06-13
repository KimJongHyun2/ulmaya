"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: number
  kakao_id?: string
  nickname: string
  email?: string
  profile_image?: string
}

interface UserContextValue {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        const data = (await response.json()) as { user: User | null }
        setUser(data.user)
      } catch (error) {
        console.error("Failed to load auth session", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadSession()
  }, [])

  const logout = () => {
    setUser(null)
  }

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, setIsLoading, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within UserProvider")
  }
  return context
}
