import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  scrollSepolia,
  sepolia,
  Chain,
} from "wagmi/chains";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { citreaTestnet } from "@/components/CitreaTestnet";


export const ethereumClassic = {
  id: 61, // Ethereum Classic chain ID
  name: "Ethereum Classic",
  network: "ethereumClassic",
  nativeCurrency: {
    name: "Ethereum Classic",
    symbol: "ETC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://etc.rivet.link"],
    },
    public: {
      http: ["https://etc.rivet.link"],
    },
  },
  blockExplorers: {
    default: {
      name: "BlockScout",
      url: "https://blockscout.com/etc/mainnet",
    },
  },
};

export const milkomeda = {
  id: 2001, // Milkomeda C1 (Cardano sidechain) chain ID
  name: "Milkomeda",
  network: "milkomeda",
  nativeCurrency: {
    name: "MilkADA",
    symbol: "mADA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-mainnet-cardano-evm.c1.milkomeda.com"],
    },
    public: {
      http: ["https://rpc-mainnet-cardano-evm.c1.milkomeda.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Milkomeda Explorer",
      url: "https://explorer-mainnet-cardano-evm.c1.milkomeda.com",
    },
  },
};


export const config = getDefaultConfig({
  appName: "clowder",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID ?? "",
  chains: [
    scrollSepolia,
    polygon,
    mainnet,
    citreaTestnet,
    ethereumClassic,
    milkomeda,
  ],
  ssr: true,
});
