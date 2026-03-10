import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { Copy, ExternalLink, RefreshCw, Wallet, LogOut, ChevronRight, ShieldCheck, Zap } from 'lucide-react'
import { supabase } from '../utils/supabase'

export default function Dashboard({ session }) {
    const [wallet, setWallet] = useState(null)
    const [details, setDetails] = useState(null)
    const [assets, setAssets] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copying, setCopying] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const headers = { Authorization: `Bearer ${session.access_token}` }

            // Fetch Wallet Mapping
            const walletRes = await axios.post('/api/wallet', {}, { headers })
            setWallet(walletRes.data)

            // Fetch User Details from Intermezzo
            const detailsRes = await axios.get('/api/wallet/details', { headers })
            setDetails(detailsRes.data)

            // Fetch Intermezzo Assets
            const assetsRes = await axios.get('/api/wallet/assets', { headers })
            setAssets(assetsRes.data)
        } catch (err) {
            console.error('Error fetching dashboard data:', err)
            setError('Failed to load wallet data. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopying(true)
        setTimeout(() => setCopying(false), 2000)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
    }

    return (
        <div className="page-container">
            {/* Navbar */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '24px' }}>Algo<span style={{ color: 'var(--primary)' }}>Vault</span></h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '14px', fontWeight: '500' }}>{session.user.email}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verified User</p>
                    </div>
                    <button onClick={handleLogout} className="glass" style={{ padding: '8px', borderRadius: '10px' }}>
                        <LogOut size={18} color="var(--error)" />
                    </button>
                </div>
            </nav>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                {/* Main Section */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Wallet Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass"
                        style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}
                    >
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                            <Wallet size={150} />
                        </div>

                        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShieldCheck size={16} color="var(--primary)" /> Encrypted Custodial Wallet
                        </p>

                        {loading ? (
                            <div style={{ padding: '20px 0' }}>
                                <div style={{ height: '40px', background: 'var(--border)', borderRadius: '8px', width: '80%', marginBottom: '12px' }} className="animate-pulse"></div>
                                <div style={{ height: '24px', background: 'var(--border)', borderRadius: '8px', width: '40%' }} className="animate-pulse"></div>
                            </div>
                        ) : error ? (
                            <div>
                                <p style={{ color: 'var(--error)' }}>{error}</p>
                                <button onClick={fetchWallet} style={{ color: 'var(--primary)', marginTop: '8px', fontSize: '14px' }}>Try Again</button>
                            </div>
                        ) : (
                            <div>
                                <h2 className="mono" style={{ fontSize: '20px', wordBreak: 'break-all', marginBottom: '24px', maxWidth: '90%' }}>
                                    {wallet?.public_address || 'Generation in progress...'}
                                </h2>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        onClick={() => copyToClipboard(wallet?.public_address)}
                                        className="glass"
                                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: copying ? 'var(--primary)' : 'white' }}
                                    >
                                        <Copy size={16} /> {copying ? 'Copied!' : 'Copy Address'}
                                    </button>
                                    <button className="glass" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'white' }}>
                                        <ExternalLink size={16} /> Explorer
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Activity Placeholder */}
                    <div className="glass" style={{ padding: '24px', flex: 1 }}>
                        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Zap size={18} color="var(--primary)" /> Asset Holdings
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {assets?.assets && assets.assets.length > 0 ? (
                                assets.assets.map(asset => (
                                    <div key={asset['asset-id']} style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '20px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <RefreshCw size={16} color="var(--primary)" />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '14px', fontWeight: '500' }}>Asset ID: {asset['asset-id']}</p>
                                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Amount: {asset.amount}</p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No non-ALGO assets found.</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Sidebar */}
                <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(0, 255, 163, 0.05) 0%, rgba(0, 224, 255, 0.05) 100%)' }}>
                        <h3 style={{ marginBottom: '8px' }}>Asset Balance</h3>
                        <p style={{ fontSize: '32px', fontWeight: '700' }}>
                            {details ? (Number(details.algoBalance) / 1000000).toFixed(2) : '0.00'}
                            <span style={{ fontSize: '16px', color: 'var(--primary)', marginLeft: '8px' }}>ALGO</span>
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Verified Custodial Account</p>

                        <button className="glow-btn" style={{ width: '100%', marginTop: '24px', justifyContent: 'center' }}>
                            Send Assets
                        </button>
                    </div>

                    <div className="glass" style={{ padding: '24px' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>SECURITY STATUS</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--primary)' }}></div>
                                <p style={{ fontSize: '13px' }}>2FA Enabled</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--primary)' }}></div>
                                <p style={{ fontSize: '13px' }}>Vault Keys Encrypted</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '4px', background: 'var(--primary)' }}></div>
                                <p style={{ fontSize: '13px' }}>Biometric Sync Active</p>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    )
}
