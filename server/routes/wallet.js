import express from "express"
import verifySupabase from "../middleware/auth.js"
import { supabase } from "../supabase.js"
import axios from "axios"
import algosdk from "algosdk"
import { getVaultToken, getPawnJWT, createWallet, signTransactions, getAssets, getUser, transferAlgo, appCall } from "../pawn.js"

const router = express.Router()

router.post("/", verifySupabase, async (req, res) => {
    const userId = req.user.id

    const { data, error: fetchError } = await supabase
        .from("wallets")
        .select("*")
        .eq("supabase_user_id", userId)
        .single()

    console.log("[CreateWallet] Supabase Lookup Result:", data ? "Found" : "Not Found", fetchError?.message || "")

    if (data) {
        return res.json({
            address: data.algo_address,
            public_address: data.algo_address
        })
    }

    try {
        console.log("[CreateWallet] Fetching Vault Token...")
        const vaultToken = await getVaultToken()
        console.log("[CreateWallet] Vault Token Fetched. Fetching Pawn JWT...")

        const pawnJWT = await getPawnJWT(vaultToken)
        console.log("[CreateWallet] Pawn JWT Fetched. Creating Wallet in Intermezzo...")

        const wallet = await createWallet(pawnJWT, userId)
        console.log("[CreateWallet] Wallet Created in Intermezzo:", wallet.public_address)

        const { error: insertError } = await supabase.from("wallets").insert({
            supabase_user_id: userId,
            algo_address: wallet.public_address
        })

        if (insertError) {
            console.error("[CreateWallet] Supabase Insert Error:", insertError)
            throw insertError
        }

        console.log("[CreateWallet] Success. Returning address.")
        res.json({ address: wallet.public_address, public_address: wallet.public_address })
    } catch (error) {
        console.error("Error creating wallet:", error.response?.data || error.message)
        res.status(500).json({ error: "Failed to create wallet", details: error.response?.data })
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

                // Safe object conversion handling BigInt across all algosdk versions
                let obj;
                if (typeof txn.get_obj_for_encoding === 'function') {
                    const raw = txn.get_obj_for_encoding();
                    obj = JSON.parse(JSON.stringify(raw, (k, v) => typeof v === 'bigint' ? v.toString() : v));
                } else {
                    obj = JSON.parse(JSON.stringify(txn, (k, v) => typeof v === 'bigint' ? v.toString() : v));
                }

                const type = obj.type || txn.type

                if (type === 'pay') {
                    return {
                        type: 'payment',
                        payload: {
                            toAddress: algosdk.encodeAddress(obj.rcv || txn.payment?.receiver?.publicKey || txn.to?.publicKey || new Uint8Array(obj.rcv || [])),
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
                            appArgs: (obj.apaa || txn.appArgs || txn.application?.appArgs || []).map(arg => {
                                return typeof arg === 'string' ? arg : Buffer.from(arg).toString('base64');
                            }),
                            onComplete: Number(obj.apan || txn.appOnComplete || txn.application?.appOnComplete || 0),
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
                            toAddress: algosdk.encodeAddress(obj.arcv || txn.assetTransfer?.receiver?.publicKey || txn.to?.publicKey || new Uint8Array(obj.arcv || [])),
                            fromUserId: userId
                        }
                    }
                } else if (type === 'acfg') {
                    const config = obj.apar || txn.assetConfig || {};
                    const getStr = (v) => v ? (typeof v === 'string' ? v : Buffer.from(v).toString()) : "";
                    const getAddr = (v) => {
                        try { return v ? algosdk.encodeAddress(typeof v === 'string' ? algosdk.decodeAddress(v).publicKey : v) : undefined } catch (e) { return undefined }
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
                console.error("Decode failed stack:", err.stack)
                return { error: "Decode failed", details: `${err.message} at mapping` }
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

        // Pre-flight check: ensure all steps are valid
        const invalidStep = formattedTransactions.find(t => t.error || !t.type || !t.payload)
        if (invalidStep) {
            console.error("[Sign] Invalid step detected:", invalidStep)
            return res.status(400).json({ error: "Invalid transaction format", details: invalidStep })
        }

        console.log("[Sign] Final Formatted Transactions:", JSON.stringify(formattedTransactions, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2))

        let result;
        const isSingle = formattedTransactions.length === 1;
        const first = formattedTransactions[0];

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
            console.log("[Sign] Grouped or specialized txn - using group-transaction")
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
        console.log("[Details] Fetching details directly from node for:", userId)
        
        const { data: wallet, error: dbError } = await supabase
            .from("wallets")
            .select("algo_address")
            .eq("supabase_user_id", userId)
            .single()

        if (dbError || !wallet) {
            return res.status(404).json({ error: "Wallet not found in database. Please initialize first." })
        }

        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
        const accountInfo = await algodClient.accountInformation(wallet.algo_address).do()
        
        console.log("[Details] Node Success for:", wallet.algo_address)
        res.json({
            user_id: userId,
            public_address: wallet.algo_address,
            algoBalance: accountInfo.amount.toString()
        })
    } catch (error) {
        console.error("Error fetching user details from node:", error.message)
        res.status(500).json({ error: "Failed to fetch user details from network", details: error.message })
    }
})

router.get("/assets", verifySupabase, async (req, res) => {
    const userId = req.user.id
    try {
        console.log("[Assets] Fetching assets directly from node for:", userId)

        const { data: wallet, error: dbError } = await supabase
            .from("wallets")
            .select("algo_address")
            .eq("supabase_user_id", userId)
            .single()

        if (dbError || !wallet) {
            return res.status(404).json({ error: "Wallet not found. Please initialize first." })
        }

        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
        const accountInfo = await algodClient.accountInformation(wallet.algo_address).do()

        console.log("[Assets] Node Success for:", wallet.algo_address)
        res.json({
            address: wallet.algo_address,
            assets: accountInfo.assets || []
        })
    } catch (error) {
        console.error("Error fetching assets from node:", error.message)
        res.status(500).json({ error: "Failed to fetch assets from network", details: error.message })
    }
})

export default router
