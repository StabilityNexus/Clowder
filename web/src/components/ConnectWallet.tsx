import React from "react";
import { Button } from "./ui/button";
import { useWallet } from "@/hooks/WalletConnectProvider";

const ConnectWallet = () => {
  const { connect, disconnect, address } = useWallet();


  return (
    <div>
      {address ? (
        <div>
          <Button
            onClick={disconnect}
            className="custom-button"
          >
            {address.slice(0, 6)}...{address.slice(-4)}
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
