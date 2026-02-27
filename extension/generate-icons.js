// This script generates PNG icons from the SVG source
// Run: node generate-icons.js
// Requires: npm install sharp (optional)

const fs = require('fs');
const path = require('path');

// For environments without sharp, create simple solid-color PNGs
// These are minimal valid PNG files

function createMinimalPng(size) {
  // Create a minimal valid 1-bit PNG with RGBA
  // This is a placeholder - replace with actual icons for production
  
  const width = size;
  const height = size;
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // IDAT chunk - create blue colored image
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Gradient from blue to indigo
      const r = Math.round(59 + (99 - 59) * x / width);
      const g = Math.round(130 + (102 - 130) * x / width);
      const b = Math.round(246 + (241 - 246) * x / width);
      rawData.push(r, g, b);
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const sizes = [16, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

sizes.forEach(size => {
  const png = createMinimalPng(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`Generated ${filePath} (${png.length} bytes)`);
});

console.log('Done! Icons generated.');
console.log('Note: These are placeholder gradient icons. Replace with real icons for production.');
