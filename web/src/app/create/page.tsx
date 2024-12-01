"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useWallet } from "@/hooks/WalletConnectProvider";
import ConnectWallet from "@/components/ConnectWallet";
import toast from "react-hot-toast";

interface DeployContractProps {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
  thresholdSupply: string;
  maxExpansionRate: string;
}

const fields = [
  { id: "tokenName", label: "Token Name", type: "text" },
  { id: "tokenSymbol", label: "Token Symbol", type: "text" },
  { id: "maxSupply", label: "Maximum Supply", type: "number" },
  { id: "thresholdSupply", label: "Threshold Supply", type: "number" },
  { id: "maxExpansionRate", label: "Maximum Expansion Rate (%)", type: "number" },
];

export default function CreateCAT() {
  const [formData, setFormData] = useState<DeployContractProps>({
    tokenName: "",
    tokenSymbol: "",
    maxSupply: "",
    thresholdSupply: "",
    maxExpansionRate: "",
  });

  const { address, catsContractFactoryInstance } = useWallet();

  const deployContract = async () => {
    try {
      if (!catsContractFactoryInstance) {
        toast.error("Contract factory instance not available");
        return;
      }

      const { maxSupply, thresholdSupply, maxExpansionRate, tokenName, tokenSymbol } = formData;

      const tx = await catsContractFactoryInstance.methods
        .createCAT(
          parseInt(maxSupply),
          parseInt(thresholdSupply),
          maxExpansionRate.toString(),
          tokenName,
          tokenSymbol
        )
        .send({ from: address, gas: 3000000, gasPrice: 10000000000 });

      toast.success("CAT contract deployed!");
      console.log("Deployment successful:", tx);
    } catch (error) {
      console.error("Error deploying CAT:", error);
      toast.error("Error deploying CAT");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await deployContract();
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div
          className={`container w-80% md:w-[60%] mx-auto rounded-[50px] flex flex-col items-center justify-center px-4 md:mt-8 py-8 text-center bg-[#B5E8F8] dark:bg-black`}
        >
          <h1 className="text-3xl font-bold mb-6">Create CAT</h1>
          {!address ? (
            <ConnectWallet />
          ) : (
            <form onSubmit={handleSubmit} className="max-w-full space-y-3 md:space-y-6">
              {fields.map(({ id, label, type }) => (
                <div key={id} className="flex flex-col md:flex-row items-center space-x-4">
                  <Label htmlFor={id} className="w-md md:w-2/5 text-lg text-left py-3 md:py-0">
                    {label}
                  </Label>
                  <Input
                    id={id}
                    name={id}
                    type={type}
                    required
                    value={formData[id as keyof DeployContractProps]}
                    onChange={handleChange}
                    className="flex-1 max-w-full"
                  />
                </div>
              ))}
              <Button type="submit" className="w-md">
                Deploy CAT
              </Button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
