/**
 * Generate test fixture images for svg-tracer tests.
 * Run via: npx tsx tests/fixtures/generate-test-images.ts
 */
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(__dirname, { recursive: true });

async function generateTestImages() {
  // 1. Simple black square on white background (PNG, no alpha - use raw pixels)
  const squarePixels = Buffer.alloc(100 * 100 * 3, 255); // all white
  for (let y = 25; y < 75; y++) {
    for (let x = 25; x < 75; x++) {
      const idx = (y * 100 + x) * 3;
      squarePixels[idx] = 0; // R
      squarePixels[idx + 1] = 0; // G
      squarePixels[idx + 2] = 0; // B
    }
  }
  await sharp(squarePixels, { raw: { width: 100, height: 100, channels: 3 } })
    .png()
    .toFile(join(__dirname, 'black-square.png'));

  // 2. Black circle on transparent background (PNG with alpha)
  const circleSize = 100;
  const circleRadius = 40;
  const circlePixels = Buffer.alloc(circleSize * circleSize * 4, 0);
  for (let y = 0; y < circleSize; y++) {
    for (let x = 0; x < circleSize; x++) {
      const dx = x - circleSize / 2;
      const dy = y - circleSize / 2;
      const idx = (y * circleSize + x) * 4;
      if (dx * dx + dy * dy <= circleRadius * circleRadius) {
        circlePixels[idx] = 0; // R
        circlePixels[idx + 1] = 0; // G
        circlePixels[idx + 2] = 0; // B
        circlePixels[idx + 3] = 255; // A (opaque)
      } else {
        circlePixels[idx] = 0;
        circlePixels[idx + 1] = 0;
        circlePixels[idx + 2] = 0;
        circlePixels[idx + 3] = 0; // A (transparent)
      }
    }
  }
  await sharp(circlePixels, { raw: { width: circleSize, height: circleSize, channels: 4 } })
    .png()
    .toFile(join(__dirname, 'circle-transparent.png'));

  // 3. JPEG version of the black square (reuse squarePixels)
  await sharp(Buffer.from(squarePixels), { raw: { width: 100, height: 100, channels: 3 } })
    .jpeg({ quality: 95 })
    .toFile(join(__dirname, 'black-square.jpg'));

  // 4. WebP version (reuse squarePixels)
  await sharp(Buffer.from(squarePixels), { raw: { width: 100, height: 100, channels: 3 } })
    .webp()
    .toFile(join(__dirname, 'black-square.webp'));

  // 5. Colored shape on transparent background (red star-like shape)
  const starSize = 80;
  const starPixels = Buffer.alloc(starSize * starSize * 4, 0);
  for (let y = 0; y < starSize; y++) {
    for (let x = 0; x < starSize; x++) {
      const cx = x - starSize / 2;
      const cy = y - starSize / 2;
      const angle = Math.atan2(cy, cx);
      const dist = Math.sqrt(cx * cx + cy * cy);
      const starRadius = 20 + 10 * Math.cos(5 * angle);
      const idx = (y * starSize + x) * 4;
      if (dist <= starRadius) {
        starPixels[idx] = 255; // R
        starPixels[idx + 1] = 50; // G
        starPixels[idx + 2] = 50; // B
        starPixels[idx + 3] = 255; // A
      }
    }
  }
  await sharp(starPixels, { raw: { width: starSize, height: starSize, channels: 4 } })
    .png()
    .toFile(join(__dirname, 'red-star-transparent.png'));

  // 6. Non-square aspect ratio image (200x100, raw pixels)
  const widePixels = Buffer.alloc(200 * 100 * 3, 255); // all white
  for (let y = 25; y < 75; y++) {
    for (let x = 25; x < 175; x++) {
      const idx = (y * 200 + x) * 3;
      widePixels[idx] = 0;
      widePixels[idx + 1] = 0;
      widePixels[idx + 2] = 0;
    }
  }
  await sharp(widePixels, { raw: { width: 200, height: 100, channels: 3 } })
    .png()
    .toFile(join(__dirname, 'wide-rectangle.png'));

  // 7. Tiny 1x1 image for edge case testing
  await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toFile(join(__dirname, 'tiny-1x1.png'));

  console.log('Test fixture images generated successfully');
}

generateTestImages().catch(console.error);
