/* ------------------------------------------------------------------
   QR en el servidor (workerd), sin dependencias.
   Port fiel de /public/qr-client.js (RSQR, el generador propio de rsanjur.com)
   para poder dibujar el QR dentro de la tarjeta OG SIN ejecutar nada en el
   cliente. Misma salida que el generador del sitio.
   Modo byte, versiones 1-40, niveles L/M/Q/H.
   ------------------------------------------------------------------ */

const CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991,
  1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532,
  3706,
];
const EC_BLOCKS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4,
  2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8,
  4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18,
  6, 10, 17, 16, 6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25,
  8, 17, 23, 25, 9, 17, 23, 34, 9, 18, 25, 30, 10, 20, 27, 32, 12, 21, 29, 35,
  12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42, 14, 28, 38, 45, 15, 29, 40, 48,
  16, 31, 43, 51, 17, 33, 45, 54, 18, 35, 48, 57, 19, 37, 51, 60, 19, 38, 53, 63,
  20, 40, 56, 66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];
const EC_CW = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64, 26, 48, 72, 88,
  36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156, 60, 110, 160, 192, 72, 130, 192, 224,
  80, 150, 224, 264, 96, 176, 260, 308, 104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432,
  144, 280, 408, 480, 168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700,
  224, 442, 644, 750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960, 312, 588, 870, 1050,
  336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260, 420, 784, 1140, 1350, 450, 812, 1200, 1440,
  480, 868, 1290, 1530, 510, 924, 1350, 1620, 540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590, 1890,
  600, 1120, 1680, 1980, 630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];
const ECL = { L: { idx: 0, bit: 1 }, M: { idx: 1, bit: 0 }, Q: { idx: 2, bit: 3 }, H: { idx: 3, bit: 2 } } as const;
type EclName = keyof typeof ECL;

/* ---------------- campo de Galois 2^8 ---------------- */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGen(n: number): number[] {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: number[], ecLen: number): number[] {
  const gen = rsGen(ecLen);
  const res = new Array<number>(ecLen).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.shift();
    res.push(0);
    if (factor !== 0) for (let j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
  }
  return res;
}

/* ---------------- utilidades ---------------- */
function bchDigit(v: number): number {
  let n = 0;
  while (v !== 0) {
    n++;
    v >>>= 1;
  }
  return n;
}

function formatBits(eclBit: number, mask: number): number {
  const G15 = 0x537;
  const data = (eclBit << 3) | mask;
  let d = data << 10;
  while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
  return ((data << 10) | d) ^ 0x5412;
}

function versionBits(version: number): number {
  const G18 = 0x1f25;
  let d = version << 12;
  while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
  return (version << 12) | d;
}

function utf8(str: string): number[] {
  return Array.from(new TextEncoder().encode(str));
}

function alignCoords(version: number): number[] {
  if (version === 1) return [];
  const posCount = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
  const positions = [size - 7];
  for (let i = 1; i < posCount - 1; i++) positions[i] = positions[i - 1] - intervals;
  positions.push(6);
  return positions.reverse();
}

function chooseVersion(byteLen: number, eclIdx: number): number {
  for (let v = 1; v <= 40; v++) {
    const ccBits = v <= 9 ? 8 : 16;
    const dataCap = CODEWORDS[v] - EC_CW[(v - 1) * 4 + eclIdx];
    if (4 + ccBits + byteLen * 8 <= dataCap * 8) return v;
  }
  throw new Error("QR: datos demasiado grandes");
}

/* ---------------- datos -> codewords ---------------- */
function buildCodewords(bytes: number[], version: number, eclIdx: number): number[] {
  const dataCap = CODEWORDS[version] - EC_CW[(version - 1) * 4 + eclIdx];
  const maxBits = dataCap * 8;
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let b = len - 1; b >= 0; b--) bits.push((val >>> b) & 1);
  };
  push(4, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) push(bytes[i], 8);
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const cw: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let k = 0; k < 8; k++) byte = (byte << 1) | bits[i + k];
    cw.push(byte);
  }
  const pads = [0xec, 0x11];
  let p = 0;
  while (cw.length < dataCap) cw.push(pads[p++ % 2]);
  return cw;
}

function interleave(dataCw: number[], version: number, eclIdx: number): number[] {
  const ecTotal = EC_CW[(version - 1) * 4 + eclIdx];
  const blocks = EC_BLOCKS[(version - 1) * 4 + eclIdx];
  const ecPer = ecTotal / blocks;
  const numShort = blocks - (dataCw.length % blocks);
  const shortLen = Math.floor(dataCw.length / blocks);
  const dataBlocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let pos = 0;
  for (let b = 0; b < blocks; b++) {
    const len = shortLen + (b < numShort ? 0 : 1);
    const d = dataCw.slice(pos, pos + len);
    pos += len;
    dataBlocks.push(d);
    ecBlocks.push(rsEncode(d, ecPer));
  }
  const out: number[] = [];
  for (let i = 0; i <= shortLen; i++) for (let b = 0; b < blocks; b++) if (i < dataBlocks[b].length) out.push(dataBlocks[b][i]);
  for (let i = 0; i < ecPer; i++) for (let b = 0; b < blocks; b++) out.push(ecBlocks[b][i]);
  return out;
}

/* ---------------- matriz ---------------- */
function maskFn(m: number, r: number, c: number): boolean {
  switch (m) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
  return false;
}

interface Base {
  size: number;
  mat: number[][];
  res: boolean[][];
}

function buildBase(version: number): Base {
  const size = version * 4 + 17;
  const mat: number[][] = [];
  const res: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    mat.push(new Array<number>(size).fill(0));
    res.push(new Array<boolean>(size).fill(false));
  }
  const set = (r: number, c: number, v: boolean) => {
    mat[r][c] = v ? 1 : 0;
    res[r][c] = true;
  };

  const corners = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = corners[i][0] + r;
        const cc = corners[i][1] + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inside && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(rr, cc, dark);
      }
    }
  }

  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }

  const coords = alignCoords(version);
  if (coords.length) {
    for (let i = 0; i < coords.length; i++) {
      for (let j = 0; j < coords.length; j++) {
        const ar = coords[i];
        const ac = coords[j];
        if ((ar === 6 && ac === 6) || (ar === 6 && ac === size - 7) || (ar === size - 7 && ac === 6)) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const edge = r === -2 || r === 2 || c === -2 || c === 2;
            set(ar + r, ac + c, edge || (r === 0 && c === 0));
          }
        }
      }
    }
  }

  set(size - 8, 8, true);

  for (let i = 0; i < 15; i++) {
    if (i < 6) set(i, 8, false);
    else if (i < 8) set(i + 1, 8, false);
    else set(size - 15 + i, 8, false);
    if (i < 8) set(8, size - i - 1, false);
    else if (i < 9) set(8, 15 - i, false);
    else set(8, 15 - i - 1, false);
  }

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const vr = Math.floor(i / 3);
      const vc = (i % 3) + size - 11;
      set(vr, vc, false);
      set(vc, vr, false);
    }
  }

  return { size, mat, res };
}

function placeData(base: Base, cw: number[]): Base {
  const { size, mat, res } = base;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (;;) {
      for (let c = 0; c < 2; c++) {
        const rr = row;
        const cc = col - c;
        if (!res[rr][cc]) {
          let dark = 0;
          if (byteIndex < cw.length) dark = (cw[byteIndex] >>> bitIndex) & 1;
          mat[rr][cc] = dark;
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || row >= size) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }
  return base;
}

function cloneMat(base: Base): number[][] {
  const mat: number[][] = [];
  for (let r = 0; r < base.size; r++) mat.push(base.mat[r].slice());
  return mat;
}

function applyMask(base: Base, mat: number[][], m: number): void {
  for (let r = 0; r < base.size; r++)
    for (let c = 0; c < base.size; c++) if (!base.res[r][c] && maskFn(m, r, c)) mat[r][c] ^= 1;
}

function writeFormat(base: Base, mat: number[][], eclBit: number, mask: number): void {
  const size = base.size;
  const bits = formatBits(eclBit, mask);
  for (let i = 0; i < 15; i++) {
    const mod = ((bits >> i) & 1) === 1 ? 1 : 0;
    if (i < 6) mat[i][8] = mod;
    else if (i < 8) mat[i + 1][8] = mod;
    else mat[size - 15 + i][8] = mod;
    if (i < 8) mat[8][size - i - 1] = mod;
    else if (i < 9) mat[8][15 - i] = mod;
    else mat[8][15 - i - 1] = mod;
  }
  mat[size - 8][8] = 1;
}

function writeVersion(base: Base, mat: number[][], version: number): void {
  if (version < 7) return;
  const size = base.size;
  const bits = versionBits(version);
  for (let i = 0; i < 18; i++) {
    const mod = ((bits >> i) & 1) === 1 ? 1 : 0;
    const r = Math.floor(i / 3);
    const c = (i % 3) + size - 11;
    mat[r][c] = mod;
    mat[c][r] = mod;
  }
}

function penalty(mat: number[][], size: number): number {
  let points = 0;

  for (let r = 0; r < size; r++) {
    let runR = 1;
    let runC = 1;
    for (let c = 1; c < size; c++) {
      runR = mat[r][c] === mat[r][c - 1] ? runR + 1 : 1;
      if (runR === 5) points += 3;
      else if (runR > 5) points += 1;
      runC = mat[c][r] === mat[c - 1][r] ? runC + 1 : 1;
      if (runC === 5) points += 3;
      else if (runC > 5) points += 1;
    }
  }

  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++) {
      const s = mat[r][c] + mat[r][c + 1] + mat[r + 1][c] + mat[r + 1][c + 1];
      if (s === 4 || s === 0) points += 3;
    }

  for (let r = 0; r < size; r++) {
    let bitsCol = 0;
    let bitsRow = 0;
    for (let c = 0; c < size; c++) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | mat[r][c];
      if (c >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) points += 40;
      bitsRow = ((bitsRow << 1) & 0x7ff) | mat[c][r];
      if (c >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) points += 40;
    }
  }

  let dark = 0;
  const total = size * size;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += mat[r][c];
  points += Math.abs(Math.ceil(((dark * 100) / total) / 5) - 10) * 10;

  return points;
}

/* ---------------- API ---------------- */
export interface QrMatrix {
  size: number;
  version: number;
  mask: number;
  modules: number[][];
}

export function qrMatrix(text: string, opts: { ecl?: EclName; version?: number; mask?: number } = {}): QrMatrix {
  const ecl = ECL[opts.ecl ?? "M"] ?? ECL.M;
  const bytes = utf8(String(text));
  const version = opts.version || chooseVersion(bytes.length, ecl.idx);
  if (version > 40) throw new Error("QR: version invalida");
  const dataCw = buildCodewords(bytes, version, ecl.idx);
  const cw = interleave(dataCw, version, ecl.idx);
  const base = buildBase(version);
  placeData(base, cw);
  writeVersion(base, base.mat, version);

  const forced = typeof opts.mask === "number" ? opts.mask : null;
  let bestMat: number[][] | null = null;
  let bestMask = 0;
  let bestScore = Infinity;
  const candidates = forced === null ? [0, 1, 2, 3, 4, 5, 6, 7] : [forced];
  for (const m of candidates) {
    const mat = cloneMat(base);
    applyMask(base, mat, m);
    writeFormat(base, mat, ecl.bit, m);
    const score = penalty(mat, base.size);
    if (score < bestScore) {
      bestScore = score;
      bestMat = mat;
      bestMask = m;
    }
  }
  return { size: base.size, version, mask: bestMask, modules: bestMat as number[][] };
}

/** SVG del QR (misma forma que window.RSQR.svg del cliente). */
export function qrSvg(
  text: string,
  opts: { size?: number; margin?: number; ecl?: EclName; dark?: string; light?: string } = {},
): string {
  const qr = qrMatrix(text, opts);
  const size = qr.size;
  const margin = opts.margin === undefined ? 4 : opts.margin;
  const px = opts.size || 240;
  const dim = size + margin * 2;
  const parts: string[] = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (qr.modules[r][c]) parts.push("M" + (c + margin) + " " + (r + margin) + "h1v1h-1z");
  const fg = opts.dark || "#0b1220";
  const bg = opts.light || "#ffffff";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    px +
    '" height="' +
    px +
    '" viewBox="0 0 ' +
    dim +
    " " +
    dim +
    '" shape-rendering="crispEdges" role="img" aria-label="Codigo QR">' +
    '<rect width="' +
    dim +
    '" height="' +
    dim +
    '" fill="' +
    bg +
    '"/>' +
    '<path d="' +
    parts.join("") +
    '" fill="' +
    fg +
    '"/></svg>'
  );
}
