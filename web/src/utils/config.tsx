import {
  mainnet,
  polygon,
  scrollSepolia,
} from "wagmi/chains";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { citreaTestnet } from "@/components/CitreaTestnet";
import { ethereumClassic } from "@/components/EthereumClassic";
import { milkomeda } from "@/components/Milkomeda";

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
