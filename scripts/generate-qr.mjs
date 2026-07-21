import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'

const url = process.argv[2]

if (!url) {
  console.error('Usage: npm run qr -- "https://example.com/"')
  process.exit(1)
}

const outputDir = path.resolve(process.cwd(), '..', 'outputs')
const outputPath = path.join(outputDir, 'wedding-album-qr.png')

await mkdir(outputDir, { recursive: true })
await QRCode.toFile(outputPath, url, {
  color: {
    dark: '#171717',
    light: '#ffffff',
  },
  errorCorrectionLevel: 'H',
  margin: 2,
  scale: 12,
  type: 'png',
})

console.log(outputPath)
