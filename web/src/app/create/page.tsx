"use client";

import { useState, useEffect } from "react";
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
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Info, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";

interface DeployContractProps {
  tokenName: string;
  tokenSymbol: string;
  maxSupply: string;
  thresholdSupply: string;
  maxExpansionRate: string;
}

interface FieldValidation {
  [key: string]: {
    isValid: boolean;
    errorMessage: string;
  };
}

const fields = [
  {
    id: "tokenName",
    label: "Token Name",
    type: "text",
    placeholder: "My Token",
    description: "The name of your token",
    validate: (value: string) => ({
      isValid: value.length >= 3 && value.length <= 32,
      errorMessage: "Token name must be between 3 and 32 characters"
    })
  },
  {
    id: "tokenSymbol",
    label: "Token Symbol",
    type: "text",
    placeholder: "TKN",
    description: "A short identifier for your token (2-4 characters)",
    validate: (value: string) => ({
      isValid: /^[A-Z]{2,4}$/.test(value),
      errorMessage: "Symbol must be 2-4 uppercase letters"
    })
  },
  {
    id: "maxSupply",
    label: "Maximum Supply",
    type: "number",
    placeholder: "1000000",
    description: "The maximum number of tokens that can exist",
    validate: (value: string) => ({
      isValid: /^\d+$/.test(value) && parseInt(value) > 0,
      errorMessage: "Maximum supply must be a positive number"
    })
  },
  {
    id: "thresholdSupply",
    label: "Threshold Supply",
    type: "number",
    placeholder: "500000",
    description: "The supply threshold that triggers expansion",
    validate: (value: string, formData: DeployContractProps) => ({
      isValid: /^\d+$/.test(value) && 
               parseInt(value) > 0 && 
               parseInt(value) < parseInt(formData.maxSupply),
      errorMessage: "Threshold must be a positive number less than maximum supply"
    })
  },
  {
    id: "maxExpansionRate",
    label: "Maximum Expansion Rate",
    type: "number",
    placeholder: "5",
    description: "Maximum percentage the supply can expand (1-100)",
    validate: (value: string) => ({
      isValid: /^\d+$/.test(value) && 
               parseInt(value) >= 1 && 
               parseInt(value) <= 100,
      errorMessage: "Expansion rate must be between 1 and 100"
    })
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
  const [validation, setValidation] = useState<FieldValidation>({});
  const [showInfo, setShowInfo] = useState<{ [key: string]: boolean }>({});
  const [isSigning, setIsSigning] = useState(false);

  const { address, chainId } = useAccount();
  const router = useRouter();

  const { writeContract: deployCAT, data: deployData } = useWriteContract();
  const { isLoading: isDeployingTx } = useWaitForTransactionReceipt({
    hash: deployData,
  });

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
      setIsSigning(true);
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

      const formattedMaxSupply = BigInt(maxSupply) * BigInt(1e18);
      const formattedThresholdSupply = BigInt(thresholdSupply) * BigInt(1e18);
      const formattedMaxExpansionRate = BigInt(maxExpansionRate) * BigInt(100);

      await deployCAT({
        address: ClowderVaultFactories[chainId],
        abi: CAT_FACTORY_ABI,
        functionName: "createCAT",
        args: [
          formattedMaxSupply,
          formattedThresholdSupply,
          formattedMaxExpansionRate,
          tokenName,
          tokenSymbol,
        ],
      });
    } catch (error) {
      console.error("Error deploying CAT:", error);
      showTransactionToast({
        hash: "0x0" as `0x${string}`,
        chainId: config.state.chainId,
        success: false,
        message: "Failed to deploy CAT contract",
      });
      setIsDeploying(false);
      setIsSigning(false);
    }
  };

  useEffect(() => {
    if (deployData) {
      const txDetails = {
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        maxSupply: formData.maxSupply,
        thresholdSupply: formData.thresholdSupply,
        maxExpansionRate: formData.maxExpansionRate,
        transactionHash: deployData,
        timestamp: new Date().toISOString(),
      };

      saveTransaction(txDetails);
      showTransactionToast({
        hash: deployData,
        chainId: config.state.chainId,
        message: "CAT contract deployed successfully!",
      });
      router.push("/my-cats");
      setIsDeploying(false);
    }
  }, [deployData, formData, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validate the field
    const field = fields.find(f => f.id === name);
    if (field?.validate) {
      const validationResult = field.validate(value, formData);
      setValidation(prev => ({
        ...prev,
        [name]: validationResult
      }));
    }
  };

  const toggleInfo = (fieldId: string) => {
    setShowInfo(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const newValidation: FieldValidation = {};
    let isValid = true;

    fields.forEach(field => {
      if (field.validate) {
        const result = field.validate(formData[field.id as keyof DeployContractProps], formData);
        newValidation[field.id] = result;
        if (!result.isValid) isValid = false;
      }
    });

    setValidation(newValidation);

    if (isValid) {
      await deployContract();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto px-4 py-12">
          {isDeploying || isDeployingTx ? (
            <LoadingState
              title="Creating Your CAT"
              message="Please wait while we deploy your Contribution Accounting Token..."
            />
          ) : (
            <motion.div
              className="rounded-3xl shadow-2xl bg-white/70 dark:bg-[#1a1400]/80 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg p-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <Link href="/my-cats">
                <motion.button
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 dark:text-yellow-300 dark:hover:text-yellow-400 mb-8 font-semibold"
                  whileHover={{ x: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to My CATs</span>
                </motion.button>
              </Link>
              <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white drop-shadow-lg">
                Create CAT
              </h1>
              {!address ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-lg text-gray-600 dark:text-yellow-200 mb-6">
                    Connect your wallet to create a CAT
                  </p>
                  <div className="bg-[#5cacc5] dark:bg-[#BA9901] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <ConnectButton />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label
                        htmlFor={field.id}
                        className="text-lg font-bold text-blue-400 dark:text-yellow-200"
                      >
                        {field.label}
                      </Label>
                      <div className="relative">
                        <Input
                          id={field.id}
                          name={field.id}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={formData[field.id as keyof DeployContractProps]}
                          onChange={handleChange}
                          className={`w-full h-12 text-lg bg-white/80 dark:bg-[#2a1a00] border-2 ${
                            validation[field.id]?.isValid === false
                              ? 'border-red-500 dark:border-red-400'
                              : 'border-blue-200 dark:border-yellow-700'
                          } text-gray-800 dark:text-yellow-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 rounded-xl transition-all`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => toggleInfo(field.id)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <Info className={`w-5 h-5 ${
                            showInfo[field.id] 
                              ? 'text-blue-500 dark:text-yellow-400' 
                              : 'text-blue-400 dark:text-yellow-400'
                          }`} />
                        </button>
                      </div>
                      {(showInfo[field.id] || validation[field.id]?.isValid === false) && (
                        <p className={`text-sm ${
                          validation[field.id]?.isValid === false
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-blue-600 dark:text-yellow-300'
                        }`}>
                          {validation[field.id]?.isValid === false
                            ? validation[field.id]?.errorMessage
                            : field.description}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      onClick={() => router.push("/my-cats")}
                      className="h-12 px-6 text-lg border-2 border-blue-200 dark:bg-yellow-200 dark:border-yellow-700 bg-transparent hover:bg-blue-50 dark:hover:bg-yellow-300 rounded-xl text-gray-700 dark:text-yellow-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isDeploying || isDeployingTx || isSigning}
                      className="h-12 px-6 text-lg bg-gradient-to-r from-blue-600 to-blue-400 dark:from-[#FFD600] dark:to-[#BA9901] hover:from-blue-700 hover:to-blue-500 dark:hover:from-yellow-400 dark:hover:to-yellow-200 text-white dark:text-black rounded-xl shadow-lg transition-all duration-300"
                    >
                      {isDeploying || isDeployingTx || isSigning ? (
                        <ButtonLoadingState text={isSigning ? "Waiting for signature..." : "Creating..."} />
                      ) : (
                        "Create CAT"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}
