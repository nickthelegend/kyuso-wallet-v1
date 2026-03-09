import "dotenv/config"
import express from "express"
import cors from "cors"

import walletRoutes from "./routes/wallet.js"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/wallet", walletRoutes)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log("Server running on port", PORT)
})
