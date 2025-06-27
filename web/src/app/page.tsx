"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"

import catLight from "../images/Light_cat.png"
import catDark from "../images/Dark_cat.png"
import { useTheme } from "next-themes"
import { faGithub, faDiscord, faTelegram, faXTwitter} from "@fortawesome/free-brands-svg-icons"
import { useAccount } from "wagmi"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { showTransactionToast } from "@/components/ui/transaction-toast"



const supportedChains = [
  { id: "534351", name: "Scroll Sepolia" },
  { id: "5115", name: "Citrea Testnet" },
  { id: "61", name: "Ethereum Classic" },
  { id: "8453", name: "Base Mainnet" },
  { id: "137", name: "Polygon Mainnet" },
];

const contact_links = [
  { href: "https://github.com/StabilityNexus", icon: faGithub },
  { href: "https://discord.gg/YzDKeEfWtS", icon: faDiscord },
  { href: "https://t.me/StabilityNexus", icon: faTelegram },
  { href: "https://x.com/StabilityNexus", icon: faXTwitter },
]

export default function Home() {
  const { resolvedTheme } = useTheme()
  const [isThemeReady, setIsThemeReady] = useState(false)
  const [catAddress, setCatAddress] = useState("")
  const [showPopup, setShowPopup] = useState(false)
  const router = useRouter()
  const { address } = useAccount()
  const [selectedChain, setSelectedChain] = useState("")

  useEffect(() => {
    if (resolvedTheme) {
      setIsThemeReady(true)
    }
  }, [resolvedTheme])

  useEffect(() => {
    if (showPopup) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPopup]);

  const handleUseCAT = () => {
    if (catAddress.trim() && selectedChain) {
      try {
        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(catAddress)) {
          showTransactionToast({
            hash: "0x0" as `0x${string}`,
            chainId: Number(selectedChain),
            success: false,
            message: "Invalid CAT address format",
          });
          return;
        }

        router.push(`/c?vault=${catAddress}&chainId=${selectedChain}`);
        setShowPopup(false);
      } catch {
        showTransactionToast({
          hash: "0x0" as `0x${string}`,
          chainId: Number(selectedChain),
          success: false,
          message: "Failed to process CAT address",
        });
      }
    }
  }

  if (!isThemeReady) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen ">
        {/* Hero Section */}
        <motion.section
          className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -bottom-20 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-900 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-300 dark:bg-blue-800 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400 dark:bg-blue-700 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>

          <motion.div
            className="relative z-10 max-w-4xl mx-auto px-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white mb-4 md:mb-0 drop-shadow-lg">
              Welcome to <span className="text-[#5cacc5] dark:text-[#BA9901]">Clowder</span>
            </h1>
            <motion.p
              className="text-xl font-bold md:text-2xl mb-12 mt-8 text-gray-600 dark:text-gray-300 "
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Track contributions to your projects using <br />
              Contribution Accounting Tokens (CATs)
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-4"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {!address ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#5cacc5] dark:bg-[#BA9901] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <ConnectButton />
                </motion.div>
              ) : (
                <>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/my-cats")}
                      className="h-14 px-8 text-lg bg-white/60 font-bold dark:bg-[#1a1400]/70 text-gray-700 dark:text-yellow-200 hover:bg-white/80 dark:hover:bg-[#1a1400]/90 border border-white/30 dark:border-yellow-400/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      My CATs
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => router.push("/create")}
                      className="h-14 px-8 text-lg bg-[#5cacc5] font-bold dark:bg-[#BA9901] text-white hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Create CAT
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={() => setShowPopup(true)}
                      className="h-14 px-8 text-lg font-bold bg-white/60 dark:bg-[#1a1400]/70 text-gray-700 dark:text-yellow-200 hover:bg-white/80 dark:hover:bg-[#1a1400]/90 border border-white/30 dark:border-yellow-400/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Use CAT
                    </Button>
                  </motion.div>
                </>
              )}
            </motion.div>

            <motion.div
              className="flex items-center justify-center space-x-6 mb-12"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {contact_links.map(({ href, icon }, index) => (
                <motion.a
                  key={index}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-3xl text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <FontAwesomeIcon icon={icon} />
                </motion.a>
              ))}
            </motion.div>
            
          </motion.div>
        </motion.section>

        {/* How it Works Section */}
        <motion.section
          className="py-24 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <motion.div
              className="text-center mb-20"
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <motion.h2 
                className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white drop-shadow-sm"
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                How CATs Work
              </motion.h2>
              <motion.div 
                className="w-24 h-1.5 bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white mx-auto mb-8 rounded-full shadow-lg"
                initial={{ width: 0 }}
                whileInView={{ width: 96 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              ></motion.div>
            </motion.div>

            {/* Main Flow */}
            <motion.div
              className="mb-20"
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
                {[
                  {
                    step: "1",
                    title: "Setup",
                    detail: "Define the maximum token supply and maximum supply expansion rate to prevent excessive dillution and ensure token stability.",
                    gradient: "from-blue-500 to-blue-600 dark:from-yellow-400 dark:to-yellow-500"
                  },
                  {
                    step: "2",
                    title: "Token Distribution",
                    detail: "Grant revokable minter role to trusted contributors, to authorize them to mint tokens for the community within the defined bounds.",
                    gradient: "from-purple-500 to-purple-600 dark:from-yellow-500 dark:to-yellow-600"
                  },
                  {
                    step: "3",
                    title: "Token Transfers",
                    detail: "Initially tokens are only transferrable between addresses that already hold them, preventing speculation. Enable unrestricted token transfers at any time when the project is ready.",
                    gradient: "from-indigo-500 to-indigo-600 dark:from-yellow-600 dark:to-yellow-700"
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    className="relative group"
                    initial={{ y: 40, opacity: 0, scale: 0.95 }}
                    whileInView={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.7, 
                      delay: 0.2 * index,
                      ease: "easeOut",
                      type: "spring",
                      stiffness: 100
                    }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -8, 
                      scale: 1.03,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                  >
                    <div className="relative bg-white/90 dark:bg-[#1a1400]/95 backdrop-blur-md p-8 rounded-3xl border border-white/60 dark:border-yellow-400/30 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden h-full min-h-[200px] flex flex-col group-hover:border-blue-400/50 dark:group-hover:border-yellow-400/50">
                      {/* Creative glow effect on hover */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-blue-400/20 dark:from-yellow-400/20 dark:via-yellow-500/20 dark:to-yellow-400/20 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                      
                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent dark:from-yellow-400/5 dark:via-transparent dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                      
                      {/* Content */}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center mb-6 flex-shrink-0">
                          <motion.div 
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${step.gradient} flex items-center justify-center text-white dark:text-black font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                          >
                            {step.step}
                          </motion.div>
                        </div>
                        
                        <div className="flex-grow flex flex-col">
                          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-yellow-200 mb-4 group-hover:text-blue-600 dark:group-hover:text-yellow-300 transition-colors duration-300 leading-tight group-hover:drop-shadow-sm">
                            {step.title}
                          </h3>
                          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 font-medium leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                      
                      {/* Enhanced bottom accent with animated gradient */}
                      <div className={`absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r ${step.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-3xl`}></div>
                      <div className={`absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r ${step.gradient} opacity-50 blur-sm transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 delay-100 rounded-b-3xl`}></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Perfect Use Cases */}
            <motion.div
              className="text-center"
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              viewport={{ once: true }}
            >
                             <motion.h3 
                 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white mb-4 drop-shadow-lg"
                 initial={{ scale: 0.9 }}
                 whileInView={{ scale: 1 }}
                 transition={{ duration: 0.6, delay: 0.8 }}
                 viewport={{ once: true }}
               >
                 Why CATs
               </motion.h3>
              <motion.p 
                className="text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto text-lg font-medium leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                viewport={{ once: true }}
              >
                CATs are proof-of-contribution tokens, rewarding collaboration with ownership. <br />
                CATs shine brightest in projects that require cooperation and proper accounting of contributions. <br />
                Typical use cases include:
              </motion.p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    {
                      title: "Open Source Software Development",
                      explanation: "Developers can reward themselves for coding, fixing bugs, writing documentation and improving a project&apos;s impact.",
                      gradient: "from-blue-500 to-blue-600 dark:from-yellow-400 dark:to-yellow-500"
                    },
                    {
                      title: "Collaborative Creativity",
                      explanation: "Artists, musicians and content creators can share ownership according to the value of their creative input.",
                      gradient: "from-blue-500 to-blue-600 dark:from-yellow-500 dark:to-yellow-600"
                    },
                    {
                      title: "Event Management",
                      explanation: "Event organizers, volunteers and promoters can recognize their efforts for making events successful and engaging.",
                      gradient: "from-blue-500 to-blue-600 dark:from-yellow-400 dark:to-yellow-500"
                    },
                    {
                      title: "Governance-Based DAOs",
                      explanation: "Community members can give themselves fair governance rights and influence based on their active participation.",
                      gradient: "from-blue-500 to-blue-600 dark:from-yellow-500 dark:to-yellow-600"
                    }
                  ].map((useCase, index) => (
                  <motion.div
                    key={index}
                    className="group relative overflow-hidden bg-white/90 dark:bg-[#1a1400]/95 p-8 rounded-3xl border border-gray-200/60 dark:border-yellow-400/30 hover:shadow-2xl transition-all duration-500 backdrop-blur-md"
                    initial={{ y: 40, opacity: 0, scale: 0.9 }}
                    whileInView={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ 
                      duration: 0.6, 
                      delay: 0.15 * index,
                      ease: "easeOut",
                      type: "spring",
                      stiffness: 120
                    }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -12, 
                      scale: 1.05,
                      transition: { duration: 0.4, ease: "easeOut" }
                    }}
                  >
                    {/* Enhanced gradient overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-3xl`}></div>
                    
                    {/* Floating background elements */}
                    <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <h4 className="font-bold text-gray-900 dark:text-yellow-200 text-xl mb-4 group-hover:text-blue-600 dark:group-hover:text-yellow-300 transition-colors duration-300">
                        {useCase.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                        {useCase.explanation}
                      </p>
                    </div>
                    
                    {/* Enhanced bottom accent with pulse effect */}
                    <div className={`absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r ${useCase.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-b-3xl`}></div>
                    <div className={`absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r ${useCase.gradient} opacity-50 animate-pulse transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 delay-200 rounded-b-3xl`}></div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* About Us Section */}
        <motion.section
          className="py-24 relative overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <motion.h2
              className="text-4xl md:text-6xl font-bold mb-16 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white drop-shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Clowder's Team
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <motion.div
                className="space-y-8"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <p className="text-xl md:text-xl text-gray-600 dark:text-gray-300 font-bold leading-relaxed">
                  Clowder was developed by <br />
                  The Stable Order <br />
                  within the Stability Nexus.
                </p>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                <p className="text-xl md:text-xl text-gray-600 dark:text-gray-300 font-bold">
                  Contact us through:
                </p>
                <div className="flex space-x-6">
                  {contact_links.map(({ href, icon }, index) => (
                    <motion.a
                      key={index}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xl text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FontAwesomeIcon icon={icon} />
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="relative"
                initial={{ x: 20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="relative z-10 flex flex-col items-center">
                  <Image
                    src={resolvedTheme === "dark" ? catDark : catLight}
                    alt="Clowder Contact"
                    width={450}
                    height={450}
                    className="rounded-2xl transform hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Use CAT Modal */}
      <AnimatePresence>
        {showPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowPopup(false)}
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-[101] w-full max-w-[600px] mx-4 bg-white/90 dark:bg-[#1a1400]/95 border-2 border-blue-200 dark:border-yellow-400/30 backdrop-blur-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-visible"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white">
                      Use Existing CAT
                    </h2>
                    <p className="text-gray-600 dark:text-yellow-100 mt-1">
                      Enter the CAT address and select the network to interact with your token.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="catAddress" className="text-sm font-medium text-blue-600 dark:text-yellow-200">
                      CAT Address
                    </label>
                    <Input
                      id="catAddress"
                      value={catAddress}
                      onChange={(e) => setCatAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full h-12 text-lg font-mono bg-white/80 dark:bg-[#2a1a00]/90 border-2 border-blue-200 dark:border-yellow-400/30 text-gray-800 dark:text-yellow-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2 relative z-[102]">
                    <label className="text-sm font-medium text-blue-600 dark:text-yellow-200">
                      Network
                    </label>
                    <Select value={selectedChain} onValueChange={setSelectedChain}>
                      <SelectTrigger className="w-full h-12 text-lg text-gray-800 dark:text-yellow-100 bg-white/80 dark:bg-[#2a1a00]/90 border-2 border-blue-200 dark:border-yellow-400/30 rounded-xl">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-white/95 dark:bg-[#1a1400]/95 border-2 border-blue-200 dark:border-yellow-400/30 rounded-xl z-[103] max-h-[200px] overflow-y-auto"
                      >
                        {supportedChains.map((chain) => (
                          <SelectItem 
                            key={chain.id} 
                            value={chain.id}
                            className="text-gray-800 dark:text-yellow-100 hover:bg-blue-50 dark:hover:bg-yellow-400/10 rounded-lg py-3 px-4 text-base cursor-pointer"
                          >
                            {chain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <Button
                    onClick={() => setShowPopup(false)}
                    className="h-12 px-6 text-lg border-2 border-blue-200 dark:border-yellow-400/30 bg-transparent hover:bg-blue-50 dark:hover:bg-yellow-400/10 text-gray-700 dark:text-yellow-200 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUseCAT}
                    disabled={!catAddress.trim() || !selectedChain}
                    className="h-12 px-6 text-lg bg-gradient-to-r from-blue-600 to-blue-400 dark:from-[#FFD600] dark:to-[#BA9901] hover:from-blue-700 hover:to-blue-500 dark:hover:from-yellow-400 dark:hover:to-yellow-200 text-white dark:text-black rounded-xl shadow-lg transition-all duration-300"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  )
}

