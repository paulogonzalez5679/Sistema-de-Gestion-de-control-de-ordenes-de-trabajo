"use client";

import { GlobalApiLoadingProvider } from "@/components/global-api-loading-provider";
import { ThemeSync } from "@/components/theme-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GlobalApiLoadingProvider>
      <ThemeSync />
      {children}
    </GlobalApiLoadingProvider>
  );
}
