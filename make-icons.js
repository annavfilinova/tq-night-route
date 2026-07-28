// Генерирует иконки приложения без внешних зависимостей: рисуем пиксели, жмём в PNG через zlib
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Тёмный фон, розовое кольцо и золотая точка в центре — под палитру квеста
function draw(x, y, size) {
  const cx = size / 2, cy = size / 2;
  const d = Math.hypot(x - cx, y - cy);
  const rOuter = size * 0.34, rInner = size * 0.24, rDot = size * 0.1;

  if (d <= rDot) return [240, 192, 80, 255];
  if (d >= rInner && d <= rOuter) {
    const t = (d - rInner) / (rOuter - rInner);
    return [255, Math.round(92 + 40 * t), Math.round(138 - 20 * t), 255];
  }
  return [19, 17, 28, 255];
}

for (const size of [180, 512]) {
  const file = path.join(__dirname, `icon-${size}.png`);
  fs.writeFileSync(file, png(size, draw));
  console.log('wrote', path.basename(file));
}
