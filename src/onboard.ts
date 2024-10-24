import {Eip1193Provider} from "ethers"
import detectEthereumProvider from '@metamask/detect-provider';
import {
    BrowserProvider,
    JsonRpcSigner
} from "@coti-io/coti-ethers";

export async function setupAccount(address: string) {
    let provider;
    if (window.okexchain) {
        provider = window.okexchain;
    }else{
        provider = await detectEthereumProvider();
    }
    const browserProvider = new BrowserProvider(provider);

    const wallet: JsonRpcSigner = await browserProvider.getSigner(address);

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