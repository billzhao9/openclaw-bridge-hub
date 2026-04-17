#!/usr/bin/env -S npx tsx
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";

const DATA_DIR = process.env.BRIDGE_FILERELAY_DATA || join(process.env.HOME || "/root", ".openclaw-bridge-hub");
const ENV_FILE = join(DATA_DIR, ".env");
const IS_LINUX = process.platform === "linux";

const command = process.argv[2];

function printHelp() {
  console.log(`
openclaw-bridge-hub — OpenClaw Bridge FileRelay Server

Commands:
  init              Initialize config (generates API key, creates data dir)
  start             Start the server
  status            Check if server is running
  install-service   Install as systemd service (Linux, auto-start on boot)
  uninstall-service Remove systemd service
  manager-pass <pw> Set the manager panel password (enables remote management)
  manager           Start the Local Manager (run on your local machine)
  help              Show this help

Environment:
  BRIDGE_FILERELAY_DATA   Data directory (default: ~/.openclaw-bridge-hub)
  PORT                    Server port (default: 3080)
  API_KEY                 API key for authentication

Server setup:
  npm install -g openclaw-bridge-hub
  openclaw-bridge-hub init
  openclaw-bridge-hub manager-pass mypassword
  openclaw-bridge-hub start
  openclaw-bridge-hub install-service   # auto-start on reboot

Local machine (remote management):
  npm install -g openclaw-bridge-hub
  cd /path/to/openclaw-instances
  openclaw-bridge-hub manager           # starts local manager + PM2 gateways
`);
}

function init() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (existsSync(ENV_FILE)) {
    console.log(`Config already exists at ${ENV_FILE}`);
    console.log("Edit it to change settings, then run: openclaw-bridge-hub start");
    return;
  }

  const apiKey = randomBytes(32).toString("hex");
  const envContent = `# Bridge Hub Configuration
PORT=3080
API_KEY=${apiKey}
DATA_DIR=${DATA_DIR}/data
CLEANUP_INTERVAL_MS=3600000
FILE_TTL_MS=86400000
COMMAND_TTL_MS=3600000

# Manager Panel (set MANAGER_PASS to enable)
MANAGER_PORT=9090
MANAGER_USER=admin
MANAGER_PASS=
`;

  writeFileSync(ENV_FILE, envContent);
  mkdirSync(join(DATA_DIR, "data", "files"), { recursive: true });

  console.log(`
Initialized openclaw-bridge-hub at ${DATA_DIR}

Your API key (save this — clients need it to connect):

  ${apiKey}

Config file: ${ENV_FILE}
Data dir:    ${DATA_DIR}/data

Next steps:
  openclaw-bridge-hub start              # start the server
  openclaw-bridge-hub install-service    # auto-start on boot (Linux)
`);
}

function start() {
  if (existsSync(ENV_FILE)) {
    // Load env from config file
    const content = readFileSync(ENV_FILE, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } else {
    console.log("No config found. Run 'openclaw-bridge-hub init' first.");
    process.exit(1);
  }

  // Import and start the server
  import("./index.js");
}

function status() {
  if (!existsSync(ENV_FILE)) {
    console.log("Not initialized. Run: openclaw-bridge-hub init");
    return;
  }

  const content = readFileSync(ENV_FILE, "utf-8");
  const portMatch = content.match(/^PORT=(\d+)/m);
  const port = portMatch ? portMatch[1] : "3080";

  try {
    execSync(`curl -sf http://localhost:${port}/api/v1/health`, { timeout: 5000 });
    console.log(`FileRelay is running on port ${port}`);
  } catch {
    console.log(`FileRelay is NOT running (port ${port})`);
  }
}

function installService() {
  if (!IS_LINUX) {
    console.log("systemd service is only supported on Linux.");
    console.log("On other platforms, use pm2 or your system's service manager.");
    return;
  }

  // Find the actual path of openclaw-bridge-hub bin
  let binPath: string;
  try {
    binPath = execSync("which openclaw-bridge-hub", { encoding: "utf-8" }).trim();
  } catch {
    binPath = "/usr/local/bin/openclaw-bridge-hub";
  }

  const user = process.env.USER || "root";

  const serviceContent = `[Unit]
Description=OpenClaw Bridge FileRelay
After=network.target

[Service]
Type=simple
User=${user}
Environment=BRIDGE_FILERELAY_DATA=${DATA_DIR}
ExecStart=${binPath} start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`;

  const servicePath = "/etc/systemd/system/openclaw-bridge-hub.service";
  try {
    writeFileSync(servicePath, serviceContent);
    execSync("systemctl daemon-reload");
    execSync("systemctl enable openclaw-bridge-hub");
    execSync("systemctl start openclaw-bridge-hub");
    console.log(`
Service installed and started!

  systemctl status openclaw-bridge-hub   # check status
  systemctl restart openclaw-bridge-hub  # restart
  journalctl -u openclaw-bridge-hub -f   # view logs
`);
  } catch (err) {
    console.log(`Failed to install service. You may need sudo:\n  sudo openclaw-bridge-hub install-service`);
    // Write service file to data dir as fallback
    const fallbackPath = join(DATA_DIR, "openclaw-bridge-hub.service");
    writeFileSync(fallbackPath, serviceContent);
    console.log(`\nService file saved to: ${fallbackPath}`);
    console.log("Install manually:");
    console.log(`  sudo cp ${fallbackPath} /etc/systemd/system/`);
    console.log("  sudo systemctl daemon-reload && sudo systemctl enable --now openclaw-bridge-hub");
  }
}

function uninstallService() {
  if (!IS_LINUX) {
    console.log("systemd service is only supported on Linux.");
    return;
  }
  try {
    execSync("systemctl stop openclaw-bridge-hub");
    execSync("systemctl disable openclaw-bridge-hub");
    execSync("rm /etc/systemd/system/openclaw-bridge-hub.service");
    execSync("systemctl daemon-reload");
    console.log("Service removed.");
  } catch {
    console.log("Failed to remove service. Try with sudo.");
  }
}

function setManagerPass() {
  const pass = process.argv[3];
  if (!pass) {
    console.log("Usage: openclaw-bridge-hub manager-pass <password>");
    return;
  }
  if (!existsSync(ENV_FILE)) {
    console.log("Not initialized. Run: openclaw-bridge-hub init");
    return;
  }
  let content = readFileSync(ENV_FILE, "utf-8");
  if (content.includes("MANAGER_PASS=")) {
    content = content.replace(/^MANAGER_PASS=.*$/m, `MANAGER_PASS=${pass}`);
  } else {
    content += `\n# Manager Panel\nMANAGER_PORT=9090\nMANAGER_USER=admin\nMANAGER_PASS=${pass}\n`;
  }
  writeFileSync(ENV_FILE, content);
  console.log(`\nManager password set! Restart the service to apply:\n  sudo systemctl restart openclaw-bridge-hub\n\nThen access the management panel at http://your-server:9090\n  Username: admin\n  Password: ${pass}\n`);
}

switch (command) {
  case "init":
    init();
    break;
  case "start":
    start();
    break;
  case "status":
    status();
    break;
  case "install-service":
    installService();
    break;
  case "uninstall-service":
    uninstallService();
    break;
  case "manager-pass":
    setManagerPass();
    break;
  default:
    printHelp();
}
