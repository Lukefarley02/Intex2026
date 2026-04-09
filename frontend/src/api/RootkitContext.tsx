import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface RootkitState {
  active: boolean;
  toggle: () => void;
}

const RootkitContext = createContext<RootkitState>({ active: false, toggle: () => {} });

export const useRootkit = () => useContext(RootkitContext);

export const RootkitProvider = ({ children }: { children: ReactNode }) => {
  const [active, setActive] = useState(false);
  const toggle = () => setActive((prev) => !prev);
  return (
    <RootkitContext.Provider value={{ active, toggle }}>
      {children}
    </RootkitContext.Provider>
  );
};
