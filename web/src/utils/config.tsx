import {
  // polygon,
  // scrollSepolia,
  // base,
} from "wagmi/chains";
import {
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { citreaTestnet } from "@/components/CitreaTestnet";
// import { ethereumClassic } from "@/components/EthereumClassic";

export const config = getDefaultConfig({
  appName: "clowder",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID ?? "",
  chains: [
    // scrollSepolia,
    // base,
    // polygon,
    // ethereumClassic,
    citreaTestnet,
  ] as const,
  ssr: true, // Disable SSR for static export
});
