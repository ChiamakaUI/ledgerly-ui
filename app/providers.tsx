"use client";

import * as React from "react";
import { VidbloqProvider } from "@vidbloq/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { ToastProvider } from "@/components/ui/toast";


/**
 * Root providers for the app.
 *
 * Privy 3.x expects `solana.rpcs` keyed by cluster URI, using RPC clients
 * built with @solana/kit. This is required for Privy's signAndSendTransaction
 * to broadcast embedded-wallet transactions.
 *
 * Our app uses devnet only, but including mainnet here is harmless — it just
 * means the config is complete.
 */

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://devnet.helius-rpc.com/?api-key=10b8f1fb-6b38-43cb-a769-e6965206020e";
const SOLANA_WS_URL = SOLANA_RPC_URL.replace(/^http/, "ws");

const VIDBLOQ_API_KEY = process.env.NEXT_PUBLIC_VIDBLOQ_API_KEY ?? "sk_c061e1d6fa8b1438226b1cc8b8764136";
const VIDBLOQ_API_SECRET = process.env.NEXT_PUBLIC_VIDBLOQ_API_SECRET ?? "ZHJEEBSlufheOxXnrMdrBp5QepVf+UAVOaLAUKHa+14=";

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    if (typeof window !== "undefined") {
      console.error(
        "[Providers] NEXT_PUBLIC_PRIVY_APP_ID is not set. " +
          "Add it to .env.local and restart the dev server.",
      );
    }
    return <>{children}</>;
  }

  return (
     <ToastProvider>
    <VidbloqProvider apiKey={VIDBLOQ_API_KEY} apiSecret={VIDBLOQ_API_SECRET}>
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#8b6dff",
          logo: undefined,
          walletChainType: "solana-only",
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc(SOLANA_RPC_URL),
              rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_WS_URL),
            },
            "solana:mainnet": {
              rpc: createSolanaRpc("https://api.mainnet-beta.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                "wss://api.mainnet-beta.solana.com",
              ),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
    </VidbloqProvider>
    </ToastProvider>
  );
}
