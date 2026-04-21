import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import type { SerializedInstruction } from "@/types";

const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

let cachedConnection: Connection | null = null;

export function getConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return cachedConnection;
}

export function deserializeInstruction(
  serialized: SerializedInstruction,
): TransactionInstruction {
  return new TransactionInstruction({
    keys: serialized.keys.map((k) => ({
      pubkey: new PublicKey(k.pubkey),
      isSigner: k.isSigner,
      isWritable: k.isWritable,
    })),
    programId: new PublicKey(serialized.programId),
    data: Buffer.from(serialized.data, "base64"),
  });
}

/**
 * Build an unsigned VersionedTransaction with the caller as fee payer.
 */
export async function buildDepositTransaction(
  serialized: SerializedInstruction,
  callerWalletAddress: string,
): Promise<VersionedTransaction> {
  const connection = getConnection();
  // Use "finalized" commitment — it returns a slightly older blockhash, but
  // one that's guaranteed to have propagated to every RPC including Privy's.
  // A fresh "processed" blockhash can fail on Privy's RPC if it hasn't
  // synced the latest slot yet.
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const feePayer = new PublicKey(callerWalletAddress);

  const instruction = deserializeInstruction(serialized);
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}

// lastIndexOf()

// function isValid(s: string): boolean {
//   const arr = [];
//   const openBrackets = ["(", "{", "["];
//   const closedBrackets = [")", "}", "]"];

//   for (const key of s) {
//     if (openBrackets.includes(key)) {
//       arr.push(key);
//     } else if (closedBrackets.includes(key)) {
//     }
//   }

//   return arr.length === 0;
// }

// function maxSubArray(nums: number[]): number {

//   let maxValue = 0;
//     for(let i = 0; i < nums.length; i++){
//       if(nums.length <= 5){
//       maxValue = sumSubArray(nums)
//       } else {

//       }
//     }

// return maxValue
// };

// function maxSubArray(nums: number[]): number {
//   let maxValue = 0;
//   const chunks = [];
//   let currentChunk = [];
//   if (nums.length <= 5) {
//     maxValue = sumSubArray(nums);
//     return maxValue;
//   }

//   for (let i = 0; i < nums.length; i++) {
//     let last = 5;
//     let newArr = nums.slice(0, last);
//     currentChunk.push(newArr);
//   }

//   return maxValue;
// }

