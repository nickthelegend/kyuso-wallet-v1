import algosdk from "algosdk"

async function test() {
    try {
        const algodClient = new algosdk.Algodv2('', 'https://testnet-api.algonode.cloud', '')
        const address = "4TZ4OZYQMBSJCBC7PDWAN4VFN6IKPIAG5NABNFNKRCGLCNBJGH4JTENIQE"
        const info = await algodClient.accountInformation(address).do()
        console.log("Balance:", info.amount)
    } catch (e) {
        console.error("Test failed:", e.message)
    }
}

test()
