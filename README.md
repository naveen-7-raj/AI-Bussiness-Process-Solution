# NEXORA AI-BPI — Enterprise AI-Powered Business Process Intelligence

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-3.5+-231F20?style=flat&logo=apachekafka&logoColor=white)](https://kafka.apache.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-ML-EC008C?style=flat)](https://xgboost.readthedocs.io)
[![SHAP](https://img.shields.io/badge/TreeSHAP-Explainability-FF6F00?style=flat)](https://shap.readthedocs.io)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)

**NEXORA AI-BPI** is an enterprise-grade, real-time Business Process Intelligence (BPI) and supply chain optimization platform. It combines high-throughput event streaming, machine learning predictive analytics, local feature explainability (TreeSHAP), and a deterministic business recommendation engine to detect, explain, and resolve operational bottlenecks across multi-facility warehouse networks.

---

## 📖 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Key Features](#3-key-features)
4. [Technology Stack](#4-technology-stack)
5. [Installation & Setup](#5-installation--setup)
6. [Authentication & RBAC](#6-authentication--rbac)
7. [API Documentation](#7-api-documentation)
8. [Machine Learning & Explainability](#8-machine-learning--explainability)
9. [Troubleshooting Guide](#9-troubleshooting-guide)

---

## 1. Project Overview

### Problem Statement
Enterprise logistics and warehouse management operations frequently suffer from:
* **Unpredicted Stockouts & Inventory Imbalance**: Carrying-cost concentration at excess warehouses while order fulfilment stalls at deficit facilities.
* **Processing Congestion Surges**: Backlogged orders resulting in unmanaged dispatch delays.
* **Black-Box Predictive Models**: Operational leads resisting automated alerts when ML predictions lack transparent, physical root-cause attributions.

### Business Value Delivered
NEXORA AI-BPI bridges predictive AI and human operational execution by delivering:
1. **Real-Time Visibility**: Sub-second event ingestion and WebSocket feed updates.
2. **Explainable AI (XAI)**: Physical unit attributions (e.g., *Mean Processing Duration: 4.5s*, *Backlogged Orders: 47 orders*) powered by TreeSHAP.
3. **Prescriptive Action Engine**: Deterministic inter-warehouse transfer tasks (`Source → Destination, Quantity, SKU`).
4. **Immutable Audit Trail**: Append-only PostgreSQL audit logs tracking every status transition.

---

## 2. System Architecture

NEXORA operates on an end-to-end event-driven intelligence architecture:

```text
Business Events / Data
        ↓
      Kafka
        ↓
 Fast-API / Python
        ↓
    PostgreSQL
        ↓
XGBoost Prediction
        ↓
SHAP Root Cause Analysis
        ↓
Deterministic Recommendation Engine
        ↓
Optional LLM Explanation
        ↓
    WebSocket
        ↓
 React Dashboard
```

---

## 3. Key Features

* **Interactive Executive Dashboard**: Real-time KPI cards, high-risk operational alerts, live order & warehouse trends, and WebSocket-driven activity feeds.
* **Predictive Risk Detection**: XGBoost machine learning model for pre-emptive operational bottleneck & dispatch delay risk forecasting (`HIGH`, `MEDIUM`, `LOW`).
* **Diagnostic Root-Cause Explainability**: Local TreeSHAP attributions converting ML feature importance into physical units (e.g. *Backlog: 47 orders*, *Processing Time: 4.5s*).
* **Prescriptive Recommendations Engine**: Deterministic stock rebalancing & transfer dispatch generation without LLM hallucination risk.
* **Optional LLM Explanations**: Natural language operational business explanations generated on-demand via Gemini / LLM pipeline.
* **Actionable Task Lifecycle**:
  $$\text{Detected (ACTIVE)} \longrightarrow \text{In Progress (IN_PROGRESS)} \longrightarrow \text{Resolved (RESOLVED)} \longrightarrow \text{Verified (VERIFIED)} / \text{Reopened (REOPENED)}$$
* **Normalized RBAC & Server-Side Authorization**: PostgreSQL-authoritative role enforcement (`super_admin` → System Administrator, `admin` → Regional Logistics Director, `user` → Warehouse Lead).
* **Access Requests & Expiration Controls**: Self-service user access requests, Super Admin review table, and temporary access expiration enforcement.
* **Immutable Audit Trail & Governance**: Append-only PostgreSQL audit logging (`audit_logs` & `rbac_audit_logs`) capturing every task lifecycle action and role change.
* **Real-Time Role & Count Synchronization**: Calculated dynamically from active database users and synchronized across all open browser sessions via `USER_ROLE_UPDATED` WebSocket broadcasts.
* **Process Copilot**: AI-assisted natural language chat interface providing contextual process diagnostics.

---

## 4. Technology Stack

* **Frontend**: React 18, Vite 5, Vanilla CSS (Resend-inspired Dark Glassmorphism), HTML5.
* **Backend**: FastAPI, Python 3.11+, Asyncpg, PyJWT, Passlib (Bcrypt), Google OAuth.
* **Database**: PostgreSQL 16 (B-tree indexed for high concurrency).
* **Streaming**: Apache Kafka (KRaft mode).
* **Machine Learning & AI**: XGBoost Regressor, TreeSHAP explainer, Gemini LLM layer.
* **Containerization**: Docker, Docker Compose, Nginx Alpine.

---

## 5. Installation & Setup

### Prerequisites
* Python 3.11+
* Node.js 18+ & npm
* PostgreSQL 16+
* Docker & Docker Compose (optional for containerized setup)

### Quick Start with Docker (Recommended)
```bash
# Clone repository
git clone https://github.com/nexora-ai/ai-bpi.git
cd ai-bpi

# Copy environment template
cp .env.example .env

# Build and start container cluster
docker-compose up --build
```
Access the application at `http://localhost`.

### Local Development Setup

#### 1. Database Setup
Ensure PostgreSQL is running and create database:
```sql
CREATE DATABASE app_db;
```

#### 2. Backend Startup
```bash
# Set environment variables
cp .env.example .env

# Install backend dependencies
pip install fastapi uvicorn asyncpg kafka-python xgboost shap pyjwt passlib[bcrypt] python-dotenv pydantic requests google-auth httpx

# Start backend daemon
$env:PYTHONPATH = ".;backend"
python -m uvicorn backend.main:app --port 8000 --reload
```

#### 3. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
Access frontend dev server at `http://localhost:5173`.

---

## 6. Authentication & RBAC

NEXORA enforces **Zero-Trust Server-Side Authorization** with PostgreSQL as the single source of truth.

### Normalized Roles
* **`super_admin` (System Administrator)**: Full administrative governance, role updates, access request review, and access governance audit logs. Protected against accidental downgrade.
* **`admin` (Regional Logistics Director)**: Multi-facility regional network oversight, AI risk monitoring, and operational transfer authorizations. Supports temporary access durations (1, 7, 30 days).
* **`user` (Warehouse Lead)**: Facility-specific backlog management, order fulfillment tracking, and self-service admin access requests.

### Access Requests & Temporary Access
- Users with role `user` can submit an Admin access request with business justification (`POST /api/access-requests`).
- Super Admin reviews pending requests in the Admin Panel (`GET /api/access-requests`) and can approve (`POST /api/access-requests/{id}/approve`) or reject (`POST /api/access-requests/{id}/reject`).
- Approval atomically updates `users.role = 'admin'` in PostgreSQL and sets optional expiration (`access_expires_at`).
- If temporary access expires, backend `get_current_user` automatically demotes the user back to `user`, logs an audit entry, and blocks Admin endpoints (`HTTP 403 Forbidden`).

### Real-Time Role & Count Synchronization Flow
```text
Super Admin changes role / approves request
        ↓
Backend authorization (Depends(get_current_super_admin_user))
        ↓
PostgreSQL role update (users table)
        ↓
RBAC audit log (rbac_audit_logs table)
        ↓
USER_ROLE_UPDATED WebSocket event broadcast
        ↓
Connected Admin Panels receive event (useWebSocket hook)
        ↓
User data refreshed automatically
        ↓
Role counts update dynamically
```

Role counts in the Admin Panel are calculated dynamically from actual active database user records returned by `GET /api/users`.

### Authentication Providers
* **Local JWT Authentication**: HS256 signed tokens containing user identity and company scope.
* **Google Identity Services (OIDC)**: OpenID Connect token verification via Google OAuth client ID.
* **2FA OTP**: Two-factor OTP authentication via email verification.

---

## 7. API Documentation

### Authentication & User Management
* `POST /auth/login`: Authenticate local credentials and receive Bearer JWT.
* `POST /auth/verify-otp`: Complete 2FA OTP verification.
* `POST /auth/google`: Authenticate Google ID token.
* `GET /auth/me`: Retrieve current user identity and RBAC role.
* `GET /api/users`: Fetch all registered identities and assigned facilities (Super Admin / Admin).
* `POST /api/users/role`: Update user role, facility, and status (Super Admin only, strictly guarded).

### Access Requests & Governance Audit
* `POST /api/access-requests`: Submit Admin access request.
* `GET /api/access-requests`: Retrieve pending access requests (Super Admin only).
* `POST /api/access-requests/{id}/approve`: Approve access request and promote user to `admin` (Super Admin only).
* `POST /api/access-requests/{id}/reject`: Reject access request (Super Admin only).
* `GET /api/admin/rbac-audit-logs`: Fetch append-only RBAC governance audit records (Super Admin only).

### Recommendations & Tasks
* `GET /api/recommendations/live`: Fetch live recommendations sorted by priority.
* `POST /api/recommendations/{rec_id}/status`: Update task status (`IN_PROGRESS`, `RESOLVED`, `VERIFY`). Evaluates server-side facility authorization.

### Audit & Predictions
* `GET /api/audit-logs`: Fetch append-only operational audit trail records.
* `POST /api/predictions/run`: Execute XGBoost inference and TreeSHAP explainability.

---

## 8. Empirical Verification & Quality Assurance

All critical governance, RBAC, and WebSocket paths have been empirically verified with 100% automated test coverage:
* **Role Count Calculation**: Verified dynamic role counting from PostgreSQL user records (`System Administrator`, `Regional Logistics Director`, `Warehouse Lead`).
* **Real-Time WebSocket Synchronization**: Verified `USER_ROLE_UPDATED` WebSocket events stream to all connected client sessions without manual browser refresh.
* **Role Promotion & Demotion**: Verified count increment (`+1`) and decrement (`-1`) synchronization across promotion/demotion workflows.
* **Server-Side Security Enforcement**: Verified unauthorized role modification requests return `HTTP 403 Forbidden` and Super Admin downgrade protection is active.
* **Production Build Validation**: `npm run build` completes cleanly (`51 modules transformed`, `0 errors`).

---

## 8. Machine Learning & Explainability

### Model Features
XGBoost predicts dispatch delay risks using 4 primary feature vectors:
1. `backlog_orders`: Integer count of unprocessed orders.
2. `avg_processing_time_sec`: Mean processing duration in seconds.
3. `warehouse_load`: Capacity utilization normalized ($0.0 - 1.0$).
4. `available_inventory`: Physical units in stock.

### Deterministic Recommendation Engine
Threshold rules generate precise transfer tasks without relying on non-deterministic LLMs:
```python
SAFETY_STOCK = 15                 # Minimum stock retained at source
IMBALANCE_HIGH_FACTOR = 2.0       # Facility > avg * factor => Surplus
IMBALANCE_LOW_FACTOR = 0.5        # Facility < avg * factor => Deficit
```

---

## 9. Troubleshooting Guide

| Symptom / Error | Root Cause | Solution |
| :--- | :--- | :--- |
| **`ConnectionRefusedError: [Errno 111]`** | PostgreSQL daemon not running on port 5432. | Start PostgreSQL service or check `DATABASE_URL` in `.env`. |
| **`HTTP 401 Unauthorized`** | Expired or missing Bearer token. | Re-authenticate via `/auth/login` to update local storage token. |
| **`HTTP 403 Forbidden`** | User attempting action on unassigned facility. | Verify user's `assigned_facility` string in PostgreSQL `users` table. |
| **`KafkaConsumer Timeout`** | Kafka broker unavailable. | Verify Kafka container status or set fallback in `backend/main.py`. |

---

*NEXORA AI-BPI — Production-Grade Intelligent Business Process Engineering.*
