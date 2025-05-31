import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";
import { getExplorerUrl } from "@/utils/explorer";

interface TransactionToastProps {
  hash: `0x${string}`;
  chainId: number;
  success?: boolean;
  message?: string;
}

export const showTransactionToast = ({
  hash,
  chainId,
  success = true,
  message = success ? "Transaction successful!" : "Transaction failed!",
}: TransactionToastProps) => {
  const explorerUrl = getExplorerUrl(hash, chainId);

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {success ? (
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              ) : (
                <XCircle className="h-10 w-10 text-red-400" />
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {message}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Transaction Hash: {hash.slice(0, 6)}...{hash.slice(-4)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            View on Explorer
          </a>
        </div>
      </div>
    ),
    {
      duration: 5000,
      position: "bottom-right",
    }
  );
}; 