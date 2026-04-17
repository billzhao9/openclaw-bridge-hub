# openclaw-bridge-hub

Central hub for [OpenClaw](https://github.com/nicepkg/openclaw) distributed gateway architecture. Provides gateway registry, file relay, command queue, real-time WebSocket message relay, and a web-based management panel for monitoring and controlling all your agents from anywhere.

## Features

- **Gateway Registry** — Agent discovery via register/heartbeat/discover API
- **File Relay** — Cross-machine file transfer with automatic cleanup
- **Command Queue** — Remote command execution (read/write/restart)
- **Message Relay** — Real-time WebSocket agent-to-agent messaging with session handoff
- **Management Panel** — Web dashboard to monitor, control, and chat with all agents remotely

> **Note (v0.5.0):** Local Manager and CLI tools are now part of the `openclaw-bridge` client plugin. Install `openclaw-bridge` on each machine to get process management, backup, and agent creation tools.

> **注意 (v0.5.0):** Local Manager 和 CLI 管理工具已迁移至 `openclaw-bridge` 客户端插件。在每台机器上安装 `openclaw-bridge` 即可获得进程管理、备份和 agent 创建功能。

## Quick Start

### 1. Server Setup (remote server)

```bash
npm install -g openclaw-bridge-hub
openclaw-bridge-hub init                    # generates API key — save it!
openclaw-bridge-hub manager-pass mypass     # enable management panel
openclaw-bridge-hub start                   # starts Hub on :3080 + panel on :9090
sudo openclaw-bridge-hub install-service    # auto-start on boot (Linux)
```

### 2. Local Machine Setup (your computer)

```bash
openclaw plugins install openclaw-bridge    # install as OpenClaw plugin
npm install -g openclaw-bridge              # (optional) install CLI tools for PM2 management
openclaw-bridge setup                       # configure Hub URL, API key, manager password
openclaw-bridge doctor                      # check environment (PM2, Node, ports)
openclaw-bridge start                       # start all openclaw gateway instances
openclaw-bridge status                      # verify everything is running
```

The `openclaw-bridge` client plugin includes Local Manager, which connects to your Hub server, reports gateway status, and accepts remote commands (restart/stop). See the [openclaw-bridge README](https://www.npmjs.com/package/openclaw-bridge) for all CLI commands including `add-agent`, `backup`, `logs`, etc.

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize config, generate API key, create data directory |
| `start` | Start the Hub server + management panel |
| `status` | Check if server is running |
| `manager-pass <pw>` | Set management panel password (enables remote management) |
| `install-service` | Install as systemd service (Linux) |
| `uninstall-service` | Remove systemd service |

## Management Panel (port 9090)

Password-protected web dashboard for managing all connected OpenClaw instances:

- **Global Dashboard** — View all agents across all machines, grouped by machine
- **Status Monitoring** — Running state, Discord connection, Hub WebSocket, memory, heartbeat
- **Remote Control** — Start/stop/restart individual agents or entire machines
- **Built-in Chat** — Send messages to any online agent directly from the browser
- **Activity Log** — Track all management actions

Access at `http://your-server:9090` after setting a password with `manager-pass`.

## Dashboard v2

The management panel (port 9090) has been significantly updated:

- **Agent Cards with Descriptions** — Each agent card now displays its `description` and `role` fields from the bridge config, making it easy to identify what each agent does at a glance.
- **Log Viewer Modal** — Click the **Logs** button on any agent card to open a modal showing the latest 100 lines of PM2 output for that agent. Logs auto-refresh while the modal is open.
- **Image Upload** — The chat panel now includes an image upload button. Uploaded images are saved directly to the target agent's workspace directory. Vision-capable agents (those with `supportsVision: true`) receive the image inline in the chat message. Agents without vision support receive a text notification with the saved file path instead.

## What's New in v0.6.6

### Bug Fixes
- **Dead Connection Registry Cleanup** — When a WebSocket disconnects, the agent's registry entry is now marked as `offline` immediately. Previously, disconnected agents stayed as "online" in the registry until their heartbeat expired client-side.
- **Registry TTL Cleanup** — Added automatic cleanup of stale registry entries. Agents whose `lastHeartbeat` is older than 24 hours (configurable via `REGISTRY_TTL_MS`) are automatically removed. This eliminates ghost nodes on the dashboard.
- **Startup Stale Cleanup** — On Hub restart, all existing registry entries are marked `offline`. Agents go back to `online` when they reconnect and re-register. Previously, old entries persisted as "online" indefinitely after a Hub restart.

### v0.6.6 Bug 修复
- **断连后注册清理** — WebSocket 断开时，Agent 的注册记录现在立即标记为 `offline`。此前断连的 Agent 在注册表中一直显示为 "online"。
- **注册 TTL 清理** — 新增注册记录自动过期清理。`lastHeartbeat` 超过 24 小时（可通过 `REGISTRY_TTL_MS` 配置）的记录自动删除，消除 Dashboard 上的幽灵节点。
- **启动时清理旧注册** — Hub 重启时，所有现有注册记录标记为 `offline`。Agent 重连后重新注册恢复为 `online`。此前 Hub 重启后旧记录永久保持 "online" 状态。

## What's New in v0.6.0

### Multi-Device Support
- **agentId Conflict Detection** — When two machines connect with the same `agentId`, Hub now detects the conflict and suggests an auto-rename (`agentId@machineId`) instead of silently kicking the old connection. Both agents can coexist.
- **WebSocket Ping/Pong** — Hub sends pings every 30 seconds and closes connections that don't respond within 40 seconds. Dead connections from WiFi switches, sleep mode, etc. are cleaned up automatically.

### 多设备支持 (v0.6.0)
- **agentId 冲突检测** — 两台机器用相同 agentId 连接时，Hub 会检测冲突并建议自动改名（`agentId@机器名`），而不是静默踢掉旧连接。两个 Agent 可以同时在线。
- **WebSocket 心跳** — Hub 每 30 秒发送 ping，40 秒无响应则关闭连接。WiFi 切换、休眠等导致的死连接会自动清理。

## API Endpoints

### HTTP (port 3080)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/registry/register` | POST | Register/update gateway |
| `/api/v1/registry/heartbeat` | POST | Heartbeat update |
| `/api/v1/registry/discover` | GET | List all gateways |
| `/api/v1/registry/whois/:id` | GET | Get specific gateway |
| `/api/v1/registry/:id` | DELETE | Deregister gateway |
| `/api/v1/files/upload` | POST | Upload file for relay |
| `/api/v1/files/pending` | GET | Check pending files |
| `/api/v1/files/download/:id` | GET | Download file |
| `/api/v1/files/ack/:id` | POST | Acknowledge receipt |
| `/api/logs/:agentId` | GET | Return latest 100 lines of PM2 logs for the given agent |
| `/api/chat/upload` | POST | Upload an image file; saved to the target agent's workspace directory |

### WebSocket

| Endpoint | Purpose |
|----------|---------|
| `/ws` | Agent-to-agent message relay and session handoff |
| `/ws/manager` | Local Manager status reporting and remote commands |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3080 | Hub API server port |
| `API_KEY` | (required) | Authentication key for agents |
| `DATA_DIR` | `~/.openclaw-bridge-hub/data` | Data storage directory |
| `MANAGER_PORT` | 9090 | Management panel port |
| `MANAGER_USER` | admin | Management panel username |
| `MANAGER_PASS` | (empty) | Management panel password (panel disabled if empty) |
| `REGISTRY_TTL_MS` | 86400000 (24h) | Auto-delete registry entries with no heartbeat for this long |

## Architecture

> **Note:** As of v0.5.0, the **Local Manager** has moved to the [`openclaw-bridge`](https://www.npmjs.com/package/openclaw-bridge) client plugin package. This server package (`openclaw-bridge-hub`) only handles relay, registry, and dashboard. To use Local Manager, install `openclaw-bridge` on your local machine and enable it via `localManager.enabled: true` in the bridge plugin config.

```
openclaw-bridge-hub
├── :3080 — Hub API
│   ├── /api/v1/registry/*   — Gateway discovery
│   ├── /api/v1/files/*      — File relay
│   ├── /api/v1/commands/*   — Command queue
│   ├── /api/v1/health       — Health check
│   ├── /ws                  — Agent message relay
│   └── /ws/manager          — Local Manager connections
└── :9090 — Management Panel
    ├── Login (username + password)
    ├── Dashboard (all machines & agents)
    ├── Remote control (start/stop/restart)
    └── Chat (DM any agent)
```

---

## 中文说明

openclaw-bridge-hub 是 [OpenClaw](https://github.com/nicepkg/openclaw) 分布式网关架构的中央枢纽服务，提供 Agent 注册发现、跨机器文件中转、实时消息中继、以及远程管理面板。

### 核心功能

- **Agent 注册发现** — 各网关通过心跳自动注册，互相发现
- **文件中转** — 跨机器 Agent 之间文件传输，自动清理
- **消息中继** — WebSocket 实时消息转发 + 会话交接（Handoff）
- **管理面板** — 网页仪表盘，远程监控和控制所有 Agent，内置聊天

### 快速开始

```bash
# 服务器端
npm install -g openclaw-bridge-hub
openclaw-bridge-hub init                    # 初始化，生成 API Key
openclaw-bridge-hub manager-pass 你的密码    # 开启管理面板
openclaw-bridge-hub start                   # 启动服务

# 本地电脑（安装客户端插件，包含 Local Manager 和 CLI 工具）
openclaw plugins install openclaw-bridge    # 安装为 OpenClaw 插件
npm install -g openclaw-bridge              # （可选）安装 CLI 管理工具
openclaw-bridge setup                       # 配置 Hub 地址、API Key、管理密码
openclaw-bridge start                       # 启动所有网关实例
```

### 使用场景

- 多台电脑部署 OpenClaw Agent，统一通过 Hub 互相通信
- 在任何地方通过管理面板远程控制所有 Agent
- 在浏览器里直接和任意在线 Agent 聊天
- Agent 之间传话、切换对话，无需共享 Discord 频道

## Author

**Bill Zhao** — [LinkedIn](https://www.linkedin.com/in/billzhaodi/)

## License

MIT
