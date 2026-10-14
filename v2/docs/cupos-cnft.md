# Cupos digitales (cNFT comprimido en Solana) — v2

Cada inscripción genera **un cupo digital único** (cNFT comprimido / Bubblegum en
Solana) asociado a la cuenta del atleta, con la info de la carrera y del dueño
dentro. Responde a la demo de cupos de `demos-rsanjur` (`/cupos`): *"el cupo es
tuyo, es único y no se puede duplicar"* — la captura de pantalla es una imagen,
el cupo vive en la cadena.

## Estado actual (honesto)

| Pieza | Estado |
| --- | --- |
| Tablas D1 (`athlete_wallets`, `cnft_tickets`) | ✅ listas (migración `0007_cnft_cupos`) |
| Wallet gestionada por atleta (keypair ed25519 + cifrado AES-GCM) | ✅ reales, direcciones Solana válidas |
| Metadata Metaplex (nombre/símbolo/fecha/distancia/categoría/dorsal/atleta + crédito rsanjur) | ✅ real, servida en `/api/cupos/meta/<id>` |
| Página pública `/mi-cupo/<regId>` (QR + estado + wallet) | ✅ |
| Verificador público `/verificar` (id, dirección, firma o código) | ✅ |
| Panel admin de cupos + reintento idempotente | ✅ |
| Mint real en la cadena (Bubblegum) | ✅ **devnet** — cupo real emitido (2026-10-13), tx + asset id verificados; árbol `3JqcFjR6GqgsZMMLTB6zQj3YH8XWm8J7xWggUBTdPxDC` |

Sin tesorería el sistema está en **modo mock**: genera cupos con la forma exacta
de un asset id (base58 de 32 bytes) y lo marca como *simulado* en la UI. Nada se
rompe: la inscripción nunca depende de la cadena.

## Cómo funciona

```
inscripción creada/confirmada (api/inscripciones · confirm · webhook Yappy · admin)
        │  best-effort, corta a los 8 s, jamás lanza
        ▼
lib/cnft/issue.ts  issueTicketForRegistration()
  1. flag apagado → no toca la base (status "skipped")
  2. fila cnft_tickets (pending)  ← índice único: 1 cupo por inscripción (idempotente)
  3. wallet gestionada del atleta (lib/cnft/wallets.ts)
  4. metadata Metaplex (lib/cnft/metadata.ts)
  5. proveedor (lib/cnft/provider.ts): mock | bubblegum
  6. fila → minted (asset id, owner, firma) o error (lastError, attempts+1)
```

## Configuración (todo por entorno)

| Variable | Para qué | Default |
| --- | --- | --- |
| `CNFT_RED` | `devnet` | `mainnet`. **Vacío = apagado** | vacío (apagado) |
| `CNFT_MAINNET_OK` | `1` desbloquea mainnet | vacío (bloqueado) |
| `CNFT_WALLET_KEY` | **secreto**: 32 bytes hex/base64 que cifran la llave del atleta | — |
| `CNFT_TREASURY_SECRET` | **secreto**: wallet tesorería con SOL (base58 o JSON de `solana-keygen`) | — |
| `CNFT_TREE_ADDRESS` | merkle tree de Bubblegum (público) | — |
| `CNFT_PROVIDER` | `bubblegum` | `bubblegum` |
| `SITE_URL` | dominio canónico para metadata/QR | `https://carreras.strydpanama.com` |

Secretos en producción: `wrangler secret put CNFT_WALLET_KEY` y
`wrangler secret put CNFT_TREASURY_SECRET`. **Nunca** al repo.

> **Ojo, en dev local (`bun run dev` / vite):** las vars del worker salen de los
> `bindings` de `cloudflare.config.ts`; un `.dev.vars` **no** llega al `env` del
> worker (verificado: `Object.keys(env)` = solo lo declarado en el config).
> Para probar la emisión local, agregá ahí un texto temporal
> `CNFT_RED: bindings.text("devnet")` + `CNFT_WALLET_KEY: bindings.text("<32 bytes hex>")`
> y **revertilo antes de commitear** (son valores de prueba, no secretos reales).

Generar la clave de cifrado:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Reglas del flag (`lib/cnft/config.ts`):
- Sin `CNFT_RED` → **off**: cero escrituras en las tablas de cupos.
- `devnet` → emite en devnet (mock si falta tesorería/tree).
- `mainnet` sin `CNFT_MAINNET_OK=1` → **off** (mainnet apagado por defecto).

## Wallet del atleta

- **Gestionada (default)**: el servidor genera una keypair ed25519 por cuenta
  (o por inscripción si no hay cuenta), guarda la **pública** en `athlete_wallets`
  y el **secreto cifrado** con AES-GCM usando `CNFT_WALLET_KEY`. El atleta nunca
  ve cripto: recibe una dirección en `/mi-cupo/<id>`.
- **Futuro "conectar mi Phantom"**: `registerExternalWallet()` ya existe — guarda
  la dirección del usuario con `managed = false` y **sin secreto**. Solo falta la
  UI de conexión.
- La llave secreta **no se expone por ninguna API** (`exportWalletSecret` solo lo
  usará el camino de mint real, del lado del servidor).

## Non-transferable (soulbound)

Es un cupo **personal**; el default es no transferible:
- `metadata.properties.non_transferable = true` y atributo `Transferible = "No (personal)"`.
- El mint de Bubblegum se invoca sin delegado de transferencia.
- ⚠️ **Estado real**: Bubblegum (Metaplex) no soporta cNFT soulbound de forma nativa;
  un cNFT comprimido *puede* transferirse con la firma del dueño. Cumplimos marcando
  el cupo como no transferible en metadata + validación en la puerta (`/verificar`
  muestra al dueño). Para bloqueo a nivel de token haría falta un programa propio
  (Token Extensions / `non_transferable` del Token-2022), fuera del alcance de
  Bubblegum. Queda documentado, no inventado.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/mi-cupo/<regId>` | Cupo del atleta: QR, datos, estado, wallet, cNFT, transacción |
| `/verificar` | Verificador: formulario |
| `/verificar/<q>` | Resultado (acepta id, asset id, firma, dirección o código) |
| `/api/cupos/<regId>` | JSON público del cupo |
| `/api/cupos/verify?q=` | Verificador (JSON) |
| `/api/cupos/meta/<regId>` | Metadata Metaplex (URI del cNFT, CORS abierto) |
| `/api/admin/cupos?race=<id>` | Lista de cupos de la carrera (admin) |
| `POST /api/admin/cupos` `{ticketId}` | Reintento idempotente de emisión |

## Qué falta para emitir de verdad

### Devnet ✅ (2026-10-13)
Emitido un cupo REAL en devnet (tx firmada por la tesorería, asset id de Bubblegum
y `onChain: true` en `/mi-cupo/<regId>` y en el verificador):
1. Tesorería con SOL de devnet ✅ (cuenta chica que firma; ver `keys/solana/README.md`).
2. Merkle tree creado por la tesorería ✅ →
   `CNFT_TREE_ADDRESS=3JqcFjR6GqgsZMMLTB6zQj3YH8XWm8J7xWggUBTdPxDC`
   (maxDepth 14 / buffer 64 / canopy 10 ≈ 0.495 SOL). Script: `bun v2/scripts/create-cnft-tree.ts`.
3. `CNFT_TREASURY_SECRET` (JSON de `solana-keygen`) ✅ — solo como secreto del worker.
4. `CNFT_WALLET_KEY` (32 bytes hex) ✅
5. `CNFT_RED=devnet` + deps del provider real (`mpl-bubblegum`, `umi`, `umi-bundle-defaults`) ✅
6. Metadata servida por nosotros en `/api/cupos/meta/<id>` (no hace falta Arweave) ✅

Tres cosas que hubo que arreglar en `lib/cnft/provider.ts` para que el mint real funcione:
- **Signer**: un `Keypair` de umi NO es un `Signer`; hay que envolverlo con
  `createSignerFromKeypair` + `signerIdentity` (si no: `signer.signTransaction is not a function`).
- **Nombre on-chain ≤ 32 BYTES** (no caracteres): `·`/acentos cuentan >1 → truncar por bytes.
- **Confirmación**: `sendAndConfirm` (web3.js) tira `"Signature ... has expired: block height
  exceeded"` con Helius aunque la tx SÍ entre. Se confirma por HTTP con `getSignatureStatuses`,
  y el **asset id real** se lee de los logs del programa (`Leaf asset ID: ...`), no es la firma.

### Mainnet (lo que falta)
1. **Decidir la tesorería**: la cuenta chica de devnet NO se reusa. O se crea una nueva
   con SOL real, o se usa la del dueño. Documentarlo en `keys/solana/README.md`.
2. **Crear un merkle tree NUEVO en mainnet** (mismo script, con RPC de mainnet):
   ~0.5 SOL según profundidad (depth 14/buffer 64/canopy 10).
3. **Fondear la tesorería**: ~1 SOL alcanza para miles de cupos (mint ≈ 0.000005 SOL + fee).
4. `wrangler secret put CNFT_TREASURY_SECRET` (cuenta nueva) y `CNFT_TREE_ADDRESS` = árbol de mainnet.
5. `CNFT_RED=mainnet` + `CNFT_MAINNET_OK=1` (sin el flag queda apagado).
6. RPC dedicado: `CNFT_RPC_URL` con la key de Helius (la misma key sirve para mainnet) o QuickNode.

## Costos y límites

- Bubblegum: el costo por cNFT es ~0.000005 SOL (más el fee de la transacción); el
  gasto real está en crear el merkle tree (algunos SOL según profundidad).
- Los cupos mock **no cuestan nada** y no tocan la red.

hecho por rsanjur.com
