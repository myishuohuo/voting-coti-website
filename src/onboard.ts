import {Eip1193Provider} from "ethers"
import {
    BrowserProvider,
    JsonRpcSigner
} from "@coti-io/coti-ethers";

export async function setupAccount(address: string) {
    const ethereumProvider = window.ethereum as Eip1193Provider;
    const provider = new BrowserProvider(ethereumProvider);

    const wallet: JsonRpcSigner = await provider.getSigner(0);

    let aeskey = sessionStorage.getItem("aeskey " + address)
    if (aeskey) {
        wallet.setAesKey(aeskey)
        console.log("aeskey exist:")
        return wallet
    }
    await wallet.generateOrRecoverAes()

    sessionStorage.setItem("aeskey " + address, wallet.getUserOnboardInfo()?.aesKey)
    console.log("aeskey not exist:")
    return wallet
}