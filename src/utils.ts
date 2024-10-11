import {REVEAL_URL, ETHER_SCAN, RPC_URL, NETWORK_ID, NETWORK_NAME, NATIVE_CURRENCY, FHET_FAUCET, ETH_FAUCET } from './constants';
import axios from 'axios';
import Swal from 'sweetalert2';




export const addNetwork = async (provider) => {
    try {
        if (provider) {
            const chainIdHex = '0x' + parseInt(NETWORK_ID, 10).toString(16);
            const result = await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: chainIdHex,
                    chainName: NETWORK_NAME,
                    nativeCurrency: {
                        name: NATIVE_CURRENCY,
                        symbol: NATIVE_CURRENCY,
                        decimals: 18
                    },
                    rpcUrls: [RPC_URL],
                    blockExplorerUrls: [ETHER_SCAN],
                }]
            });
            Swal.fire({
                title: "Network Added",
                text: result,
                icon: 'success',
                confirmButtonText: 'OK'
            });
        } else {
            console.error("MetaMask is not installed.");
        }
    } catch (error) {
        console.error("Failed to add network", error); // 处理错误
        Swal.fire({
            title: "Network",
            text: error.message,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}


export const claimEth = async (account, setModalProcessing) => {
    Swal.fire({
        title: 'Processing...',
        text: 'Please wait while tx is sending.',
        didOpen: () => {
            Swal.showLoading();
        },
        allowOutsideClick: false,
        showConfirmButton: false,
        showCancelButton: false
    });

    try {
        setModalProcessing(true)
        const response = await axios.post(ETH_FAUCET, {
            address: account,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        Swal.close();

        Swal.fire({
            title: 'ETH Claimed!',
            icon: 'success',
            confirmButtonText: 'OK'
        });
        console.log('Claim ETH response:', response.data);
    } catch (error) {
        Swal.fire({
            title: 'ETH Claimed!',
            text: error,
            icon: 'error',
            confirmButtonText: 'OK'
        });
        console.error('Error claiming ETH:', error);
    }
    setModalProcessing(false)
};

export const claimFhet = async (account, setModalProcessing) => {
    setModalProcessing(true)
    Swal.fire({
        title: 'Processing...',
        text: 'Please wait while tx is sending.',
        didOpen: () => {
            Swal.showLoading();
        },
        allowOutsideClick: false,
        showConfirmButton: false,
        showCancelButton: false
    });
    try {
        const response = await axios.post(FHET_FAUCET, {
            address: account,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        console.log(response)
        Swal.close();

        Swal.fire({
            title: 'FHET Claimed!',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    } catch (error) {
        console.error('Error claiming FHET:', error);
        Swal.close();

        Swal.fire({
            title: 'FHET Claimed!',
            text: error,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
    setModalProcessing(false)
};

export const reveal = async (proposalId, setModalProcessing) => {
    setModalProcessing(true)
    Swal.fire({
        title: 'Processing...',
        text: 'Please wait while tx is sending.',
        didOpen: () => {
            Swal.showLoading();
        },
        allowOutsideClick: false,
        showConfirmButton: false,
        showCancelButton: false
    });
    try {
        const response = await axios.post(REVEAL_URL, {
            proposalId: proposalId,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        Swal.close();
        if(response && response.data.status === 1){
            Swal.fire({
                title: 'Reveal Submitted!',
                text: 'The Admin has submitted the claim. Please wait while it is being processed. ',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        }else if (response && response.data.status === -1){
            Swal.fire({
                title: 'Reveal Rejected!',
                text: 'There are no new votes, so data cannot be revealed at this time. ',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }

    } catch (error) {
        console.error('Error reveal:', error);
        Swal.close();

        Swal.fire({
            title: 'Reveal Failed!',
            text: error,
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
    setModalProcessing(false)
};