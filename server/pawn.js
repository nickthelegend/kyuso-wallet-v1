import axios from "axios"

export async function getVaultToken() {
    const res = await axios.post(`${process.env.VAULT_URL}/v1/auth/approle/login`, {
        role_id: process.env.VAULT_ROLE_ID,
        secret_id: process.env.VAULT_SECRET_ID
    })
    return res.data.auth.client_token
}

export async function getPawnJWT(vaultToken) {
    const res = await axios.post(`${process.env.PAWN_URL}/v1/auth/sign-in`, {
        vault_token: vaultToken
    })
    return res.data.access_token
}

export async function createWallet(pawnJWT, userId) {
    const res = await axios.post(
        `${process.env.PAWN_URL}/v1/wallet/user`,
        { user_id: userId },
        {
            headers: {
                Authorization: `Bearer ${pawnJWT}`
            }
        }
    )
    return res.data
}
