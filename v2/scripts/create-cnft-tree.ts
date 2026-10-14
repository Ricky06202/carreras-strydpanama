/**
 * Crea el merkle tree de Bubblegum (cNFT comprimido) en la red del RPC indicado.
 *
 * Herramienta del OPERADOR (no corre en el worker): se ejecuta una sola vez por red.
 * La llave de tesoreria paga la cuenta del arbol; el arbol en si NO es secreto
 * (su direccion es publica y va en CNFT_TREE_ADDRESS).
 *
 * Uso (desde v2/):
 *   CNFT_RPC_URL="https://devnet.helius-rpc.com/?api-key=..." \
 *   CNFT_TREASURY_KEYPAIR="../keys/solana/devnet-treasury.json" \
 *   bun scripts/create-cnft-tree.ts
 *
 * Guarda la direccion impresa en CNFT_TREE_ADDRESS y en keys/solana/README.md.
 */
import { readFileSync } from "node:fs";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createTree, mplBubblegum } from "@metaplex-foundation/mpl-bubblegum";
import { generateSigner, keypairIdentity, publicKey } from "@metaplex-foundation/umi";

const rpcUrl = (process.env.CNFT_RPC_URL ?? process.env.SOLANA_RPC_URL ?? "").trim();
const keypairPath = (process.env.CNFT_TREASURY_KEYPAIR ?? "").trim();
const maxDepth = Number(process.env.CNFT_TREE_DEPTH ?? 14);
const maxBufferSize = Number(process.env.CNFT_TREE_BUFFER ?? 64);
const canopyDepth = Number(process.env.CNFT_TREE_CANOPY ?? 10);

if (!rpcUrl) throw new Error("falta CNFT_RPC_URL (RPC dedicado; el publico bloquea a Cloudflare)");
if (!keypairPath) throw new Error("falta CNFT_TREASURY_KEYPAIR (ruta al JSON de solana-keygen)");

const secret = Uint8Array.from(JSON.parse(readFileSync(keypairPath, "utf8")) as number[]);
const umi = createUmi(rpcUrl).use(mplBubblegum());
const treasury = umi.eddsa.createKeypairFromSecretKey(secret);
umi.use(keypairIdentity(treasury));

console.log("Tesoreria (paga el arbol):", treasury.publicKey.toString());
console.log(`Red del RPC: ${rpcUrl.includes("devnet") ? "devnet" : rpcUrl.includes("mainnet") ? "mainnet" : "?"}`);
console.log(`Parametros: maxDepth=${maxDepth} maxBufferSize=${maxBufferSize} canopyDepth=${canopyDepth}`);

const merkleTree = generateSigner(umi);
const builder = await createTree(umi, {
  merkleTree,
  maxDepth,
  maxBufferSize,
  canopyDepth,
});
const result = await builder.sendAndConfirm(umi);
const sig = Buffer.from(result.signature).toString("base64");

console.log("\n=== ARBOL CREADO ===");
console.log("Tree address:", merkleTree.publicKey.toString());
console.log("Tx (base64):", sig);
console.log("Ver: https://explorer.solana.com/address/" + merkleTree.publicKey.toString() + (rpcUrl.includes("devnet") ? "?cluster=devnet" : ""));
