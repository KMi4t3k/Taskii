import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanlines (filter type 0 per line)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Draw a sleek rounded rect blue app background + white calendar frame
      const cx = width / 2;
      const cy = height / 2;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const radius = width * 0.44;

      if (dx < radius && dy < radius) {
        // Gradient blue
        const factor = y / height;
        rawData[pixelOffset] = Math.floor(37 * (1 - factor) + 29 * factor);
        rawData[pixelOffset + 1] = Math.floor(99 * (1 - factor) + 78 * factor);
        rawData[pixelOffset + 2] = Math.floor(235 * (1 - factor) + 216 * factor);
        rawData[pixelOffset + 3] = 255;

        // Draw an inner calendar block
        const inCalendar = x >= width * 0.2 && x <= width * 0.8 && y >= height * 0.22 && y <= height * 0.78;
        if (inCalendar) {
          if (y <= height * 0.34) {
            // Header bar of calendar (deep blue)
            rawData[pixelOffset] = 30;
            rawData[pixelOffset + 1] = 64;
            rawData[pixelOffset + 2] = 175;
          } else {
            // Calendar white body
            rawData[pixelOffset] = 250;
            rawData[pixelOffset + 1] = 252;
            rawData[pixelOffset + 2] = 255;
            
            // Draw colorful time block 1
            if (x >= width * 0.28 && x <= width * 0.72 && y >= height * 0.42 && y <= height * 0.52) {
              rawData[pixelOffset] = 59;
              rawData[pixelOffset + 1] = 130;
              rawData[pixelOffset + 2] = 246;
            }
            // Draw colorful time block 2
            if (x >= width * 0.28 && x <= width * 0.60 && y >= height * 0.56 && y <= height * 0.66) {
              rawData[pixelOffset] = 16;
              rawData[pixelOffset + 1] = 185;
              rawData[pixelOffset + 2] = 129;
            }
          }
        }
      } else {
        // Transparent or soft edge
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, body, crcBuf]);
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (c ^ buf[n]) >>> 0;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const p192 = createPNG(192, 192, 37, 99, 235);
const p512 = createPNG(512, 512, 37, 99, 235);
fs.writeFileSync('public/pwa-192x192.png', p192);
fs.writeFileSync('public/pwa-512x512.png', p512);
fs.writeFileSync('public/pwa-maskable-512x512.png', p512);
fs.writeFileSync('public/apple-touch-icon.png', createPNG(180, 180, 37, 99, 235));
console.log('PWA PNG Icons successfully generated!');
