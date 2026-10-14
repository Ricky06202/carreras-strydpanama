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
| Mint real en la cadena (Bubblegum) | ⛔ **simulado** — falta tesorería con SOL y merkle tree |

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

### Devnet
1. `solana-keygen new -o treasury.json` y pedir SOL al faucet: `solana airdrop 2 --url devnet`.
2. Crear el merkle tree (Metaplex Bubblegum), p. ej. con `umi`/`mpl-bubblegum`:
   `createTree({ merkleTree: ..., maxDepth: 14, maxBufferSize: 64, canopyDepth: 10, ... })`
   → guardar la dirección en `CNFT_TREE_ADDRESS`.
3. `wrangler secret put CNFT_TREASURY_SECRET` (JSON o base58 de `treasury.json`).
4. `wrangler secret put CNFT_WALLET_KEY` (32 bytes hex).
5. `CNFT_RED=devnet` + instalar deps del provider real:
   ```bash
   bun add @metaplex-foundation/mpl-bubblegum @metaplex-foundation/umi-bundle-defaults
   ```
   El provider (`lib/cnft/provider.ts`) las importa de forma dinámica; si faltan,
   el cupo queda en `error` con mensaje claro (no rompe el build).
6. Subir metadata: ya la servimos nosotros en `/api/cupos/meta/<id>` (no hace falta Arweave).

### Mainnet
Todo lo anterior + `CNFT_MAINNET_OK=1` + tesorería con SOL real (fondear el tree y
los mints; un cNFT cuesta fracciones de centavo, pero el tree sí requiere SOL).
Sin `CNFT_MAINNET_OK=1` el sistema se queda apagado aunque `CNFT_RED=mainnet`.

## Costos y límites

- Bubblegum: el costo por cNFT es ~0.000005 SOL (más el fee de la transacción); el
  gasto real está en crear el merkle tree (algunos SOL según profundidad).
- Los cupos mock **no cuestan nada** y no tocan la red.

hecho por rsanjur.com
