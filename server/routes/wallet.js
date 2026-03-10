import express from "express"
import verifySupabase from "../middleware/auth.js"
import { supabase } from "../supabase.js"
import axios from "axios"
import algosdk from "algosdk"
import { getVaultToken, getPawnJWT, createWallet, signTransactions, getAssets, getUser, transferAlgo, appCall } from "../pawn.js"

const router = express.Router()

router.post("/", verifySupabase, async (req, res) => {
    const userId = req.user.id

    const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("supabase_user_id", userId)
        .single()

    if (data) {
        return res.json({
            address: data.algo_address
        })
    }

    try {
        const vaultToken = await getVaultToken()
        const pawnJWT = await getPawnJWT(vaultToken)
        const wallet = await createWallet(pawnJWT, userId)

        await supabase.from("wallets").insert({
            supabase_user_id: userId,
            algo_address: wallet.public_address
        })

        res.json({ address: wallet.public_address })
    } catch (error) {
        console.error("Error creating wallet:", error)
        res.status(500).json({ error: "Failed to create wallet" })
    }
})

router.post("/sign", verifySupabase, async (req, res) => {
    const { transactions, isMsgpack } = req.body
    const userId = req.user.id

    let formattedTransactions = []

    if (isMsgpack) {
        formattedTransactions = transactions.map(tBase64 => {
            try {
                const bytes = Buffer.from(tBase64, 'base64')
                const txn = algosdk.decodeUnsignedTransaction(bytes)

                // Get the raw object for mapping
                // Fallback for different algosdk versions
                const obj = (typeof txn.get_obj_for_encoding === 'function')
                    ? txn.get_obj_for_encoding()
                    : JSON.parse(JSON.stringify(txn))

                const type = obj.type || txn.type

                if (type === 'pay') {
                    return {
                        type: 'payment',
                        payload: {
                            toAddress: algosdk.encodeAddress(obj.rcv || txn.payment?.receiver?.publicKey || txn.to?.publicKey),
                            amount: Number(obj.amt || txn.amount || txn.payment?.amount || 0),
                            fromUserId: userId,
                            note: (obj.note || txn.note) ? Buffer.from(obj.note || txn.note).toString() : "Signed via AlgoVault"
                        }
                    }
                } else if (type === 'appl') {
                    return {
                        type: 'appCall',
                        payload: {
                            appId: Number(obj.apid || txn.appIndex || txn.application?.appIndex || 0),
                            fromUserId: userId,
                            appArgs: (obj.apaa || txn.appArgs || txn.application?.appArgs || []).map(arg => Buffer.from(arg).toString()),
                            onComplete: obj.apan || txn.appOnComplete || txn.application?.appOnComplete || 0,
                            foreignAccounts: (obj.apat || txn.application?.accounts || []).map(a => algosdk.encodeAddress(a)),
                            foreignAssets: (obj.apas || txn.application?.foreignAssets || []).map(a => Number(a)),
                            foreignApps: (obj.apfa || txn.application?.foreignApps || []).map(a => Number(a))
                        }
                    }
                } else if (type === 'axfer') {
                    return {
                        type: 'assetTransfer',
                        payload: {
                            assetId: Number(obj.xaid || txn.assetIndex || txn.assetTransfer?.assetIndex || 0),
                            amount: Number(obj.aamt || txn.amount || txn.assetTransfer?.amount || 0),
                            toAddress: algosdk.encodeAddress(obj.arcv || txn.assetTransfer?.receiver?.publicKey || txn.to?.publicKey),
                            fromUserId: userId
                        }
                    }
                } else if (type === 'acfg') {
                    const config = obj.apar || txn.assetConfig || {};
                    const getStr = (v) => v ? (typeof v === 'string' ? v : Buffer.from(v).toString()) : "";
                    const getAddr = (v) => {
                        try { return v ? algosdk.encodeAddress(v) : undefined } catch (e) { return undefined }
                    };

                    return {
                        type: 'assetConfig',
                        payload: {
                            total: Number(config.t || config.total || 0),
                            decimals: Number(config.dc || config.decimals || 0),
                            unitName: getStr(config.un || config.unitName),
                            assetName: getStr(config.an || config.assetName),
                            url: getStr(config.au || config.assetURL),
                            managerAddress: getAddr(config.m || config.manager),
                            reserveAddress: getAddr(config.r || config.reserve),
                            freezeAddress: getAddr(config.f || config.freeze),
                            clawbackAddress: getAddr(config.c || config.clawback)
                        }
                    }
                }
                return { error: "Unsupported transaction type", type }
            } catch (err) {
                console.error("Decode failed:", err.message)
                return { error: "Decode failed", details: err.message }
            }
        })
    } else {
        // Transform incoming plain txns into Intermezzo group-transaction format
        formattedTransactions = transactions.map(txn => ({
            type: 'payment',
            payload: {
                toAddress: txn.to || txn.receiver,
                amount: Number(txn.amount),
                fromUserId: userId,
                note: txn.note || "Signed via AlgoVault"
            }
        }))
    }

    try {
        const vaultToken = await getVaultToken()
        const pawnJWT = await getPawnJWT(vaultToken)

        let result;
        const isSingle = formattedTransactions.length === 1 && !formattedTransactions[0].error;
        const first = isSingle ? formattedTransactions[0] : null;

        if (isSingle && first.type === 'payment') {
            const p = first.payload
            console.log("[Sign] Simple payment - using transfer-algo endpoint")
            const txRes = await transferAlgo(pawnJWT, userId, p.toAddress, p.amount, p.note)
            result = { txId: txRes.transaction_id, signed_transactions: [txRes.transaction_id] }
        } else if (isSingle && first.type === 'appCall') {
            const p = first.payload
            console.log("[Sign] Simple App Call - using app-call endpoint")
            const txRes = await appCall(pawnJWT, userId, p.appId, p.appArgs)
            result = { txId: txRes.transaction_id, signed_transactions: [txRes.transaction_id] }
        } else {
            console.log("[Sign] Grouped or specialized txn - using group-transaction (Caution: may 403 if Manager key is restricted)")
            result = await signTransactions(pawnJWT, userId, formattedTransactions)
        }

        res.json(result)
    } catch (error) {
        const errorData = error.response?.data
        console.error("Signing failed. Status:", error.response?.status, "Data:", errorData)

        if (error.response?.status === 403) {
            return res.status(403).json({
                error: "Vault Permission Denied",
                message: "403 Forbidden: The current Vault Role ID does not have 'update' (sign) permissions for the transit keys. Check your Vault Policy."
            })
        }

        res.status(500).json({ error: "Failed to sign transactions", details: errorData || error.message })
    }
})

router.get("/", verifySupabase, async (req, res) => {
    const userId = req.user.id

    const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("supabase_user_id", userId)
        .single()

    res.json(data)
})

router.get("/details", verifySupabase, async (req, res) => {
    const userId = req.user.id
    try {
        const vaultToken = await getVaultToken()
        const pawnJWT = await getPawnJWT(vaultToken)
        const details = await getUser(pawnJWT, userId)
        res.json(details)
    } catch (error) {
        console.error("Error fetching user details:", error.message)
        res.status(500).json({ error: "Failed to fetch user details" })
    }
})

router.get("/assets", verifySupabase, async (req, res) => {
    const userId = req.user.id
    try {
        const vaultToken = await getVaultToken()
        const pawnJWT = await getPawnJWT(vaultToken)
        const assets = await getAssets(pawnJWT, userId)
        res.json(assets)
    } catch (error) {
        console.error("Error fetching assets:", error.message)
        res.status(500).json({ error: "Failed to fetch assets" })
    }
})

export default router
