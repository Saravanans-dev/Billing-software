import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SIZE = 256;
const ICO_SIZES = [256, 48, 32, 16];
const SIZE_MM = 64;

function crc32(buf) {
  let c = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = (v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1);
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crcV = Buffer.alloc(4);
  crcV.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crcV]);
}

function pixel(x, y) {
  const cx = SIZE / 2, cy = SIZE / 2;
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = SIZE * 0.44;

  if (dist > maxR) return [0, 0, 0, 0];

  const innerR = maxR * 0.65;
  const edgeDist = maxR - dist;
  const alpha = edgeDist < 2 ? Math.floor((edgeDist / 2) * 255) : 255;
  if (alpha <= 0) return [0, 0, 0, 0];

  const isInner = dist < innerR;
  const relX = dx / (isInner ? innerR : maxR);
  const relY = dy / (isInner ? innerR : maxR);

  const angle = Math.atan2(dy, dx);

  if (isInner) {
    const barW = 0.35;
    const barH = 0.55;
    if (Math.abs(relX) < barW && Math.abs(relY) < barH) return [30, 64, 175, alpha];
    const gap = 0.08;
    const x2 = relX > gap ? (relX - gap) / (1 - gap) : (relX + gap) / (1 - gap);
    if (Math.abs(x2) < barW && Math.abs(relY) < barH) return [30, 64, 175, alpha];
    return [59, 89, 152, alpha];
  }

  return [41, 74, 148, alpha];
}

function generatePNG() {
  const rawRows = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [0];
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = pixel(x, y);
      row.push(r, g, b, a);
    }
    rawRows.push(Buffer.from(row));
  }
  const rawData = Buffer.concat(rawRows);

  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateICO() {
  const entries = [];
  const pngData = generatePNG();
  entries.push({ w: 256, h: 256, data: pngData });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = 6 + entries.length * 16;
  const dirEntries = [];
  for (const e of entries) {
    const w = e.w >= 256 ? 0 : e.w;
    const h = e.h >= 256 ? 0 : e.h;
    const dir = Buffer.alloc(16);
    dir.writeUInt8(w, 0);
    dir.writeUInt8(h, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(e.data.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += e.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...entries.map(e => e.data)]);
}

const png = generatePNG();
const ico = generateICO();
const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), png);
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
console.log('Generated public/icon.png and public/icon.ico');
