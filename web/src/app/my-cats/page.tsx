"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { CatsProps } from "@/types/cats";
import Link from "next/link";
import { useWallet } from "@/hooks/WalletConnectProvider";
import detectEthereumProvider from "@metamask/detect-provider";
import Web3 from "web3";
import CONTRIBUTION_ACCOUNTING_TOKEN_ABI from "@/contractsABI/ContributionAccountingTokenABI";

export default function MyCATsPage() {
  const [ownedCATs, setOwnedCATs] = useState<CatsProps[] | null>(null);
  const { address, catsContractFactoryInstance, isLoading } = useWallet();

  const getOwnedCATs = async () => {
    if (!catsContractFactoryInstance) return [];
    const cats = await catsContractFactoryInstance.methods
      .getOwnedCATs(address)
      .call();
    return cats;
  };

  const getCatDetails = async (catAddress: string) => {
    const provider = await detectEthereumProvider();
    if (provider) {
      const web3 = new Web3(provider as unknown as Web3['givenProvider']);
      const catsContractInstance = new web3.eth.Contract(CONTRIBUTION_ACCOUNTING_TOKEN_ABI, catAddress);
      const tokenName = await catsContractInstance.methods.tokenName().call();
      const tokenSymbol = await catsContractInstance.methods.tokenSymbol().call();
      return { address: catAddress, tokenName, tokenSymbol };
    } else {
      throw new Error("Ethereum provider not found");
    }
  };

  useEffect(() => {
    const fetchOwnedCATs = async () => {
      const catAddresses = await getOwnedCATs();
      const catDetailsPromises = catAddresses.map((catAddress: string) =>
        getCatDetails(catAddress)
      );
      const cats = await Promise.all(catDetailsPromises);
      setOwnedCATs(cats);
    };

    if (address && !isLoading) {
      fetchOwnedCATs();
    }
  }, [address, isLoading, getOwnedCATs]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 mt-9 justify-center text-center">
        <h1 className="text-3xl font-bold mb-6">My CATs</h1>
        {ownedCATs && ownedCATs.length > 0 ? (
          <ul className="space-y-4">
            {ownedCATs.map((cat) => (
              <li key={cat.address} className="border p-4 rounded-lg">
                <Link
                  href={`/cat/${cat.address}`}
                  className="text-blue-500 hover:underline"
                >
                  {cat.tokenName || cat.address} ({cat.tokenSymbol})
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>You don&apos;t own any CATs yet.</p>
        )}
      </div>
    </Layout>
  );
}
