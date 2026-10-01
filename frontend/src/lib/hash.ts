import { keccak256, toBytes } from "viem";

/** The contract stores proof as a bytes32 keccak256 hash — hash text or a file's bytes the same way client-side. */
export async function hashText(text: string): Promise<`0x${string}`> {
  return keccak256(toBytes(text));
}

export async function hashFile(file: File): Promise<`0x${string}`> {
  const buffer = await file.arrayBuffer();
  return keccak256(new Uint8Array(buffer));
}
