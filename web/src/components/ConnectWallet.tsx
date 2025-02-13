import React from "react";
import { Button } from "./ui/button";
import { useWallet } from "@/hooks/WalletConnectProvider";

const ConnectWallet = () => {
  const { connect, disconnect, address } = useWallet();


  return (
    <div>
      {address ? (
        <div className="md:flex gap-x-4">
          <Button className="mb-2 md:mb-0">
            {address.slice(0, 6)}...{address.slice(-4)}
          </Button>
          <Button onClick={disconnect} className="mb-2 md:mb-0">
            Disconnect Wallet
          </Button>
      </div>
      ) : (
        <Button
          onClick={connect}
          className="custom-button font-medium"
        >
          Connect Wallet
        </Button>
      )}
    </div>
  );
};

export default ConnectWallet;
