import { motion } from "framer-motion";
import { Coins } from "lucide-react";

interface ButtonLoadingStateProps {
  text: string;
}

export function ButtonLoadingState({ text }: ButtonLoadingStateProps) {
  return (
    <div className="flex items-center justify-center space-x-2">
      <motion.div
        className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 dark:from-yellow-400/20 dark:to-blue-400/20 flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Coins className="w-3 h-3 text-blue-500 dark:text-yellow-400" />
      </motion.div>
      <span>{text}</span>
    </div>
  );
} 