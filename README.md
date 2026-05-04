# CyberPulse

**Real-time 3D globe visualizing global cyber threat activity.**

A full-stack visualization platform that renders live attack events as animated arcs on an interactive WebGL globe — showing attack origin, target, type, and severity in real time.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

---

## Features

- **Interactive 3D Globe** — WebGL globe with custom GLSL shaders for atmosphere glow, attack arcs, and impact ripples
- **Live Attack Stream** — WebSocket-powered real-time event feed
- **5 Attack Types** — Brute Force, DDoS, Malware/C2, Scanning, Phishing — each color-coded
- **HUD Overlays** — Stats bar, event ticker, country rankings, attack legend, time controls
- **Time Scrubber** — Replay historical attacks via REST API
- **Country Detail** — Click any country to see incoming/outgoing attack breakdown
- **20 Countries Tracked** — Weighted source/target probabilities based on real threat intelligence patterns

## Architecture

Turborepo monorepo with three packages:

```
apps/
  web/        # Next.js 15 frontend — Three.js globe, React Three Fiber, HUD
  server/     # Fastify backend — WebSocket broadcast, REST API, attack ingest
packages/
  shared/     # Shared TypeScript types (AttackEvent, StatsSnapshot, etc.)
```

**Data flow:** Simulator → PostgreSQL → Redis pub/sub → Fastify WebSocket → Next.js client

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React Three Fiber, Three.js, Tailwind CSS |
| Shaders | Custom GLSL (atmosphere, arc, ripple) |
| Backend | Fastify, `@fastify/websocket` |
| Database | PostgreSQL (attack history) |
| Cache/Pub-Sub | Redis |
| Monorepo | Turborepo, pnpm workspaces |
| Infrastructure | Docker Compose |

## Getting Started

**Prerequisites:** Node.js 18+, pnpm, Docker

```bash
git clone https://github.com/aleksakarac/CyberPulse
cd CyberPulse

# Start PostgreSQL + Redis
docker compose up -d

# Install dependencies
pnpm install

# Run everything
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## Status

> Active development — core globe, WebSocket streaming, and HUD are functional. Real threat feed integration and deployment WIP.
