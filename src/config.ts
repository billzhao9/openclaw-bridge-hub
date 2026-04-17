import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "3080", 10),
  apiKey: process.env.API_KEY ?? "",
  dataDir: process.env.DATA_DIR ?? "./data",
  cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS ?? "60000", 10),
  fileTtlMs: parseInt(process.env.FILE_TTL_MS ?? "86400000", 10),
  commandTtlMs: parseInt(process.env.COMMAND_TTL_MS ?? "3600000", 10),
  managerPort: parseInt(process.env.MANAGER_PORT || '9090', 10),
  managerUser: process.env.MANAGER_USER || 'admin',
  managerPass: process.env.MANAGER_PASS || '',
  registryTtlMs: parseInt(process.env.REGISTRY_TTL_MS ?? "300000", 10) || 300000, // 5 minutes default
};
