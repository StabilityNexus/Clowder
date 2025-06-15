"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Crown, Hammer, Users } from "lucide-react";

type RoleFilterType = "all" | "creator" | "minter";

interface RoleOption {
  value: RoleFilterType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "all",
    label: "All CATs",
    description: "Admin and Minter",
    icon: <Users className="h-4 w-4" />,
    color: "bg-gradient-to-r from-blue-500/20 to-purple-500/20"
  },
  {
    value: "creator",
    label: "Creator CATs",
    description: "CATs you own",
    icon: <Crown className="h-4 w-4" />,
    color: "bg-gradient-to-r from-green-500/20 to-emerald-500/20"
  },
  {
    value: "minter",
    label: "Minter CATs",
    description: "CATs with minter role",
    icon: <Hammer className="h-4 w-4" />,
    color: "bg-gradient-to-r from-orange-500/20 to-red-500/20"
  }
];

interface CatRoleDropdownProps {
  selectedRole: RoleFilterType;
  onRoleSelect: (role: RoleFilterType) => void;
}

export function CatRoleDropdown({ 
  selectedRole, 
  onRoleSelect
}: CatRoleDropdownProps) {
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

  const selectedOption = ROLE_OPTIONS.find(option => option.value === selectedRole) || ROLE_OPTIONS[0];

  const handleSelect = (role: RoleFilterType) => {
    onRoleSelect(role);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[200px] px-4 py-3 rounded-xl bg-white/90 dark:bg-[#1a1400]/80 border border-[#bfdbfe] dark:border-yellow-400/20 text-gray-800 dark:text-yellow-100 hover:bg-white dark:hover:bg-[#1a1400]/90 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-yellow-400 focus:border-transparent transition-all duration-300 shadow-sm hover:shadow-md"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${selectedOption.color} flex items-center justify-center`}>
            <div className="text-gray-700 dark:text-yellow-200">
              {selectedOption.icon}
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-medium text-foreground text-sm">{selectedOption.label}</span>
          </div>
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
            className="absolute top-full left-0 right-0 mt-2 py-2 bg-white/95 dark:bg-[#1a1400]/95 backdrop-blur-lg border border-[#bfdbfe] dark:border-yellow-400/20 rounded-xl shadow-xl z-50"
          >
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-yellow-200/70 uppercase tracking-wide">
                Filter by Role
              </p>
            </div>

            {ROLE_OPTIONS.map((option) => (
              <motion.button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 dark:hover:bg-yellow-400/10 transition-colors duration-200"
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full ${option.color} flex items-center justify-center`}>
                    <div className="text-gray-700 dark:text-yellow-200">
                      {option.icon}
                    </div>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-gray-800 dark:text-yellow-100 text-sm">
                      {option.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-yellow-200/70">
                      {option.description}
                    </span>
                  </div>
                </div>
                {selectedRole === option.value && (
                  <Check className="w-4 h-4 text-blue-500 dark:text-yellow-400" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 