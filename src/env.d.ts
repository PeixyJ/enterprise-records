declare const __BUILD_TIME__: string
declare const __GIT_HASH__: string

interface ElectronDB {
  readDatabase(): Promise<Uint8Array | null>
  writeDatabase(data: Uint8Array): Promise<void>
  backupDatabase(versionLabel: string): Promise<void>
}

interface Window {
  electronDB?: ElectronDB
}
