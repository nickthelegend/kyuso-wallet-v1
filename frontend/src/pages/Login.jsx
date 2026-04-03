import { useState } from 'react'
import { supabase } from '../utils/supabase'
import { motion } from 'framer-motion'
import { Mail, Lock, Chrome, Loader2 } from 'lucide-react'

import logo from '../assets/logo.png'

export default function Login() {
    const [mode, setMode] = useState('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        
        const isWebView = !!window.ReactNativeWebView;

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        emailRedirectTo: isWebView ? 'connectwalletexpoapp://auth' : window.location.origin
                    }
                })
                if (error) throw error
                setError("Check your email for the confirmation link!")
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        const isWebView = !!window.ReactNativeWebView;
        console.log("Starting Google Login, isWebView:", isWebView);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: isWebView ? 'connectwalletexpoapp://auth' : window.location.origin,
                skipBrowserRedirect: isWebView
            }
        })
        
        if (error) {
            console.error("Google Login Error:", error.message);
            setError(error.message)
            return
        }

        if (isWebView && data?.url) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'OPEN_AUTH_URL',
                url: data.url
            }));
        }
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
                    <img src={logo} alt="Kyra Logo" style={{ width: '80px', height: '80px', marginBottom: '16px' }} />
                    <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Kyra <span style={{ color: 'var(--primary)' }}>Wallet</span></h1>
                    <p style={{ color: 'var(--text-muted)' }}>{mode === 'login' ? 'The premium custodial wallet' : 'Create your secure account'}</p>
                </div>

                {error && (
                    <div style={{ background: error.includes('Check your email') ? 'rgba(0, 255, 163, 0.1)' : 'rgba(255, 62, 62, 0.1)', color: error.includes('Check your email') ? 'var(--primary)' : 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                        {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or continue with</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="glass"
                    style={{ 
                        width: '100%', 
                        padding: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px', 
                        color: 'white',
                        position: 'relative',
                        zIndex: 10,
                        cursor: 'pointer'
                    }}
                >
                    <Chrome size={20} />
                    Google
                </button>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {mode === 'login' ? "Don't have an account?" : "Already have an account?"} {' '}
                    <span 
                        style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    >
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                    </span>
                </p>
            </motion.div>
        </div>
    )
}
