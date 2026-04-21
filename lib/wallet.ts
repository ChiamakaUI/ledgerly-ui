"use client";

import { useCallback, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import bs58 from "bs58";
import { useWallets } from "@privy-io/react-auth/solana";
import type { SerializedInstruction } from "@/types";
import { buildDepositTransaction } from "./solana";

export interface WalletApi {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (
    instruction: SerializedInstruction,
  ) => Promise<string>;
}

export function useWallet(): WalletApi {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();


  // Grab the first Solana wallet. Since our login is email+Google only,
  // there shouldn't be external wallet noise — whatever is here is ours.
  const wallet = wallets[0];

  const address = wallet?.address ?? null;
  const connected = ready && authenticated && !!wallet;

  const connect = useCallback(async () => {
    // If user is already authenticated but the wallet hasn't appeared yet,
    // don't re-trigger login — just wait for the wallet to materialize.
    if (authenticated) {
      console.warn(
        "[useWallet] Already authenticated but no wallet yet. " +
          "The embedded wallet may still be generating — wait a few seconds.",
      );
      return;
    }
    await login();
  }, [authenticated, login]);

  const disconnect = useCallback(async () => {
    await logout();
  }, [logout]);

const signAndSendTransaction = useCallback(
  async (instruction: SerializedInstruction): Promise<string> => {
    if (!wallet) throw new Error("Wallet not connected");

    const transaction = await buildDepositTransaction(
      instruction,
      wallet.address,
    );
    const serializedTx = transaction.serialize();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWallet = wallet as any;
    const result = await anyWallet.signAndSendTransaction({
      transaction: serializedTx,
      chain: "solana:devnet",
    });

    // Privy returns the signature as raw bytes (Uint8Array / number[]).
    // Solana signatures must be base58-encoded strings for RPC verification.
    const rawSig = result?.signature ?? result?.hash ?? result;
    const signature = normalizeSignature(rawSig);

    if (!signature) {
      throw new Error("signAndSendTransaction returned no signature");
    }
    return signature;
  },
  [wallet],
);

  return useMemo(
    () => ({
      address,
      connected,
      connecting: !ready,
      connect,
      disconnect,
      signAndSendTransaction,
    }),
    [address, connected, ready, connect, disconnect, signAndSendTransaction],
  );
}

/**
 * Normalize Privy's signature return value to a base58-encoded string.
 *
 * Privy can return the signature in various shapes depending on version:
 *  - A base58 string already
 *  - A Uint8Array of raw bytes
 *  - A number[] of raw bytes
 *  - An object with `.signature` holding one of the above
 */
function normalizeSignature(raw: unknown): string | null {
  if (!raw) return null;

  // Already a string — assume it's base58.
  if (typeof raw === "string") return raw;

  // Uint8Array or number[] — encode to base58.
  if (raw instanceof Uint8Array) return bs58.encode(raw);
  if (Array.isArray(raw)) return bs58.encode(Uint8Array.from(raw));

  // Nested shape.
  if (typeof raw === "object" && "signature" in raw) {
    return normalizeSignature((raw as { signature: unknown }).signature);
  }

  return null;
}