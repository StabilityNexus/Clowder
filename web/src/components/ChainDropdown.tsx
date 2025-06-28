"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Network } from "lucide-react";

// Define supported chain IDs
// type SupportedChainId = 137 | 534351 | 5115 | 61 | 8453;
type SupportedChainId = 5115;

// Chain ID to name mapping
const CHAIN_NAMES: Record<SupportedChainId, string> = {
  // 137: "Polygon",
  // 534351: "Scroll Sepolia", 
  5115: "Citrea Testnet",
  // 61: "Ethereum Classic",
  // 8453: "Base Mainnet",
};

// Chain colors for visual distinction
const CHAIN_COLORS: Record<SupportedChainId, string> = {
  // 137: "bg-purple-500",
  // 534351: "bg-orange-500",
  5115: "bg-yellow-500", 
  // 61: "bg-green-500",
  // 8453: "bg-blue-500",
};

interface ChainDropdownProps {
  selectedChainId: SupportedChainId | "all";
  onChainSelect: (chainId: SupportedChainId | "all") => void;
  currentChainId?: number;
  getSortedChainOptions: () => [string, string][];
}

export function ChainDropdown({ 
  selectedChainId, 
  onChainSelect, 
  currentChainId,
  getSortedChainOptions 
}: ChainDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getDisplayText = () => {
    if (selectedChainId === "all") {
      return "All Networks";
    }
    return CHAIN_NAMES[selectedChainId as SupportedChainId];
  };

 
  const getDisplayIcon = () => {
    if (selectedChainId === "all") {
      return <Network className='h-4 w-4 text-muted-foreground' />;
    }
    return <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[selectedChainId as SupportedChainId]}`}></div>;
  };

  const handleSelect = (chainId: SupportedChainId | "all") => {
    onChainSelect(chainId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[220px] px-4 py-3 rounded-xl bg-white/90 dark:bg-[#1a1400]/80 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 hover:bg-white dark:hover:bg-[#1a1400]/90 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-2">
          {getDisplayIcon()}
          <span className="font-medium text-foreground">{getDisplayText()}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-blue-500 dark:text-yellow-400" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 py-2 bg-white/95 dark:bg-[#1a1400]/95 backdrop-blur-lg border border-[#bfdbfe] dark:border-yellow-400/20 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
          >
            {/* Connected Network Section */}
            {currentChainId && Object.keys(CHAIN_NAMES).includes(currentChainId.toString()) && (
              <>
                <motion.button
                    onClick={() => handleSelect("all")}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
                    whileHover={{ x: 2 }}
                    >
                    <div className="flex items-center gap-3">
                        <div className='w-6 h-6 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center'>
                        <Network className='h-3 w-3 text-primary' />
                        </div>
                        <span className="font-medium text-foreground">All Networks</span>
                    </div>
                    {selectedChainId === "all" && (
                        <Check className="w-4 h-4 text-primary" />
                    )}
                 </motion.button>
                <div className="mx-4 my-2 border-t border-gray-200 dark:border-yellow-400/20"></div>

                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-yellow-200/70 uppercase tracking-wide">
                    Connected Network
                  </p>
                </div>
                <motion.button
                  onClick={() => handleSelect(currentChainId as SupportedChainId)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 dark:hover:bg-yellow-400/10 transition-colors duration-200"
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[currentChainId as SupportedChainId]}`}></div>
                    </div>
                    <span className="font-medium text-gray-800 dark:text-yellow-100">
                      {CHAIN_NAMES[currentChainId as SupportedChainId]}
                    </span>
                  </div>
                  {selectedChainId === currentChainId && (
                    <Check className="w-4 h-4 text-blue-500 dark:text-yellow-400" />
                  )}
                </motion.button>
                <div className="mx-4 my-2 border-t border-gray-200 dark:border-yellow-400/20"></div>
              </>
            )}

            {/* All Networks Option */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-yellow-200/70 uppercase tracking-wide">
                Other Networks
              </p>
            </div>

            {/* Other Chain Options */}
            {getSortedChainOptions()
              .filter(([chainId]) => Number(chainId) !== currentChainId)
              .map(([chainId, name]) => {
                const chainIdNum = Number(chainId) as SupportedChainId;
                return (
                  <motion.button
                    key={chainId}
                    onClick={() => handleSelect(chainIdNum)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 dark:hover:bg-yellow-400/10 transition-colors duration-200"
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${CHAIN_COLORS[chainIdNum]}`}></div>
                      <span className="font-medium text-gray-800 dark:text-yellow-100">
                        {name}
                      </span>
                    </div>
                    {selectedChainId === chainIdNum && (
                      <Check className="w-4 h-4 text-blue-500 dark:text-yellow-400" />
                    )}
                  </motion.button>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 