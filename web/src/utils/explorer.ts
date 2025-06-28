export const getExplorerUrl = (hash: `0x${string}`, chainId: number): string => {
  const baseUrls: { [key: number]: string } = {
    1: "https://etherscan.io/tx/",
    137: "https://polygonscan.com/tx/",
    534351: "https://sepolia.scrollscan.com/tx/",
    5115: "https://explorer.testnet.citrea.xyz/tx/",
    61: "https://etc.blockscout.com/tx/",
    2001: "https://explorer.testnet.milkomeda.com/tx/",
    8453: "https://basescan.org/tx/",
    // 84531: "https://goerli.basescan.org/tx/",
  };

  const baseUrl = baseUrls[chainId];
  if (!baseUrl) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return `${baseUrl}${hash}`;
}; 