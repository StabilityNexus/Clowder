import { motion } from "framer-motion";
import { Coins, AlertCircle } from "lucide-react";

interface LoadingStateProps {
  title?: string;
  message?: string;
  type?: "loading" | "error";
  errorMessage?: string;
  showSkeleton?: boolean;
}

export function LoadingState({
  title = "Loading...",
  message = "Please wait while we process your request...",
  type = "loading",
  errorMessage,
  showSkeleton = true,
}: LoadingStateProps) {
  return (
    <div className="min-h-screen mx-auto">
      <div className="max-w-7xl mx-auto space-y-8 px-4 py-12">
        <div className="text-center mb-12 overflow-visible">
          <motion.div
            className={`w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br ${
              type === "loading"
                ? "from-blue-200 to-blue-300 dark:from-yellow-400/20 dark:to-blue-400/20"
                : "from-red-200 to-red-300 dark:from-red-400/20 dark:to-red-400/20"
            } flex items-center justify-center`}
            animate={type === "loading" ? { rotate: 360 } : { scale: 1 }}
            transition={type === "loading" ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
          >
            {type === "loading" ? (
              <Coins className="w-12 h-12 text-blue-500 dark:text-yellow-400" />
            ) : (
              <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" />
            )}
          </motion.div>
          <motion.h1 
            className={`text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${
              type === "loading"
                ? "from-blue-600 to-blue-200 dark:from-[#FFD600] dark:to-white"
                : "from-red-600 to-red-200 dark:from-red-400 dark:to-red-200"
            } mb-4`}
            style={{ lineHeight: '1.3', paddingBottom: '0.25rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {type === "loading" ? title : "Error"}
          </motion.h1>
          <motion.p 
            className={`text-lg ${
              type === "loading"
                ? "text-gray-600 dark:text-yellow-100"
                : "text-red-600 dark:text-red-400"
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {type === "loading" ? message : errorMessage}
          </motion.p>
        </div>

        {showSkeleton && type === "loading" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((index) => (
                <motion.div
                  key={index}
                  className="group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-yellow-400/20 animate-pulse" />
                    <div className="h-5 w-32 bg-blue-200 dark:bg-yellow-400/20 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-24 bg-blue-200 dark:bg-yellow-400/20 rounded animate-pulse" />
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-6 group relative rounded-2xl p-6 shadow-2xl bg-white/60 dark:bg-[#1a1400]/70 border border-white/30 dark:border-yellow-400/20 backdrop-blur-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-blue-200 dark:bg-yellow-400/20 animate-pulse" />
                <div className="h-5 w-40 bg-blue-200 dark:bg-yellow-400/20 rounded animate-pulse" />
              </div>
              <div className="h-6 w-full bg-blue-200 dark:bg-yellow-400/20 rounded animate-pulse" />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
} 