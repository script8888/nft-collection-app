import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";
import Web3Modal from "web3modal";
import { providers, Contract, ethers, utils } from "ethers";
import { useEffect, useRef, useState } from "react";
import { NFT_CONTRACT_ADDRESS, abi, ALCHEMY_API_KEY_URL } from "../constants";
// import { Spinner } from "@chakra-ui/react";

export default function Home() {
  const [isOwner, setIsOwner] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokensMinted, setTokensMinted] = useState("");
  const web3ModalRef = useRef();

  const getNoMintedTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const numTokenIds = await nftContract.tokenIds();
      setTokensMinted(numTokenIds.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const getOwner = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const owner = await nftContract.owner();
      const callerAddress = await signer.getAddress();

      if (owner.toLowerCase() === callerAddress.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasPresaleStarted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const isPresaleStarted = await nftContract.presaleStarted();
      setPresaleStarted(isPresaleStarted);

      return isPresaleStarted;
    } catch (err) {
      console.error(err);

      return false;
    }
  };

  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      setLoading(true);
      const txn = await nftContract.startPresale();
      await txn.wait();
      setLoading(false);
      setPresaleStarted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const hasPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _endTime = await nftContract.presaleEnded();
      const currentTimeInSeconds = Date.now() / 1000;
      const hasEnded = _endTime.lt(Math.floor(currentTimeInSeconds));

      setPresaleEnded(hasEnded);
    } catch (err) {
      console.error(err);
    }
  };

  const nftMint = async (publicMint = false) => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      setLoading(true);
      if (!publicMint) {
        const _mint = await nftContract.presaleMint({
          value: utils.parseEther("0.01"),
        });
        await _mint.wait();
      } else {
        const _mint = await nftContract.mint({
          value: utils.parseEther("0.01"),
        });
        await _mint.wait();
      }
      setLoading(false);
      window.alert("NFT Minted");
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 5) {
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const onPageLoad = async () => {
    await connectWallet();
    await getOwner();
    const presaleStarted = await hasPresaleStarted();
    if (presaleStarted) {
      await hasPresaleEnded();
    }
    //Track in real time number of nft
    setInterval(async () => {
      await getNoMintedTokens();
    }, 5 * 1000);
    //Track in real time status of presale
    setInterval(async () => {
      const presaleStarted = await hasPresaleStarted();
      if (presaleStarted) {
        await hasPresaleEnded();
      }
    }, 5 * 1000);
  };

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      hasPresaleStarted();
      onPageLoad();
    }
  }, []);

  const renderButton = () => {
    if (loading) {
      return (
        <div className={styles.description}>
          {/* <Spinner emptyColor="gray.200" color="blue" /> */}
          <span>Loading...</span>
        </div>
      );
    } else {
      if (!walletConnected) {
        return (
          <button onClick={connectWallet} className={styles.button}>
            Connect Wallet
          </button>
        );
      }

      if (isOwner && !presaleStarted) {
        return (
          <button onClick={startPresale} className={styles.button}>
            Start Presale
          </button>
        );
      }

      if (!presaleStarted) {
        return (
          <div>
            <span className={styles.description}>
              Presale hasn't started yet, come back later!
            </span>
          </div>
        );
      }

      if (presaleStarted && !presaleEnded) {
        return (
          <div>
            <span className={styles.description}>Presale has started!</span>
            <button onClick={nftMint} className={styles.button}>
              Mint
            </button>
          </div>
        );
      }

      if (presaleStarted && presaleEnded) {
        return (
          <div>
            <span className={styles.description}>
              Presale Mint has ended. <br /> Mint Public
            </span>
            <button onClick={() => nftMint(true)} className={styles.button}>
              Mint
            </button>
          </div>
        );
      }
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>WanShiTong NFT</title>
        <meta name="description" content="He who knows 10,000 things" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to WanShiTong's NFT Library</h1>
          <div className={styles.description}>
            A collection for frens of "He who knows 10,000 things"
          </div>
          <div className={styles.description}>
            {tokensMinted}/20 have been minted.
          </div>

          {renderButton()}
        </div>
        <img className={styles.image} src="/Owl.jpg" alt="" />
      </main>
      <footer className={styles.footer}>Made with &#10084; by Script</footer>
    </div>
  );
}
