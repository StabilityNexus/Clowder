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
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { showTransactionToast } from "@/components/ui/transaction-toast"
// import { config } from "@/utils/config"

const services = [
  { image: Service_1, alt: "Semi-Transferable", description: "Semi-Transferable" },
  { image: Service_2, alt: "Secure against Inflation", description: "Secure against Inflation" },
  { image: Service_3, alt: "Simple to Mint", description: "Simple to Mint" },
]

const supportedChains = [
  { id: "534351", name: "Scroll Sepolia" },
  { id: "5115", name: "Citrea" },
  { id: "61", name: "Ethereum Classic" },
  { id: "2001", name: "Milkomeda" },
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
  const [isWalletConnected, setIsWalletConnected] = useState("")
  const router = useRouter()
  const { address } = useAccount()
  const [selectedChain, setSelectedChain] = useState("")

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

  useEffect(() => {
    if (resolvedTheme) {
      setIsThemeReady(true)
    }
  }, [resolvedTheme])

  useEffect(() => {
    setIsWalletConnected(address as `0x${string}`)
  }, [address])

  if (!isThemeReady) return null

  return (
    <Layout>
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <motion.section
          className="flex flex-col items-center pt-48 min-h-screen text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-8 font-mono">
              Welcome to <span className="text-[#5cacc5] dark:text-[#BA9901]">Clowder</span>
            </h1>
          </motion.div>

          <motion.p
            className="text-xl md:text-2xl mb-6 max-w-4xl font-mono"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Create Contribution Accounting Tokens (CATs) <br />
            to track contributions to your projects.
          </motion.p>
          <motion.div
            className="flex space-x-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {contact_links.map(({ href, icon }, index) => (
              <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-3xl md:text-4xl hover:text-blue-600 transition-colors duration-300"
              >
                <FontAwesomeIcon icon={icon} />
              </a>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            {!isWalletConnected ? (
              <div className="bg-[#5cacc5] dark:bg-[#BA9901] rounded-[8px]">
                <ConnectButton/>
              </div>
            ) : (
              <div className="max-w-full">
                <Button
                  onClick={() => router.push("/my-cats")}
                  className="mb-2 mr-2 text-black dark:text-white"
                >
                  My CAT's
                </Button>
                <Button
                  onClick={() => router.push("/create")}
                  className="mb-2 mr-2 text-black dark:text-white"
                >
                  Create CAT
                </Button>
                <Button onClick={() => setShowPopup(true)} className="bg-gray-600 hover:bg-gray-700 text-white">
                  Use CAT
                </Button>
              </div>
            )}
          </motion.div>
        </motion.section>

        {/* Services Section */}
        <motion.section
          className="py-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <h2
            id="Services"
            className="text-3xl md:text-5xl font-bold mb-12"
            style={{ fontFamily: "var(--font-bebas-nueue)" }}
          >
            Why CATs?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center transform transition-all duration-300 hover:scale-105"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 + 1.2 }}
              >
                <Image
                  src={service.image || "/placeholder.svg"}
                  alt={service.alt}
                  width={250}
                  height={150}
                  className="rounded-md shadow-lg"
                />
                <p className="text-lg md:text-2xl font-semibold mt-3 font-mono">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Contact Us Section */}
        <motion.section
          className="py-16 mx-4 md:mx-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.8 }}
        >
          <h2
            id="Contact"
            className="text-3xl md:text-5xl font-bold mb-12 text-center"
            style={{ fontFamily: "var(--font-bebas-nueue)" }}
          >
            About Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center md:py-20">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 2 }}
            >
              <p className="text-lg md:text-2xl mb-4 font-mono">
                Clowder was developed by <br />
                The Stable Order <br />
                within the Stability Nexus.
              </p>
              <hr className="bg-black dark:bg-white w-4/5 h-px font-bold mb-4" />
              <p className="text-lg md:text-2xl mb-3 font-mono">Contact us through:</p>
              <div className="flex flex-col md:flex-row space-y-2 md:space-x-4 md:space-y-0">
                {contact_links.map(({ href, icon }, index) => (
                  <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl hover:text-blue-600 transition-colors duration-300"
                  >
                    <FontAwesomeIcon icon={icon} />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Right Content */}
            <motion.div
              className="relative flex justify-center items-center mt-8 md:mt-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 2.2 }}
            >
              <Image
                src={resolvedTheme === "dark" ? catDark : catLight}
                alt="Clowder Contact"
                width={450}
                height={450}
                className="rounded-full shadow-2xl"
              />
            </motion.div>
          </div>
        </motion.section>
      </div>

      {/* Use CAT Dialog */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-2xl dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Use Existing CAT
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Enter the CAT address and select the network to interact with your token.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="catAddress" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  CAT Address
                </label>
                <Input
                  id="catAddress"
                  value={catAddress}
                  onChange={(e) => setCatAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full h-12 text-lg font-mono bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="network" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Network
                </label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger className="w-full h-12 text-lg text-black bg-gray-50 dark:bg-gray-800 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                    {supportedChains.map((chain) => (
                      <SelectItem 
                        key={chain.id} 
                        value={chain.id}
                        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <Button
              onClick={() => setShowPopup(false)}
              className="h-12 px-6 text-lg border-2 border-gray-200 dark:bg-gray-200 dark:border-gray-700 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-400 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUseCAT}
              disabled={!catAddress.trim() || !selectedChain}
              className="h-12 px-6 text-lg bg-[#5cacc5] dark:bg-[#BA9901] hover:bg-[#4a9db5] dark:hover:bg-[#a88a01] text-white rounded-xl"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {showPopup && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50"
          onClick={() => setShowPopup(false)}
        />
      )}
    </Layout>
  )
}

