export const catExplorer = (hash: `0x${string}`, chainId: number): string => {
    const baseUrls: { [key: number]: string } = {
      1: "https://etherscan.io/address/",
      137: "https://polygonscan.com/address/",
      534351: "https://sepolia.scrollscan.com/address/",
      5115: "https://explorer.testnet.mantle.xyz/address/",
      61: "https://explorer.testnet.rsk.co/address/",
      2001: "https://explorer.testnet.milkomeda.com/address/",
      8453: "https://basescan.org/address/",
      84531: "https://goerli.basescan.org/address/",
    };
  
    const baseUrl = baseUrls[chainId];
    if (!baseUrl) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
  
    return `${baseUrl}${hash}`;
  }; 