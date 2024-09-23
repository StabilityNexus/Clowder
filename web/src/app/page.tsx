"use client";

import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/WalletConnectProvider";
import ConnectWallet from "@/components/ConnectWallet";
import { ModeToggle } from "@/components/darkModeToggle";

export default function Home() {
  const [catAddress, setCatAddress] = useState("");
  const router = useRouter();
  const { address } = useWallet();

  const handleUseCAT = () => {
    if (catAddress) {
      router.push(`/cat/${catAddress}`);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-full py-32">
        <h1 className="text-4xl font-bold mb-8">Welcome to Clowder</h1>
        {!address ? (
          <ConnectWallet />
        ) : (
          <>
            <Button onClick={() => router.push("/create")} className="mb-4">
              Create CAT
            </Button>
            <div className="flex space-x-2">
              <Input
                className=""
                placeholder="Enter CAT address"
                value={catAddress}
                onChange={(e) => setCatAddress(e.target.value)}
              />
              <Button onClick={handleUseCAT}>Use CAT</Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
