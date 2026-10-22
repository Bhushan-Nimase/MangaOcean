// Removes the previous build's hashed files from wwwroot/assets before a new build,
// so old bundles don't pile up. Only touches wwwroot/assets - never uploads or other files.
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const assets = fileURLToPath(new URL('../../MangaDump/wwwroot/assets', import.meta.url))
rmSync(assets, { recursive: true, force: true })
console.log('Cleaned', assets)
