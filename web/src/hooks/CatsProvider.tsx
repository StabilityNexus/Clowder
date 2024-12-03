"use client";

import { CatsProps } from "@/types/cats";
import React, { createContext, useContext, useState } from "react";

interface CatsContextProps {
  cat: CatsProps;
  isOwner?: boolean;
}

const CatsContext = createContext<CatsContextProps>({
  cat: {
    name: "", address: "",
    tokenName: "",
    tokenSymbol: ""
  },
  isOwner: false,
});

export function CatsProvider({ children }: React.PropsWithChildren<unknown>) {
  const [isOwner] = useState(false);

  return (
    <CatsContext.Provider
      value={{
        cat: {
          name: "CAT", address: "0x1234", // Static address or could be dynamic
          tokenName: "",
          tokenSymbol: ""
        },
        isOwner: isOwner,
      }}
    >
      {children}
    </CatsContext.Provider>
  );
}

export function useCAT() {
  const context = useContext(CatsContext);

  if (!context) {
    throw new Error("useCAT must be used within a CatsProvider");
  }

  return context;
}
