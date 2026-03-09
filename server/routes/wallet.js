import express from "express"
import verifySupabase from "../middleware/auth.js"
import { supabase } from "../supabase.js"
import { getVaultToken, getPawnJWT, createWallet } from "../pawn.js"

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

router.get("/", verifySupabase, async (req, res) => {
    const userId = req.user.id

    const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("supabase_user_id", userId)
        .single()

    res.json(data)
})

export default router
