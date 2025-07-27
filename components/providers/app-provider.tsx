"use client"

import { createContext, useContext, useState, type ReactNode, useEffect } from "react"

interface Animal {
  id: string
  name: string
  species: string
  avatar?: string
  pendingMeds: number
}

interface Household {
  id: string
  name: string
  avatar?: string
}

interface AppContextType {
  selectedHousehold: Household
  setSelectedHousehold: (household: Household) => void
  selectedAnimal: Animal | null
  setSelectedAnimal: (animal: Animal | null) => void
  animals: Animal[]
  households: Household[]
  isOffline: boolean
  pendingSyncCount: number
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedHousehold, setSelectedHousehold] = useState<Household>({
    id: "1",
    name: "Smith Family",
    avatar: "/placeholder.svg?height=32&width=32",
  })

  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const households: Household[] = [
    { id: "1", name: "Smith Family", avatar: "/placeholder.svg?height=32&width=32" },
    { id: "2", name: "Johnson Ranch", avatar: "/placeholder.svg?height=32&width=32" },
  ]

  const animals: Animal[] = [
    { id: "1", name: "Buddy", species: "Dog", pendingMeds: 2, avatar: "/placeholder.svg?height=40&width=40" },
    { id: "2", name: "Whiskers", species: "Cat", pendingMeds: 1, avatar: "/placeholder.svg?height=40&width=40" },
    { id: "3", name: "Charlie", species: "Dog", pendingMeds: 0, avatar: "/placeholder.svg?height=40&width=40" },
    { id: "4", name: "Luna", species: "Cat", pendingMeds: 3, avatar: "/placeholder.svg?height=40&width=40" },
  ]

  return (
    <AppContext.Provider
      value={{
        selectedHousehold,
        setSelectedHousehold,
        selectedAnimal,
        setSelectedAnimal,
        animals,
        households,
        isOffline,
        pendingSyncCount,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
