# Vektora Backend - Core Engine

Production-grade Next.js (App Router) execution engine driven by Drizzle ORM and PostgreSQL. This module orchestrates system identity bounds, transaction contexts, and multi-tenant domain layers.

---

## 🛠️ Tech Stack & Architecture

- **Runtime Framework:** Next.js 15+ (App Router)
- **Database Engine:** PostgreSQL
- **Persistence Layer (ORM):** Drizzle ORM (Postgres.js driver)
- **Validation Engine:** Zod (Runtime primitive assertion)
- **Telemetry & Logging:** Pino (Structured JSON logging output)
- **Testing Suite:** Vitest (In-memory transactional sandboxing)

---

## 🚀 Local Development Quickstart

### 1. Prerequisites
Ensure you have the following runtimes installed on your local workstation:
- **Node.js** (v20+ recommended)
- **PostgreSQL** instance running locally or via Docker

### 2. Hydrate Environment Secrets
Create a `.env` file in the root directory of the project and populate the keys exactly as shown below:
```
PORT=3000
DATABASE_URL="postgres://USERNAME:PASSWORD@localhost:5432/vektora_dev"
TEST_DATABASE_URL="postgres://USERNAME:PASSWORD@localhost:5432/vektora_test"
APP_ENV="development"
LOG_LEVEL="debug"
LOG_SYNC="true"
```
Note that `.env` is explicitly blacklisted in `.gitignore` and must never be committed to source control.

### 3. Install Dependencies
Run "npm install" in your terminal to hydrate local dependencies.

### 4. Execute Database Migrations
Generate and push the current schema graph directly to your local database instance using Drizzle Kit by running "npx drizzle-kit push" in your terminal.

### 5. Spin Up the Development Engine
Run "npm run dev" to boot the engine. The server will listen for edge boundaries at http://localhost:3000.

---

## 🧪 Test Automation Execution

The suite leverages isolated transactional hooks (AsyncLocalStorage) to run integration flows inside self-aborting sandboxes. This prevents dirty state mutations between tests. Trigger the suite by executing "npm run test".

---

## 📁 Active Core Architecture
```
src/
├── config/           # Enforced environment schemas & system setups
├── db/               # Context proxies, schema aggregates, engine storage
├── modules/
│   └── identity/     # DTOs, schemas, constants, and database business services
└── shared/
    ├── errors/       # Global operational AppError definitions
    └── utils/        # Telemetry loggers and API boundary interceptors
```
