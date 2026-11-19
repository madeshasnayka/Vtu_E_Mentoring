const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = createCrcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generateVtuPng(width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const scale = width / 1024;

  const outerR = 230 * scale;
  const outerThickness = 8 * scale;
  const innerR = 165 * scale;

  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter type 0

    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Base Royal Blue (#183263)
      let r = 24, g = 50, b = 99;

      // Translucent inner circle (#2d4777)
      if (dist <= innerR) {
        r = 45; g = 71; b = 119;
      }
      // Subtle inner border
      if (Math.abs(dist - innerR) <= 2.5 * scale) {
        r = 88; g = 115; b = 165;
      }

      // Outer ring track
      if (Math.abs(dist - outerR) <= outerThickness) {
        const angle = Math.atan2(dy, dx);
        // Highlighted top cyan arc (-135 deg to -35 deg)
        if (angle >= -2.35 && angle <= -0.6) {
          r = 125; g = 211; b = 252; // #7dd3fc
        } else {
          r = 49; g = 75; b = 124;
        }
      }

      // White Graduation Cap in center
      const nx = dx / (scale * 9.5);
      const ny = dy / (scale * 9.5);

      // 1. Cap Diamond Top: |nx| + |ny + 2.2| * 2.1 <= 9.5
      const inDiamond = Math.abs(nx) + Math.abs(ny + 2.2) * 2.1 <= 9.5;
      // 2. Cap Skull Base below diamond
      const inSkull =
        Math.abs(nx) <= 5.2 &&
        ny >= 0.8 &&
        ny <= 5.2 - (nx * nx) * 0.06 &&
        Math.abs(nx) + Math.abs(ny + 2.2) * 2.1 >= 10.6;
      // 3. Right Tassel Stem
      const inTassel = nx >= 7.2 && nx <= 8.6 && ny >= -1.2 && ny <= 4.6;

      if (inDiamond || inSkull || inTassel) {
        r = 255; g = 255; b = 255;
      }

      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const pngBuffer = generateVtuPng(1024, 1024);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), pngBuffer);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), pngBuffer);

console.log('✅ Generated Royal Blue VTU icon.png, adaptive-icon.png, and splash.png in mobile/assets/!');