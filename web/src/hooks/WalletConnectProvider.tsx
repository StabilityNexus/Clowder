"use client";

import { WalletContextProps } from "@/types/walletContext";
import detectEthereumProvider from "@metamask/detect-provider";
import React, { createContext, useState, useEffect } from "react";
import CAT_FACTORY_ABI from "../contractsABI/CatFactoryABI.js";
import { CATS_FACTORY_ADDRESS } from "../constants.js";
import Web3 from "web3";

const WalletContext = createContext<WalletContextProps>({
  address: "",
  isLoading: false,
  balance: "",
  connect: () => { },
  disconnect: () => { },
  catsContractInstance: null,
  catsContractFactoryInstance: null,
});

export function WalletConnectProvider({
  children,
}: React.PropsWithChildren<unknown>) {
  const [address, setAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [balance, setBalance] = useState<string>("");
  const [web3, setWeb3] = useState<Web3 | null>(null);
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const [catsContractInstance] = useState<any>(null);
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const [catsContractFactoryInstance, setCatsContractFactoryInstance] = useState<any>(null);

  const initContracts = async () => {
    if (!web3) return;
    const catsContractFactoryInstance = new web3.eth.Contract(
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      CAT_FACTORY_ABI as any,
      CATS_FACTORY_ADDRESS
    );
    setCatsContractFactoryInstance(catsContractFactoryInstance);
    localStorage.setItem("contract", "catsContractFactoryInstance");
  };

  useEffect(() => {
    if (!web3) return;
    initContracts();
  }, [isLoading]);

  useEffect(() => {
    const init = async () => {
      const provider = await detectEthereumProvider();
      if (provider) {
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        const web3Instance = new Web3(provider as any);
        setWeb3(web3Instance);

        // Try to load address from localStorage on page load
        const savedAddress = localStorage.getItem("walletAddress");
        if (savedAddress) {
          setAddress(savedAddress);
          const savedBalance = localStorage.getItem("walletBalance");
          if (savedBalance) setBalance(savedBalance);
        }

        // Listen for account changes
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        (provider as any).on("accountsChanged", async (accounts: string[]) => {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            const balance = await web3Instance.eth.getBalance(accounts[0]);
            const balanceInEther = web3Instance.utils.fromWei(balance, "ether");
            setBalance(balanceInEther);
            localStorage.setItem("walletAddress", accounts[0]);
            localStorage.setItem("walletBalance", balanceInEther);
          } else {
            setAddress("");
            setBalance("");
            localStorage.removeItem("walletAddress");
            localStorage.removeItem("walletBalance");
          }
        });
      } else {
        console.error("Please install MetaMask!");
      }
    };
    init();
  }, []);

  const connect = async () => {
    if (!web3) return;
    setIsLoading(true);
    try {
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      const accounts = await (web3.currentProvider as any).request({
        method: "eth_requestAccounts",
      });
      setAddress(accounts[0]);
      const balance = await web3.eth.getBalance(accounts[0]);
      const balanceInEther = web3.utils.fromWei(balance, "ether");
      setBalance(balanceInEther);

      // Save to localStorage
      localStorage.setItem("walletAddress", accounts[0]);
      localStorage.setItem("walletBalance", balanceInEther);
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAddress("");
    setBalance("");
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("walletBalance");
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isLoading,
        balance,
        connect,
        disconnect,
        catsContractInstance,
        catsContractFactoryInstance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  try {
    return React.useContext(WalletContext);
  } catch (e) {
    throw new Error("useWallet must be used within a WalletConnectProvider");
  }
}
