import { loadEnvFile } from 'node:process'

export function loadLocalEnv() {
  try {
    loadEnvFile()
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined
    if (code !== 'ENOENT') throw error
  }
}
