import { execSync } from 'node:child_process'

/** Restablece la base de datos local (migraciones + seed) para que cada ejecución sea reproducible. */
export default function globalSetup() {
  execSync('npm run db:reset', { stdio: 'inherit' })
}
