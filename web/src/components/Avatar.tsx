"use client";

import React, { useEffect, useState } from "react";
import { useWallet } from "@/hooks/WalletConnectProvider"; // Example hook for wallet context

// Generate an avatar URL using DiceBear API based on the user's wallet address
function generateAvatar(walletAddress: string): string {
  const baseUrl = "https://api.dicebear.com/6.x/identicon/svg";
  return `${baseUrl}?seed=${encodeURIComponent(walletAddress)}`;
}

const Avatar = () => {
  const { address } = useWallet(); // Replace with your wallet context or connection logic

  if (!address) {
    return <p>Please connect your wallet to see your avatar.</p>;
  }

  // Generate the avatar URL
  const avatarUrl = generateAvatar(address);

  return (
    <div className="flex flex-col items-center">
      <img
        src={avatarUrl}
        alt="User Avatar"
        className="w-11 h-11 rounded-full border shadow-lg"
        width={40}
        height={40}
      />
    </div>
  );
};

export default Avatar;
