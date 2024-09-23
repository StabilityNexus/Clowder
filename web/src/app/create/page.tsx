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
      // Ensure the contract factory instance is available
      if (!catsContractFactoryInstance) {
        toast.error("Contract factory instance not available");
        return;
      }

      // Prepare constructor arguments
      const maxSupply = parseInt(formData.maxSupply);
      const thresholdSupply = parseInt(formData.thresholdSupply);
      const maxExpansionRate = formData.maxExpansionRate.toString(); // Convert to string
      const name = formData.tokenName;
      const symbol = formData.tokenSymbol;

      // Deploy CAT contract
      toast.success("Deploying CAT contract...");
      const tx = await catsContractFactoryInstance.methods
        .createCAT(
          maxSupply,
          thresholdSupply,
          maxExpansionRate,
          name,
          symbol
        )
        .send({ from: address, gas: 3000000, gasPrice: 10000000000 })
        .on('receipt', function (receipt: any) {
          console.log(receipt);
        });

      toast.success("CAT contract deployed!", {
        duration: 5000,
      });

      // Handle successful deployment (e.g., show success message, redirect)
      console.log("CAT deployed successfully:", tx);
    } catch (error) {
      console.error("Error deploying CAT:", error);
      toast.error("Error deploying CAT");
      // Handle error (e.g., show error message)
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    } as DeployContractProps);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      // Deploy CAT contract
      await deployContract();
      // Handle successful deployment (e.g., show success message, redirect)
    } catch (error) {
      console.error("Error deploying CAT:", error);
      // Handle error (e.g., show error message)
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create CAT</h1>
        {!address ? (
          <ConnectWallet />
        ) : (
          <form onSubmit={handleSubmit} className="max-w-md">
            <div className="mb-4">
              <Label htmlFor="tokenName">Token Name</Label>
              <Input
                id="tokenName"
                name="tokenName"
                type="text"
                required
                value={formData.tokenName}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="tokenSymbol">Token Symbol</Label>
              <Input
                id="tokenSymbol"
                name="tokenSymbol"
                type="text"
                required
                value={formData.tokenSymbol}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="maxSupply">Maximum Supply</Label>
              <Input
                id="maxSupply"
                name="maxSupply"
                type="number"
                required
                value={formData.maxSupply}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="thresholdSupply">Threshold Supply</Label>
              <Input
                id="thresholdSupply"
                name="thresholdSupply"
                type="number"
                required
                value={formData.thresholdSupply}
                onChange={handleChange}
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="maxExpansionRate">
                Maximum Expansion Rate (%)
              </Label>
              <Input
                id="maxExpansionRate"
                name="maxExpansionRate"
                type="number"
                required
                value={formData.maxExpansionRate}
                onChange={handleChange}
              />
            </div>
            <Button type="submit">Deploy CAT</Button>
          </form>
        )}
      </div>
    </Layout>
  );
}
