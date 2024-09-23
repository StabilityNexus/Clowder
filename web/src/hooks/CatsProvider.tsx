"use client";

import { CatsProps } from "@/types/cats";
import React, { createContext, useContext, useEffect, useState } from "react";

interface CatsContextProps {
  cat: CatsProps;
  isOwner?: boolean;
}

const CatsContext = createContext<CatsContextProps>({
  cat: { name: "", address: "" },
  isOwner: false,
});

export function CatsProvider({ children }: React.PropsWithChildren<{}>) {
  const [isOwner, setIsOwner] = useState(false);
  return (
    <CatsContext.Provider
      value={{
        cat: { name: "CAT", address: "0x1234" },
        isOwner: isOwner,
      }}
    >
      {children}
    </CatsContext.Provider>
  );
}

export function useCAT({ address }: { address: string }) {
  try {
    return useContext(CatsContext);
  } catch (e) {
    throw new Error("useCAT must be used within a CATsProvider");
  }
}
