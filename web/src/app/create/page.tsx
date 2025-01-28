"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ClowderVaultFactories } from "@/utils/address";
import { useAccount } from "wagmi";
import { config } from "@/utils/config";
import { writeContract } from "@wagmi/core";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Info, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface DeployContractProps {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
  thresholdSupply: string;
  maxExpansionRate: string;
}

const fields = [
  {
    id: "tokenName",
    label: "Token Name",
    type: "text",
    placeholder: "My Token",
    description: "The name of your token",
  },
  {
    id: "tokenSymbol",
    label: "Token Symbol",
    type: "text",
    placeholder: "TKN",
    description: "A short identifier for your token (2-4 characters)",
  },
  {
    id: "maxSupply",
    label: "Maximum Supply",
    type: "number",
    placeholder: "1000000",
    description: "The maximum number of tokens that can exist",
  },
  {
    id: "thresholdSupply",
    label: "Threshold Supply",
    type: "number",
    placeholder: "500000",
    description: "The supply threshold that triggers expansion",
  },
  {
    id: "maxExpansionRate",
    label: "Maximum Expansion Rate",
    type: "number",
    placeholder: "5",
    description: "Maximum percentage the supply can expand (1-100)",
  },
];

export default function CreateCAT() {
  const [formData, setFormData] = useState<DeployContractProps>({
    tokenName: "",
    tokenSymbol: "",
    maxSupply: "",
    thresholdSupply: "",
    maxExpansionRate: "",
  });
  const [isDeploying, setIsDeploying] = useState(false);

  const { address } = useAccount();
  const router = useRouter();

  const getTransactionHistory = () => {
    const history = localStorage.getItem("transactionHistory");
    return history ? JSON.parse(history) : [];
  };

  const saveTransaction = (txDetails: object) => {
    const history = getTransactionHistory();
    history.push(txDetails);
    localStorage.setItem("transactionHistory", JSON.stringify(history));
  };

  const deployContract = async () => {
    try {
      setIsDeploying(true);
      const chainId = config.state.chainId;
      if (!ClowderVaultFactories[chainId]) {
        toast.error("Contract factory instance not available");
        return;
      }

      const {
        maxSupply,
        thresholdSupply,
        maxExpansionRate,
        tokenName,
        tokenSymbol,
      } = formData;

      const tx = await writeContract(config as any, {
        address: ClowderVaultFactories[chainId],
        abi: CAT_FACTORY_ABI,
        functionName: "createCAT",
        args: [
          Number.parseInt(maxSupply),
          Number.parseInt(thresholdSupply),
          maxExpansionRate.toString(),
          tokenName,
          tokenSymbol,
        ],
      });

      const txDetails = {
        tokenName,
        tokenSymbol,
        maxSupply,
        thresholdSupply,
        maxExpansionRate,
        transactionHash: tx,
        timestamp: new Date().toISOString(),
      };

      saveTransaction(txDetails);
      toast.success("CAT contract deployed successfully!");
      router.push("/my-cats");
    } catch (error) {
      console.error("Error deploying CAT:", error);
      toast.error("Failed to deploy CAT contract");
    } finally {
      setIsDeploying(false);
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
      <div className="min-h-screen py-12 px-4">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-2 shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-4xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
                Create CAT
              </CardTitle>
              <CardDescription className="text-center text-lg text-gray-600 dark:text-gray-400">
                Deploy a new Contribution Accounting Token
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!address ? (
                <motion.div
                  className="flex flex-col items-center space-y-4 p-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-gray-600 dark:text-gray-400 mb-4 text-lg">
                    Connect your wallet to create a new CAT
                  </p>
                  <ConnectButton
                    label={<span className="text-black">Connect Wallet</span>}
                  />{" "}
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {fields.map(
                    ({ id, label, type, placeholder, description }, index) => (
                      <motion.div
                        key={id}
                        className="space-y-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between">
                          <Label htmlFor={id} className="text-sm font-medium">
                            {label}
                          </Label>
                          <div className="group relative">
                            <Info className="h-4 w-4 text-gray-500 cursor-help" />
                            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-gray-50 opacity-0 transition-opacity group-hover:opacity-100">
                              {description}
                            </span>
                          </div>
                        </div>
                        <Input
                          id={id}
                          name={id}
                          type={type}
                          placeholder={placeholder}
                          required
                          value={formData[id as keyof DeployContractProps]}
                          onChange={handleChange}
                          className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </motion.div>
                    )
                  )}
                  <motion.div
                    className="pt-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: fields.length * 0.1 }}
                  >
                    <Button
                      type="submit"
                      className="w-full h-12 text-lg font-medium transition-all duration-200 hover:scale-[1.02]"
                      disabled={isDeploying}
                    >
                      {isDeploying ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deploying...
                        </span>
                      ) : (
                        "Deploy CAT"
                      )}
                    </Button>
                  </motion.div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
}
