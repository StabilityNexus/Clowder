"use client";

import React from "react";
import { useWallet } from "@/hooks/WalletConnectProvider";
import Image from "next/image";
import { useAccount } from "wagmi";

function generateAvatar(walletAddress: string): string {
  const baseUrl = "https://api.dicebear.com/6.x/identicon/svg";
  return `${baseUrl}?seed=${encodeURIComponent(walletAddress)}`;
}

const Avatar = () => {
  const { address } = useAccount(); // Replace with your wallet context or connection logic

  if (address === '0x0')  {
    return <p>Please connect your wallet to see your avatar.</p>;
  }

  // Generate the avatar URL
  const avatarUrl = generateAvatar(address as `0x${string}`);

  return (
    <div className="flex flex-col items-center">
      <Image
        src={avatarUrl}
        alt="User Avatar"
        className="w-10 h-10 rounded-full border shadow-lg"
        width={35}
        height={35}
      />
    </div>
  );
};

export default Avatar;
