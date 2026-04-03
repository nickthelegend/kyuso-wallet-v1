import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import WalletRPC from './pages/WalletRPC'

function App() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log("App loaded with search params:", window.location.search)
        // Debugging auth state transitions
        supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth event:", event)
            if (session) {
                console.log("Logged in session:", session.user.email)
                setSession(session)
            } else {
                console.log("No session")
                setSession(null)
            }
            setLoading(false)
        })

        // Initial session fetch
        const checkSession = async () => {
            try {
                // Explicit exchange for PKCE flows
                if (window.location.search.includes('code=')) {
                    await supabase.auth.exchangeCodeForSession(window.location.href)
                }
                const { data: { session } } = await supabase.auth.getSession()
                setSession(session)
            } catch (err) {
                console.error("Session check error:", err)
            } finally {
                setLoading(false)
            }
        }

        checkSession()
    }, [])

    if (loading) return null

    return (
        <Router>
            <div className="bg-glow bg-glow-top"></div>
            <div className="bg-glow bg-glow-bottom"></div>
            <Routes>
                <Route path="/login" element={!session ? <Login /> : <Navigate to={`/${window.location.search}`} />} />
                <Route path="/rpc" element={session ? <WalletRPC session={session} /> : <Navigate to={`/login${window.location.search}`} />} />
                <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to={`/login${window.location.search}`} />} />
            </Routes>
        </Router>
    )
}

export default App
