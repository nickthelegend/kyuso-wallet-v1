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

export async function getUser(pawnJWT, userId) {
    const res = await axios.get(
        `${process.env.PAWN_URL}/v1/wallet/users/${userId}`,
        {
            headers: {
                Authorization: `Bearer ${pawnJWT}`
            }
        }
    )
    return res.data
}

export async function getAssets(pawnJWT, userId) {
    const res = await axios.get(
        `${process.env.PAWN_URL}/v1/wallet/assets/${userId}`,
        {
            headers: {
                Authorization: `Bearer ${pawnJWT}`
            }
        }
    )
    return res.data
}

export async function transferAlgo(pawnJWT, fromUserId, toAddress, amount, note, lease, fromAddress) {
    const res = await axios.post(
        `${process.env.PAWN_URL}/v1/wallet/transactions/transfer-algo`,
        { fromUserId, toAddress, amount, note, lease, fromAddress },
        { headers: { Authorization: `Bearer ${pawnJWT}` } }
    )
    return res.data
}

export async function transferAsset(pawnJWT, assetId, userId, amount, note, lease) {
    const res = await axios.post(
        `${process.env.PAWN_URL}/v1/wallet/transactions/transfer-asset`,
        { assetId, userId, amount, note, lease },
        { headers: { Authorization: `Bearer ${pawnJWT}` } }
    )
    return res.data
}

export async function appCall(pawnJWT, fromUserId, appId, appArgs = [], fromAddress) {
    const res = await axios.post(
        `${process.env.PAWN_URL}/v1/wallet/transactions/app-call`,
        { fromUserId, appId, appArgs, onComplete: 0, fromAddress },
        { headers: { Authorization: `Bearer ${pawnJWT}` } }
    )
    return res.data
}

export async function signTransactions(pawnJWT, userId, txns) {
    // Use the correct endpoint found in your logs
    const res = await axios.post(
        `${process.env.PAWN_URL}/v1/wallet/transactions/group-transaction`,
        {
            user_id: userId,
            transactions: txns
        },
        {
            headers: {
                Authorization: `Bearer ${pawnJWT}`
            }
        }
    )
    return res.data
}
