import escrowAbi from "./ProofPayEscrow.abi.json";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "") as `0x${string}`;
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const escrowContract = {
  address: CONTRACT_ADDRESS,
  abi: escrowAbi,
  // Forces wagmi to switch (or refuse) rather than silently signing on
  // whatever network the wallet happens to be on — see MetaMask "wrong
  // network" incident where a write was almost sent on mainnet instead
  // of the local chain.
  chainId,
} as const;
