import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getAccount } from '../../infrastructure/database/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session and set up listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getAccount(session.user.id).then(setAccount).catch(console.error)
      }
      setLoading(false)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        getAccount(session.user.id).then(setAccount).catch(console.error)
      } else {
        setAccount(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password) {
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      throw error
    }
    return data.user
  }

  async function signIn(email, password) {
    setError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      throw error
    }
    return data.user
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      setError(error.message)
      throw error
    }
  }

  async function refreshAccount() {
    if (user) {
      const acc = await getAccount(user.id)
      setAccount(acc)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      account,
      loading,
      error,
      signUp,
      signIn,
      signOut,
      refreshAccount,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
