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
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) return null

    return (
        <Router>
            <div className="bg-glow bg-glow-top"></div>
            <div className="bg-glow bg-glow-bottom"></div>
            <Routes>
                <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
                <Route path="/rpc" element={session ? <WalletRPC session={session} /> : <Navigate to="/login" />} />
                <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
            </Routes>
        </Router>
    )
}

export default App
