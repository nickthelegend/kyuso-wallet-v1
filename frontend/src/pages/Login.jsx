import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { motion } from 'framer-motion'
import { Mail, Lock, Chrome, Loader2 } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        })
        if (error) setError(error.message)
    }

    return (
        <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass"
                style={{ width: '100%', maxWidth: '400px', padding: '40px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Algo<span style={{ color: 'var(--primary)' }}>Vault</span></h1>
                    <p style={{ color: 'var(--text-muted)' }}>The premium custodial wallet for Algorand</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(255, 62, 62, 0.1)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ position: 'relative' }}>
                        <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            required
                        />
                    </div>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ paddingLeft: '40px' }}
                            required
                        />
                    </div>

                    <button type="submit" className="glow-btn" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="glass"
                    style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'white' }}
                >
                    <Chrome size={20} />
                    Google
                </button>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Don't have an account? <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Sign Up</span>
                </p>
            </motion.div>
        </div>
    )
}
