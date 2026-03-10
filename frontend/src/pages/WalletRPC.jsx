import { useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { Check, Shield, X, ArrowRight, Wallet } from 'lucide-react'
import api from '../utils/api'
import algosdk from 'algosdk'

export default function WalletRPC({ session }) {
    const [params, setParams] = useState(null)
    const [wallet, setWallet] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [signed, setSigned] = useState(false)
    const [decodedTxns, setDecodedTxns] = useState([])

    // Motion values for slider
    const x = useMotionValue(0)
    const background = useTransform(x, [0, 200], ["rgba(255, 255, 255, 0.05)", "var(--primary)"])
    const color = useTransform(x, [0, 200], ["#ffffff", "#000000"])

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        const type = searchParams.get('type')
        const dataStr = searchParams.get('data')
        const txnsStr = searchParams.get('txns')

        let parsedData = null
        let decoded = []

        if (txnsStr) {
            const rawTxns = JSON.parse(decodeURIComponent(txnsStr))
            parsedData = rawTxns // Base64 msgpack array

            // Decode for UI display
            decoded = rawTxns.map(t => {
                try {
                    const bytes = new Uint8Array(atob(t).split('').map(c => c.charCodeAt(0)))
                    const txn = algosdk.decodeUnsignedTransaction(bytes)

                    // Fallback for algosdk v3.x
                    if (typeof txn.get_obj_for_encoding === 'function') {
                        return txn.get_obj_for_encoding()
                    }

                    // Direct access/stringify for v3.x - handle BigInt serialization
                    const obj = JSON.parse(JSON.stringify(txn, (key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    ))
                    return {
                        ...obj,
                        type: obj.type,
                        sender: txn.sender ? txn.sender.toString() : 'Unknown',
                        receiver: (txn.payment?.receiver || txn.assetTransfer?.receiver || txn.to || obj.rcv || obj.arcv)?.toString(),
                        amount: String(txn.payment?.amount || txn.assetTransfer?.amount || obj.amt || obj.aamt || 0),
                        appIndex: String(txn.application?.appIndex || obj.apid || 0),
                        assetIndex: String(txn.assetTransfer?.assetIndex || obj.xaid || 0),
                        note: txn.note ? new TextDecoder().decode(txn.note) : undefined
                    }
                } catch (e) {
                    console.error("UI Decode fail:", e)
                    return { error: "Failed to decode", details: e.message }
                }
            })
        } else if (dataStr) {
            parsedData = JSON.parse(atob(dataStr))
        }

        setParams({ type, data: parsedData })
        setDecodedTxns(decoded)
        fetchWallet()
    }, [])

    const fetchWallet = async () => {
        try {
            const { data } = await api.post('/wallet', {}, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            setWallet(data)
        } catch (err) {
            setError("Failed to load wallet")
        } finally {
            setLoading(false)
        }
    }

    const handleResponse = (data) => {
        if (window.opener) {
            window.opener.postMessage({ type: 'ALGO_WALLET_RESPONSE', ...data }, '*')
            window.close()
        }
    }

    const handleComplete = async () => {
        if (params.type === 'connect') {
            handleResponse({ address: wallet.public_address, name: 'AlgoVault Custodial' })
        } else if (params.type === 'sign') {
            try {
                setLoading(true)
                // CALL REAL BACKEND SIGNING
                const response = await api.post('/wallet/sign', {
                    transactions: params.data,
                    isMsgpack: !!decodedTxns.length // Tell backend if these are base64 msgpack
                }, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                })

                setSigned(true)
                setTimeout(() => {
                    handleResponse({ signedTxns: response.data.signed_transactions || [] })
                }, 1500)
            } catch (err) {
                const msg = err.response?.data?.message || err.response?.data?.error || err.message
                setError("Signing failed: " + msg)
                x.set(0)
            } finally {
                setLoading(false)
            }
        }
    }

    const onDragEnd = (_, info) => {
        if (info.offset.x > 180) {
            handleComplete()
        } else {
            x.set(0)
        }
    }

    if (loading) return <div className="page-container center">Loading...</div>

    return (
        <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass"
                style={{ width: '100%', maxWidth: '400px', padding: '32px', textAlign: 'center' }}
            >
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(0, 255, 163, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        {params?.type === 'connect' ? <Wallet color="var(--primary)" size={32} /> : <Shield color="var(--primary)" size={32} />}
                    </div>
                    <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {params?.type === 'connect' ? 'Connect Wallet' : 'Sign Transaction'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                        {params?.type === 'connect'
                            ? 'Authorize this app to see your wallet address.'
                            : 'Review and sign the requested transactions.'}
                    </p>
                </div>

                <div className="glass" style={{ padding: '16px', marginBottom: '32px', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>WALLET ADDRESS</p>
                    <p className="mono" style={{ fontSize: '13px', wordBreak: 'break-all' }}>{wallet?.address || wallet?.public_address}</p>
                </div>

                {params?.type === 'sign' && (
                    <div style={{ marginBottom: '32px', textAlign: 'left' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>TRANSACTION DETAILS</p>
                        <div style={{ fontSize: '13px', maxHeight: '100px', overflowY: 'auto', background: '#000', padding: '12px', borderRadius: '8px' }}>
                            <pre className="mono" style={{ color: 'var(--primary)' }}>
                                {JSON.stringify(decodedTxns.length ? decodedTxns : params.data, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {error && <p style={{ color: 'var(--error)', marginBottom: '20px' }}>{error}</p>}

                {!signed ? (
                    <div style={{ position: 'relative', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '30px', padding: '5px', overflow: 'hidden' }}>
                        <motion.div
                            style={{ background, color, position: 'absolute', left: '5px', top: '5px', bottom: '5px', width: '200px', zIndex: 0, borderRadius: '25px' }}
                        />
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 280 }}
                            style={{
                                x,
                                width: '50px',
                                height: '50px',
                                borderRadius: '25px',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'grab',
                                zIndex: 1,
                                position: 'relative'
                            }}
                            onDragEnd={onDragEnd}
                            className="glass"
                        >
                            <ArrowRight color="black" size={24} />
                        </motion.div>
                        <div style={{ position: 'absolute', width: '100%', top: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', fontSize: '14px', fontWeight: '600' }}>
                            Slide to {params?.type === 'connect' ? 'Connect' : 'Sign'}
                        </div>
                    </div>
                ) : (
                    <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} style={{ color: 'var(--primary)', fontWeight: '600' }}>
                        <Check size={48} style={{ margin: '0 auto 16px' }} />
                        Transaction Signed!
                    </motion.div>
                )}

                <button
                    onClick={() => window.close()}
                    style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', margin: '24px auto 0' }}
                >
                    <X size={14} /> Cancel Request
                </button>
            </motion.div>

            {/* Debug Info */}
            <div style={{ position: 'fixed', bottom: '20px', left: '20px', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                RPC DEBUG: {params?.type} | {wallet?.public_address?.substring(0, 8)}...
            </div>
        </div>
    )
}
