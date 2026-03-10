import { supabase } from "../supabase.js"

export default async function verifySupabase(req, res, next) {
    const header = req.headers.authorization

    if (!header) return res.status(401).json({ error: "Missing token" })

    const token = header.split(" ")[1]

    try {
        console.log("[Auth] Verifying token...")
        const { data: { user }, error } = await supabase.auth.getUser(token)

        if (error || !user) {
            console.warn("[Auth] Invalid User/Token:", error?.message || "No user found")
            return res.status(401).json({ error: "Invalid token" })
        }

        console.log("[Auth] Success. User:", user.email)
        req.user = user
        next()
    } catch (err) {
        console.error("Auth middleware error:", err)
        return res.status(401).json({ error: "Auth service error" })
    }
}
