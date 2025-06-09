"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Layout from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import Service_1 from "../images/Service_1.png"
import Service_2 from "../images/Service_2.png"
import Service_3 from "../images/Service_3.png"
import catLight from "../images/Light_cat.png"
import catDark from "../images/Dark_cat.png"
import { useTheme } from "next-themes"
import { faGithub, faDiscord, faTelegram, faXTwitter} from "@fortawesome/free-brands-svg-icons"
import { useAccount } from "wagmi"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { showTransactionToast } from "@/components/ui/transaction-toast"

const services = [
  { image: Service_1, alt: "Semi-Transferable", description: "Semi-Transferable" },
  { image: Service_2, alt: "Secure against Inflation", description: "Secure against Inflation" },
  { image: Service_3, alt: "Simple to Mint", description: "Simple to Mint" },
]

const supportedChains = [
  { id: "534351", name: "Scroll Sepolia" },
  { id: "5115", name: "Citrea" },
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
      } catch (error) {
        showTransactionToast({
          hash: "0x0" as `0x${string}`,
          chainId: Number(selectedChain),
          success: false,
          message: "Failed to process CAT address",
        });
      }
    }
  }

  if (!isThemeReady) return null

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
              Create Contribution Accounting Tokens (CATs) <br />
              to track contributions to your projects.
            </motion.p>

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
          </motion.div>
        </motion.section>

        {/* Services Section */}
        <motion.section
          className="py-24 text-center relative"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <div className="max-w-7xl mx-auto px-4">
            <h2
              className="text-4xl md:text-6xl font-extrabold mb-16 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-blue-400 drop-shadow-lg"
            >
              Why CATs?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-12">
              {services.map((service, index) => (
                <motion.div
                  key={index}
                  className={`
                    group relative rounded-2xl p-8 
                    bg-white/40 dark:bg-[#1a1400]/70
                    border border-white/30 dark:border-yellow-400/20
                    backdrop-blur-lg
                    transition-all duration-300
                    hover:scale-105
                    hover:shadow-[0_8px_32px_0_rgba(90,180,255,0.25)]
                    dark:hover:shadow-[0_8px_32px_0_rgba(255,217,0,0.25)]
                    hover:border-blue-400 dark:hover:border-yellow-400
                    before:absolute before:inset-0 before:rounded-2xl
                    before:bg-gradient-to-br before:from-blue-200/30 before:to-transparent
                    dark:before:from-yellow-400/20 dark:before:to-transparent
                    before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300
                  `}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                >
                  <div className="relative z-10 flex flex-col items-center">
                    <Image
                      src={service.image || "/placeholder.svg"}
                      alt={service.alt}
                      width={250}
                      height={150}
                      className="rounded-xl mb-6 transform group-hover:scale-110 transition-transform duration-300"
                    />
                    <p className="text-2xl font-bold text-gray-900 dark:text-yellow-200 drop-shadow-sm">
                      {service.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
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
              className="text-4xl md:text-6xl font-bold mb-16 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-blue-400"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              About Us
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
                        position="popper"
                        sideOffset={4}
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

