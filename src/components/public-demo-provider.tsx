"use client";

import { createContext, useContext } from "react";

const PublicDemoContext = createContext<boolean | null>(null);

export function PublicDemoProvider({
  publicDemo,
  children,
}: {
  publicDemo: boolean;
  children: React.ReactNode;
}) {
  return <PublicDemoContext.Provider value={publicDemo}>{children}</PublicDemoContext.Provider>;
}

export function usePublicDemo() {
  const publicDemo = useContext(PublicDemoContext);
  if (publicDemo === null) {
    throw new Error("usePublicDemo must be used inside PublicDemoProvider");
  }
  return publicDemo;
}
