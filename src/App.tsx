import { useCallback, useEffect, useState } from 'react';
import { init } from './fhevmjs';
import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import './App.css';
import etherscanLogo from './logo-etherscan-light.svg';
import Swal from 'sweetalert2';
import contract_json from './contracts/FHEGovernor.json';
import { addNetwork, claimEth, claimFhet } from './utils';
import token_json from './contracts/FHEToken.json';
import { Tooltip } from 'react-tooltip';
import Modal from './Modal';
import { createFhevmInstance,getInstance } from './fhevmjs';
import {CONTRACT_ADDRESS, ETHER_SCAN, TOKEN_ADDRESS, REVEAL_CHECK, NETWORK_ID, NETWORK_NAME, NATIVE_CURRENCY } from './constants';
function App() {
    const [isInitialized, setIsInitialized] = useState(false);
    const abi = contract_json.abi;
    const [account, setAccount] = useState(null);
    const [blockNumber, setBlockNumber] = useState("");
    const [balance, setBalance] = useState(null);
    const [fhetBalance, setFhetBalance] = useState(null);
    const [networkName, setNetworkName] = useState("");
    const [totalVoters, setTotalVoters] = useState(0);
    const [voters, setVoters] = useState([]);
    const [selectedProposalId, setSelectedProposalId] = useState(0);
    const [latestDecryptedHeight, setLatestDecryptedHeight] = useState(0);
    const [selectedProposal, setSelectedProposal] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [proposalIds, setProposalIds] = useState([0]); // Example proposal IDs
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [shouldReload, reload] = useState(false)
    const [proposalState, setProposalState] = useState();
    const [canVote, setCanVote] = useState(false);
    const [canPropose, setCanPropose] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [proposalLoading, setProposalLoading] = useState(true);
    const reloadEffect = useCallback(() => reload(!shouldReload), [shouldReload])
    const [isCopied, setIsCopied] = useState(false);
    const [modalProcessing, setModalProcessing] = useState(false);
    const [web3Api, setWeb3Api] = useState({
        provider: null,
        isProviderLoaded: false,
        web3 : Web3,
        contract: null,
        isNetworkRight: false
    })

    const setAccountListener = provider => {
        provider.on("accountsChanged", _ => window.location.reload())
        provider.on("chainChanged", _ => window.location.reload())
    }
    const proposalStateEnum = {
        "0": "Pending",
        "1": "Active",
        "2": "Canceled",
        "3": "Rejected",
        "4": "Approved",
        "5": "Queued",
        "6": "Expired",
        "7": "Executed"
    }

    async function addTokenToMetaMask() {
        if (web3Api.isProviderLoaded) {
            try {
                await web3Api.provider.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: TOKEN_ADDRESS,
                            symbol: "FHET",
                            decimals: 6
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to add token:', error);
            }
        } else {
            console.error('MetaMask is not installed');
        }
    }

  useEffect(() => {
    init()
      .then(() => {
        setIsInitialized(true);
      })
      .catch(() => setIsInitialized(false));
  }, []);
    useEffect(() => {
        const loadProvider = async () => {
            try {
                let provider;
                if (window.okexchain) {
                    provider = window.okexchain;
                }else{
                    provider = await detectEthereumProvider();
                }

                try {
                    await provider.request({ method: 'eth_requestAccounts' });
                } catch (error) {
                    console.error('User denied account access');
                }
                if (provider) {
                    setAccountListener(provider)
                    const web3 = new Web3(provider);
                    const networkId = await web3.eth.net.getId();
                    console.log(networkId)
                    const blockNumber = await web3.eth.getBlockNumber();
                    setBlockNumber(blockNumber.toString())
                    setWeb3Api({
                        web3,
                        provider,
                        isProviderLoaded: true,
                    })
                    if (networkId != NETWORK_ID) {
                        Swal.fire({
                            title: 'Network Error!',
                            text: `Please click 'Add ${NETWORK_NAME} to MetaMask' button first！`,
                            icon: 'error',
                            confirmButtonText: 'OK'
                        });
                        throw new Error("Network uavailable");
                    }
                    setNetworkName(NETWORK_NAME);
                    const contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
                    const token_contract = new web3.eth.Contract(token_json.abi, TOKEN_ADDRESS);
                    setWeb3Api({
                        web3,
                        provider,
                        contract,
                        token_contract,
                        isProviderLoaded: true,
                        isNetworkRight: true
                    })

                    // available proposals
                    const proposalCount = await contract.methods.proposalCount().call();
                    const proposalCountNumber = Number(proposalCount);
                    let availableProposals = [];
                    for (let i = proposalCountNumber; i > 0; i--) {
                        let state = await contract.methods.state(i).call();
                        if (state != 2) {
                            availableProposals.push(i)
                        }
                    }
                    if (proposalCount == 0) {
                        availableProposals.push(0)
                    }
                    setProposalIds(availableProposals);
                    const hash = window.location.hash.substring(1); // 去掉#号
                    if (hash && hash <= availableProposals.length) {
                        setSelectedProposalId(hash);
                    }else{
                        setSelectedProposalId(availableProposals[0]);
                        window.location.hash = availableProposals[0];
                    }
                } else {
                    console.log('Please install MetaMask!');
                }
            } catch (error) {
                console.error('Error loading provider:', error);
            }
        };

        loadProvider();
    }, []);

    useEffect(() => {
        const loadBalance = async () => {
            if (web3Api.isProviderLoaded) {
                const { token_contract, web3 } = web3Api
                const accounts = await web3.eth.getAccounts();
                if (accounts.length === 0) {
                    return
                }
                setAccount(accounts[0]);
                const balance = await web3.eth.getBalance(accounts[0]);
                const fhet_balance = await token_contract.methods.balanceOf(accounts[0]).call();
                setFhetBalance(web3.utils.fromWei(fhet_balance, "mwei"))
                setCanPropose(fhet_balance > 0)
                setBalance(parseFloat(web3.utils.fromWei(balance, "ether")).toFixed(6))
            }
        }
        web3Api.contract && loadBalance()
        //    loadBalance()
    }, [web3Api, shouldReload])
    // const web31 = new Web3(provider);
    useEffect(() => {
        const loadProposal = async () => {
            if (web3Api.isProviderLoaded && account && selectedProposalId) {
                const { contract } = web3Api
                let proposal = await contract.methods.proposals(selectedProposalId).call();
                console.log(proposal)
                const state = await contract.methods.state(selectedProposalId).call();
                // const height = await contract.methods.proposalsHighestDecryptedBlockHeight(selectedProposalId).call();
                const height = 1;
                const receipts = await contract.methods.getProposalReceipts(selectedProposalId).call();
                let hasVoted = false
                for (const index in receipts) {
                    if (receipts[index].voter === account) {
                        hasVoted = true
                        setSelectedReceipt(receipts[index])
                        break;
                    }
                }
                setLatestDecryptedHeight(height)
                setHasVoted(hasVoted)
                setCanVote(!hasVoted && proposalStateEnum[state] === "Active")
                setIsDecrypted(height.toString() != "0")
                setProposalState(proposalStateEnum[state])
                setSelectedProposal(proposal)
                setVoters([...receipts].reverse())
                setTotalVoters(receipts.length)
                setProposalLoading(false)
            }
        }
        web3Api.contract && loadProposal()
        const intervalId = setInterval(loadProposal, 30000); // Fetch data at interval
        // Cleanup function to clear the interval
        return () => clearInterval(intervalId);
        //    loadBalance()
    }, [web3Api, shouldReload, selectedProposalId, account])

    const handleVote = async (voteType) => {
        const { contract, web3 } = web3Api;
        // Debugging steps
        (async () => {
            try {
                // Check if contract and web3 instances are defined
                if (!contract || !web3) {
                    throw new Error("Contract or web3 instance not defined");
                }
                Swal.fire({
                    title: 'Transaction is sending...',
                    text: 'Please wait while your data is being uploaded.',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    // showCloseButton: true,
                    showCancelButton: false
                });

                const instances = getInstance();
                const { handles, inputProof } = instances.createEncryptedInput(CONTRACT_ADDRESS, account).add64(voteType).encrypt();;
                console.log(handles)
                console.log(inputProof)
                // let encrypted = await encrypt(voteType)
                // let hash = await upload(encrypted);
                // if (hash == null) {
                //     throw new Error("Encrypted file upload failed");
                // }

                const gasLimit = 8000000; // Adjust this value as needed
                const gasPrice = await web3.eth.getGasPrice(); // You can set a custom gas price if needed



                let tx = await contract.methods.castVoteByProof(selectedProposalId, handles[0], inputProof).send({
                    from: account,
                    gas: gasLimit,
                    gasPrice: gasPrice
                });

                // let tx = await contract.methods.castVote(selectedProposalId, hash).send({
                //     from: account,
                //     gas: gasLimit,
                //     gasPrice: gasPrice
                // });
                Swal.close();


                Swal.fire({
                    title: 'Transaction Successful!',
                    html: `
                        <p>Your vote has been cast successfully.</p>
                        <p>Transaction details:</p>
                        <ul>
                            <li>Transaction hash: ${tx.transactionHash}</li>
                            <li>Block number: ${tx.blockNumber}</li>
                        </ul>
                        <a href="${ETHER_SCAN}/tx/${tx.transactionHash}" target="_blank">View Tx in Etherscan</a>
                    `,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    reload(prev => !prev);
                });


            } catch (error) {
                Swal.fire({
                    title: 'Transaction Failed!',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })();
    };

    const handlePropose = async () => {
        const { contract, web3 } = web3Api;
        // Debugging steps
        (async () => {
            try {
                // Check if contract and web3 instances are defined
                if (!contract || !web3) {
                    throw new Error("Contract or web3 instance not defined");
                }
                Swal.fire({
                    title: 'Transaction is sending...',
                    text: 'Please wait while your data is being uploaded.',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    // showCloseButton: true,
                    showCancelButton: false
                });

                let targets = [account];
                let values = [1000000000000000000];
                let signatures = ["0x"];
                let calldatas = ["0x"];
                let description = "test propose";


                const gasLimit = 2000000; // Adjust this value as needed
                const gasPrice = await web3.eth.getGasPrice(); // You can set a custom gas price if needed
                let tx =  await contract.methods.propose(targets, values, signatures, calldatas, description, 0, 500).send({
                    from: account,
                    gas: gasLimit,
                    gasPrice: gasPrice,
                });
                Swal.close();


                Swal.fire({
                    title: 'Transaction Successful!',
                    html: `
                        <p>Your propose has been create successfully.</p>
                        <p>Transaction details:</p>
                        <ul>
                            <li>Transaction hash: ${tx.transactionHash}</li>
                            <li>Block number: ${tx.blockNumber}</li>
                        </ul>
                        <a href="${ETHER_SCAN}/tx/${tx.transactionHash}" target="_blank">View Tx in Etherscan</a>
                    `,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    reload(prev => !prev);
                });


            } catch (error) {
                Swal.fire({
                    title: 'Transaction Failed!',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })();
    };

    const formatAccount = (account) => {
        if (!account || account.length < 8) return account; // Handle cases with short addresses
        return `${account.substring(0, 8)}...${account.substring(account.length - 4)}`;
    };

    const handleClaimFhet = () => {
        claimFhet(account, setModalProcessing);
    };
    const handleClaimEth = () => {
        window.open('https://faucet.zama.ai/', '_blank');
        // claimEth(account, setModalProcessing);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSave = (data) => {
        console.log('Submitted outer Data:', data);
        handleCloseModal();
    };

    const handleReveal = async (proposalId) => {
        const { contract, web3 } = web3Api;
        (async () => {
            try {
                // Check if contract and web3 instances are defined
                if (!contract || !web3) {
                    throw new Error("Contract or web3 instance not defined");
                }
                Swal.fire({
                    title: 'Proposal is revealing...',
                    text: 'Please wait while your data is being uploaded.',
                    didOpen: () => {
                        Swal.showLoading();
                    },
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    // showCloseButton: true,
                    showCancelButton: false
                });


                const gasLimit = 2000000; // Adjust this value as needed
                const gasPrice = await web3.eth.getGasPrice(); // You can set a custom gas price if needed

                let tx =  await contract.methods._requestDecrypt(selectedProposalId).send({
                    from: account,
                    gas: gasLimit,
                    gasPrice: gasPrice
                });
                Swal.close();


                Swal.fire({
                    title: 'Transaction Successful!',
                    html: `
                        <p>Your propose has been reveal successfully.</p>
                        <p>Transaction details:</p>
                        <ul>
                            <li>Transaction hash: ${tx.transactionHash}</li>
                            <li>Block number: ${tx.blockNumber}</li>
                        </ul>
                        <a href="${ETHER_SCAN}/tx/${tx.transactionHash}" target="_blank">View Tx in Etherscan</a>
                    `,
                    icon: 'success',
                    confirmButtonText: 'OK'
                }).then((result) => {
                    reload(prev => !prev);
                });
            } catch (error) {
                Swal.fire({
                    title: 'Transaction Failed!',
                    text: error.message,
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
            }
        })();

        // const revealRequest = await axios.request(REVEAL_CHECK + "?proposalId="+proposalId)
        // const revealState = revealRequest.data.data
        //
        // if(revealState == 2){
        //     Swal.fire({
        //         title: 'Reveal Rejected',
        //         text: 'Current reveal is processing.',
        //         icon: 'error',
        //         confirmButtonText: 'OK'
        //     });
        // }else if(revealState == 3){
        //     Swal.fire({
        //         title: 'Reveal Rejected',
        //         text: 'There are no new votes to be revealed.',
        //         icon: 'error',
        //         confirmButtonText: 'OK'
        //     });
        // }else {
        //     reveal(proposalId, setModalProcessing)
        // }
    }

    const handleProposalSelect = (e) =>{
        const value = Number(e.target.value)
        setSelectedProposalId(value)
        setProposalLoading(true)
        window.location.hash = String(value);
    }
    const handleAddNetwork = () => {
        if(web3Api.isProviderLoaded){
            addNetwork(web3Api.provider)
        }
    }

    createFhevmInstance();

  if (!isInitialized) return null;

    return (
        <div className="App">
            <header className="App-header">
                <div className="voting-dapp-container">
                    <div className="voting-dapp">
                        <h1>Private Voting dApp using FHE</h1>
                        <a href={`${ETHER_SCAN}/address/${CONTRACT_ADDRESS}`} className="download-link">
                            <img src={etherscanLogo} alt="etherscan" className="etherscan-icon" />
                        </a>
                    </div>
                </div>
                <div className='button-container'>
                    <button onClick={handleAddNetwork} className="button is-primary button-light-yellow">
                        Add {NETWORK_NAME} to MetaMask
                    </button>
                    <button onClick={handleClaimEth} className="button is-primary button-light-yellow" disabled={modalProcessing}>
                        {NATIVE_CURRENCY} Faucet
                    </button>
                    <button  onClick={handleClaimFhet} className="button is-primary button-light-yellow" disabled={modalProcessing}>
                        FHET Faucet
                    </button>
                    <button className="fab" onClick={addTokenToMetaMask}><a data-tooltip-id="fab-tooltip" data-tooltip-content="Add FHET to Token List!">+</a></button>
                    <Tooltip id="fab-tooltip" />
                </div>
                <div className="info-section">
                    <div className="info-group">
                        <h2>Network Information</h2>
                        <p><strong>Connected Network:</strong> {networkName}</p>
                        <p><strong><a href={`${ETHER_SCAN}/block/${blockNumber}`} target="_blank">Latest Block</a>: </strong>{blockNumber}</p>
                    </div>
                    <div className="info-group">
                        <h2>Account Information</h2>
                        <p><strong>Connected <a href={`${ETHER_SCAN}/address/${account}`} target="_blank" rel="noopener noreferrer">Account</a>: </strong><span data-tooltip-id="account-tooltip" data-tooltip-content={account}>{formatAccount(account)}</span></p>
                        <Tooltip id="account-tooltip" />
                        <p><strong>{NATIVE_CURRENCY} Balance: </strong>{balance}</p>
                        <p><strong><a href={`${ETHER_SCAN}/address/${TOKEN_ADDRESS}`} target="_blank" rel="noopener noreferrer">FHET</a> Balance: </strong>{fhetBalance}</p>
                    </div>
                </div>
                {/* <div className='button-container'>
                    <button onClick={handleOpenModal} className="button is-primary button-light-yellow" style={{ width: "600px" }}>
                        Submit New Proposal
                    </button>
                </div> */}
                <div>
                    <Modal show={isModalOpen} onClose={handleCloseModal} onSave={handleSave}>
                        {/* Proposal Modal */}
                    </Modal>
                </div>
                <section className="voting-info">
                    {proposalLoading && (
                        <div className="proposal-overlay">
                            <div className='proposal-loader'>Loading...</div>
                        </div>
                    )}
                    <h2>Voting Information ({proposalState})</h2>
                    <div className="container">
                        <div className="proposal-section">
                            <label htmlFor="proposal-select" className="proposal-label">Current Proposal ID:</label>
                            <select id="proposal-select" value={selectedProposalId} onChange={(e) => handleProposalSelect(e)}>
                                {proposalIds.map((id) => (
                                    <option key={id} value={id}>{id}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="voting-details">
                        <div dangerouslySetInnerHTML={{ __html: selectedProposal && selectedProposal.description }}></div>
                        <div className='voting-columns'>
                            <div className="column-left">
                                <p>
                                    <strong><a href={`${ETHER_SCAN}/address/${selectedProposal && selectedProposal.proposer}`} target="_blank" rel="noopener noreferrer">Proposal Initiator</a>: </strong>
                                    <span data-tooltip-id="tooltipExample" data-for="tooltipExample" data-tooltip-content={selectedProposal && selectedProposal.proposer}>
                                        {selectedProposal && formatAccount(selectedProposal.proposer)}
                                    </span>
                                    <Tooltip place="top" type="dark" effect="solid" id="tooltipExample" />
                                </p>
                                <p><strong>Total Voters:</strong> {totalVoters}</p>
                                {/* <p><strong>Latest Block: </strong>{blockNumber}</p> */}
                            </div>
                            <div className="column-right">
                                <p><strong>Begin Block:</strong> {selectedProposal && selectedProposal.startBlock.toString()}</p>
                                <p><strong>End Block:</strong> {selectedProposal && selectedProposal.endBlock.toString()}</p>
                            </div>
                        </div>
                        <div className="divider-container">
                            <span className="divider-text">Current Votes [latest revealed at: <a href={`${ETHER_SCAN}/block/${latestDecryptedHeight}`} target="_blank">{latestDecryptedHeight}</a>] <button onClick={() => handleReveal(selectedProposalId)}>Reveal</button></span>
                        </div>
                        <p>
                            FOR: {isDecrypted && selectedProposal ? (selectedProposal.forVotes / BigInt(1000000)).toString() : "*"},
                            AGAINST: {isDecrypted && selectedProposal ? (selectedProposal.againstVotes / BigInt(1000000)).toString() : "*"},
                            ABSTAIN: {isDecrypted && selectedProposal ? (selectedProposal.abstainVotes / BigInt(1000000)).toString() : "*"}
                        </p>
                    </div>

                    <div className="vote-buttons">
                        <button disabled={!canVote} onClick={() => handleVote(1)} className="button is-primary">FOR</button>
                        <button disabled={!canVote} onClick={() => handleVote(0)} className="button is-primary">AGAINST</button>
                        <button disabled={!canVote} onClick={() => handleVote(2)} className="button is-primary">ABSTAIN</button>
                        <button disabled={!canPropose} onClick={() => handlePropose()} className="button is-primary">PROPOSE</button>
                    </div>
                    <div className={`has-voted ${hasVoted ? '' : 'hidden'}`}>
                        You have cast your vote already!
                        {/*<a href={`${OSS_DOWNLOAD}?fileHash=${selectedReceipt && selectedReceipt.support.substring(2)}`} style={{ marginLeft: '10px' }} className="download-link" download>*/}
                        {/*    Download Encrypted Data*/}
                        {/*</a>*/}
                    </div>

                    <div>
                        <h2>Voter List</h2>
                        <ul className="voter-list">
                            <li className="voter-header">
                                <span>Account</span>
                                <span>Encrypted Data</span>
                            </li>
                            {voters.map((receipt, index) => (
                                <li key={index} className='voter-item' >
                                    <span>
                                        <a href={`${ETHER_SCAN}/address/${receipt.voter}`} className={receipt.voter === account ? 'highlight download-link' : 'download-link'} target='_blank' download>
                                            {receipt.voter.substring(0, 12)}...{receipt.voter.substring(receipt.voter.length - 10)}
                                        </a>
                                    </span>
                                    {/*<a href={`${OSS_DOWNLOAD}?fileHash=${receipt.support.substring(2)}`} className='download-link' target='_blank'*/}
                                    {/*    download>*/}
                                    {/*    {receipt.support.substring(0, 8)}...{receipt.support.substring(receipt.support.length - 10)}*/}
                                    {/*</a>*/}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            </header>
        </div>
    );
}

export default App;
