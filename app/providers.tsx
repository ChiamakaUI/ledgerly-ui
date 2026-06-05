"use client";

import { type ReactNode } from "react";
import { VidbloqProvider } from "@vidbloq/react";
import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { ToastProvider } from "@/components";


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

const VIDBLOQ_API_KEY = process.env.NEXT_PUBLIC_VIDBLOQ_API_KEY ?? "";
const VIDBLOQ_API_SECRET = process.env.NEXT_PUBLIC_VIDBLOQ_API_SECRET ?? "";

const SOLANA_DEVNET_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "";

const SOLANA_MAINNET_RPC =
  process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ?? "";

const SOLANA_DEVNET_WS_URL = SOLANA_DEVNET_RPC.replace(/^http/, "ws");
const SOLANA_MAINNET_WS_URL = SOLANA_MAINNET_RPC.replace(/^http/, "ws");

export function Providers({ children }: { children: ReactNode }) {
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
              rpc: createSolanaRpc(SOLANA_DEVNET_RPC),
              rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_DEVNET_WS_URL),
            },
            "solana:mainnet": {
              rpc: createSolanaRpc(SOLANA_MAINNET_RPC),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                SOLANA_MAINNET_WS_URL
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
