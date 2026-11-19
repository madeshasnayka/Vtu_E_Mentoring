const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Precompute CRC32 table for valid PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createVtuLogoPng(width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 1024;

  const outerRadius = 290 * scale;
  const outerRingWidth = 13 * scale;
  const innerRadius = 215 * scale;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0; // PNG filter type 0

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 1. Royal Blue #183263 background
      let r = 24, g = 50, b = 99;

      // 2. Inner translucent circle (#2d4777)
      if (dist <= innerRadius) {
        r = 45; g = 71; b = 119;
      }
      if (Math.abs(dist - innerRadius) <= 3.5 * scale) {
        r = 92; g = 122; b = 175;
      }

      // 3. Outer ring with cyan progress arc (#67c6fa)
      if (Math.abs(dist - outerRadius) <= outerRingWidth) {
        const angle = Math.atan2(dy, dx);
        if (angle >= -2.4 && angle <= -0.65) {
          r = 103; g = 198; b = 250;
        } else {
          r = 46; g = 74; b = 125;
        }
      }

      // 4. Crisp White Graduation Cap in center
      const nx = dx / (11.5 * scale);
      const ny = dy / (11.5 * scale);
      const inDiamond = Math.abs(nx) + Math.abs(ny + 2.2) * 2.05 <= 9.6;
      const inCapBase =
        Math.abs(nx) <= 5.2 &&
        ny >= 0.8 &&
        ny <= 5.3 - nx * nx * 0.06 &&
        Math.abs(nx) + Math.abs(ny + 2.2) * 2.05 >= 10.6;
      const inTassel = nx >= 7.2 && nx <= 8.6 && ny >= -1.2 && ny <= 4.8;

      if (inDiamond || inCapBase || inTassel) {
        r = 255; g = 255; b = 255;
      }

      const px = rowOffset + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

const pngBuffer = createVtuLogoPng(1024, 1024);

// Write both new cache-busting filenames and standard filenames
const targets = [
  'vtu-icon.png',
  'vtu-splash.png',
  'icon.png',
  'adaptive-icon.png',
  'splash.png',
  'splash-icon.png',
];

targets.forEach((file) => {
  const fullPath = path.join(assetsDir, file);
  fs.writeFileSync(fullPath, pngBuffer);
  console.log('Created:', fullPath);
});