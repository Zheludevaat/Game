// Generates minimal PNG icons procedurally without external deps.
// Uses a hand-rolled PNG encoder for tiny 192/512 icons.
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c >>> 0;
    }
    crc32.table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  const width = size, height = size;
  // Create RGBA pixels: dark abyss with gold lamp glyph in centre
  const px = Buffer.alloc(width * height * 4);
  const cx = width / 2, cy = height / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy) / (width / 2);
      // dark indigo->black radial
      let r = Math.max(0, 18 - Math.floor(d * 16));
      let g = Math.max(0, 8 - Math.floor(d * 6));
      let b = Math.max(0, 38 - Math.floor(d * 30));
      // gold ring at 0.45
      const ring = Math.abs(d - 0.45);
      if (ring < 0.03) {
        r = 200; g = 160; b = 60;
      }
      // central lamp diamond
      const ax = Math.abs(dx) / (width / 6);
      const ay = Math.abs(dy) / (width / 6);
      if (ax + ay < 1) {
        // flame
        const t = Math.max(0, 1 - (ax + ay));
        r = Math.min(255, 220 + Math.floor(t * 35));
        g = Math.min(255, 180 + Math.floor(t * 40));
        b = Math.min(255, 80 + Math.floor(t * 80));
      }
      const i = (y * width + x) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  // PNG raw: filter byte per row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    px.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  const idat = deflateSync(raw);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', makePng(192));
writeFileSync('public/icon-512.png', makePng(512));
writeFileSync('public/icon-180.png', makePng(180));
console.log('icons generated');
