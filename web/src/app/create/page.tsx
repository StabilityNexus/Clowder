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
import { useAccount, useChainId } from "wagmi";
import { config } from "@/utils/config";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CAT_FACTORY_ABI } from "@/contractsABI/CatFactoryABI";
import { Info, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { showTransactionToast } from "@/components/ui/transaction-toast";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingState } from "@/components/ui/button-loading-state";
import { getPublicClient } from "@wagmi/core";

// Define supported chain IDs and names
type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;

const CHAIN_NAMES: Record<SupportedChainId, string> = {
  137: "Polygon",
  534351: "Scroll Sepolia",
  5115: "Citrea Testnet", 
  61: "Ethereum Classic",
  8453: "Base Mainnet",
};

const CHAIN_COLORS: Record<SupportedChainId, string> = {
  137: "bg-purple-500",
  534351: "bg-orange-500",
  5115: "bg-yellow-500",
  61: "bg-green-500", 
  8453: "bg-blue-500",
};

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
      isValid: value.length >= 3,
      errorMessage: "Token name must be more than 3 characters"
    })
  },
  {
    id: "tokenSymbol",
    label: "Token Symbol",
    type: "text",
    placeholder: "TKN",
    description: "A short identifier for your token.",
    validate: (value: string) => ({
      isValid: /^[A-Z]{2,}$/.test(value),
      errorMessage: "Symbol must be uppercase letters"
    })
  },
  {
    id: "maxSupply",
    label: "Maximum Supply",
    type: "number",
    placeholder: "1000000",
    description: "The maximum number of tokens that can ever exist",
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
    description: "The supply threshold above which further supply expansion is restricted by the maximum expansion rate.",
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
    description: "Maximum supply expansion rate per year, for expansions above the supply threshold.",
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

  const { address } = useAccount();
  const currentChainId = useChainId();
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
      
      // Wait for transaction to be mined before showing success toast and redirecting
      const checkTransaction = async () => {
        try {
          const publicClient = getPublicClient(config);
          if (!publicClient) {
            throw new Error("Public client not available");
          }
          await publicClient.waitForTransactionReceipt({ hash: deployData });
          
          showTransactionToast({
            hash: deployData,
            chainId: config.state.chainId,
            message: "CAT contract deployed successfully!",
          });
          
          // Add a small delay before redirecting to ensure the blockchain state is updated
          setTimeout(() => {
            router.push("/my-cats");
            setIsDeploying(false);
          }, 2000);
        } catch (error) {
          console.error("Error waiting for transaction:", error);
          showTransactionToast({
            hash: deployData,
            chainId: config.state.chainId,
            success: false,
            message: "Failed to deploy CAT contract",
          });
          setIsDeploying(false);
        }
      };

      checkTransaction();
    }
  }, [deployData, formData, router, saveTransaction]);

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
              <div className="flex justify-between items-center mb-8">
                <Link href="/my-cats">
                  <motion.button
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 dark:text-yellow-300 dark:hover:text-yellow-400 font-semibold"
                    whileHover={{ x: -5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to My CATs</span>
                  </motion.button>
                </Link>
                
                {/* Connected Network Display */}
                {currentChainId && CHAIN_NAMES[currentChainId as SupportedChainId] && (
                  <motion.div
                    className="flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-white/80 to-white/60 dark:from-[#2a1a00]/80 dark:to-[#2a1a00]/60 border border-blue-200/50 dark:border-yellow-400/30 shadow-sm backdrop-blur-sm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${CHAIN_COLORS[currentChainId as SupportedChainId]} shadow-sm`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 dark:text-yellow-300/70 font-medium">
                        Currently On:
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-yellow-200">
                        {CHAIN_NAMES[currentChainId as SupportedChainId]}
                      </span>
                    </div>
                  </motion.div>
                )}
              </div>
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
                          } text-gray-800 dark:text-yellow-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 rounded-xl transition-all ${
                            field.id === 'maxExpansionRate' ? 'pr-16' : ''
                          }`}
                          required
                        />
                        {field.id === 'maxExpansionRate' && (
                          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-lg font-medium text-gray-600 dark:text-yellow-300 pointer-events-none">
                            %
                          </span>
                        )}
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
