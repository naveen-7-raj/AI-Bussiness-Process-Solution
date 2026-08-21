# NEXORA AI-BPI — Technical Presentation Deck

---

## 📽️ Slide 1: Title Slide
# **NEXORA AI Business Process Intelligence**
### *Real-Time Predictive, Explainable, and Prescriptive Process Optimisation for Enterprise Supply Chains*

**Presenter**: Senior Software Architect / Lead Machine Learning Engineer  
**Platform**: NEXORA AI-BPI (Production Version 1.0)  
**Target Audience**: Technical Evaluators, College Judges, Engineering Recruiters, Business Stakeholders

---

## 📽️ Slide 2: The Business Problem
# **The Enterprise Logistics Bottleneck**

* **Unplanned Fulfillment Delays**: Unexpected processing spikes in regional warehouses cause order dispatches to miss SLA target windows.
* **Capital Concentration & Inventory Imbalance**: High carrying costs in overstocked warehouses occurring simultaneously with severe stockouts at neighboring facilities.
* **Reactive Operational Management**: Operations teams react *after* customer SLAs are breached rather than pre-emptively preventing bottlenecks.

---

## 📽️ Slide 3: The Existing Gap
# **Why Traditional Process Monitoring Fails**

```
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       TRADITIONAL BI / DASHBOARDS    │     │       NEXORA AI-BPI APPROACH         │
├──────────────────────────────────────┤     ├──────────────────────────────────────┤
│ ❌ Post-hoc, historical reporting     │     │  Pre-emptive XGBoost ML prediction   │
│ ❌ Aggregated stats conceal root cause│     │  Local TreeSHAP feature attribution  │
│ ❌ Static charts without action tasks│     │  Prescriptive transfer tasks         │
│ ❌ Black-box predictions cause mistrust│     │  100% transparent, physical metrics │
└──────────────────────────────────────┘     └──────────────────────────────────────┘
```

---

## 📽️ Slide 4: Our Solution
# **NEXORA AI-BPI Platform**

NEXORA AI-BPI is a **closed-loop intelligence engine** that unifies real-time event ingestion, predictive analytics, transparent explainability, and prescribed human operational workflows:

1. **Detect**: Real-time event ingestion from enterprise ERP & WMS Kafka streams.
2. **Predict**: Machine learning delay risk forecasting per warehouse and SKU.
3. **Explain**: TreeSHAP local feature importance translated into physical business metrics.
4. **Prescribe**: Deterministic inter-warehouse transfer tasks with immutable audit logging.

---

## 📽️ Slide 5: System Architecture
# **End-to-End Event-Driven Intelligence Architecture**

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

## 📽️ Slide 6: Predictive Intelligence
# **XGBoost Machine Learning Model**

* **Objective**: Predict operational dispatch delay risk probability ($0.0 - 1.0$) and duration in minutes.
* **Feature Vector Inputs**:
  1. `backlog_orders`: Count of pending orders awaiting fulfillment.
  2. `avg_processing_time_sec`: Mean processing duration per order.
  3. `warehouse_load`: Facility load factor normalized ($0.0 - 1.0$).
  4. `available_inventory`: Real-time stock units on hand.
* **High Performance**: Evaluated across facility network with low inference latency ($<5\text{ms}$).

---

## 📽️ Slide 7: Diagnostic Explainable AI (XAI)
# **Transparent TreeSHAP Attributions**

Rather than outputting abstract mathematical scores, NEXORA's TreeSHAP explainer calculates local feature contributions and formats them directly into **physical business drivers**:

$$\text{SHAP Value } \phi_i \longrightarrow \text{Business Driver Metric}$$

* **Example Output**:
  * 🔴 `Mean Processing Duration: 4.5s` *(Increases delay risk)*
  * 🔴 `Backlogged Orders: 47 orders` *(Increases delay risk)*
  * 🟢 `Available Inventory: 362 units` *(Decreases delay risk)*
* **Optional LLM Explanations**: Generates natural-language business explanations on demand via the LLM layer.

---

## 📽️ Slide 8: Prescriptive Intelligence
# **Closed-Loop Action Framework**

```
   ┌──────────────┐          Rule Match          ┌──────────────┐          Human Action          ┌──────────────┐
   │  RISK ALERT  │ ───────────────────────────► │ ROOT CAUSE   │ ─────────────────────────────► │ RECOMENDATION│
   │ High/Med/Low │                              │ TreeSHAP     │                                │ Transfer Qty │
   └──────────────┘                              └──────────────┘                                └──────┬───────┘
                                                                                                        │
                                                 ┌──────────────┐                                       │
                                                 │ AUDIT TRAIL  │ ◄─────────────────────────────────────┘
                                                 │ Immutable Log│
                                                 └──────────────┘
```

* **Deterministic Transfer Logic**:
  * `SAFETY_STOCK = 15`: Minimum stock retained at source warehouse.
  * `IMBALANCE_HIGH_FACTOR = 2.0`: Warehouse inventory $> 2.0\times$ network average triggers proactive rebalance.

---

## 📽️ Slide 9: RBAC & Governance Architecture
# **Zero-Trust PostgreSQL-Authoritative Security**

* **Normalized RBAC Roles**:
  * `user` → **Warehouse Lead**: Facility-specific backlog management & order tracking.
  * `admin` → **Regional Logistics Director**: Regional network oversight & transfer authorizations (supports 1, 7, 30 day temporary access).
  * `super_admin` → **System Administrator**: Platform-wide governance & role management (protected against downgrade).
* **Server-Side Authorization & Expiration**:
  * All role mutations enforce `Depends(get_current_super_admin_user)` returning `HTTP 403 Forbidden` for unauthorized requests.
  * Backend automatically demotes expired temporary admins back to `user` upon token evaluation.

---

## 📽️ Slide 10: Real-Time WebSocket & Role Synchronization
# **Event-Driven Synchronization Engine**

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

* **Dynamic Role Counts**: Calculated from actual active backend user records rather than hardcoded metrics.
* **Sub-15ms Synchronization**: Instant update propagation across all open Admin Panel sessions without page refreshes.

---

## 📽️ Slide 11: Auditability & Task Lifecycle
# **State Machine & Append-Only Audit Trail**

```
   ┌──────────────┐          Start Action          ┌──────────────┐          Mark Resolved          ┌──────────────┐
   │    ACTIVE    │ ─────────────────────────────► │ IN_PROGRESS  │ ────────────────────────────────► │   RESOLVED   │
   └──────────────┘                                └──────────────┘                                   └──────┬───────┘
                                                                                                              │
                                                   ┌──────────────┐                                          │
                                                   │ VERIFIED DB  │ ◄────────────────────────────────────────┘
                                                   │ Telemetry OK │
                                                   └──────────────┘
```

* **Audit Record Schemas**:
  * Operational tasks write to PostgreSQL `audit_logs`: `(user_email, user_role, action, recommendation_id, facility_id, previous_status, new_status, timestamp)`
  * Governance role changes write to `rbac_audit_logs`: `(actor_email, target_email, action, old_role, new_role, reason, timestamp)` Architecture
# **Zero-Trust Server-Side Authorization**

* **Role-Based Access Control (RBAC)**:
  * `Warehouse Lead`: Access restricted to assigned facility (e.g. `WH01` or `WH01,WH03`).
  * `Regional Logistics Director`: Regional fleet management.
  * `System Administrator`: Full network authority (`ALL`).
* **Attribute-Based Access Control (ABAC)**:
  * Server-side `is_facility_authorized(user_assigned_facility, target_facilities)` checks every state mutation.
  * Unauthorized cross-facility requests are rejected with **HTTP 403 Forbidden**.

---

## 📽️ Slide 10: Real-Time Operations
# **Event-Driven Kafka & WebSocket Engine**

```
   [ KAFKA BROKER ] ───► [ BACKGROUND CONSUMER THREAD ] ───► [ THREAD-SAFE QUEUE ] ───► [ WEBSOCKET BROADCASTER ] ───► [ REACT UI ]
```

* **Kafka Streaming**: Subscribes to `inventory`, `orders`, `warehouse`, and `logistics` topics.
* **Thread-Safety**: Kafka daemon dispatches messages onto `_broadcast_queue` using `main_event_loop.call_soon_threadsafe`, guaranteeing crash-free execution.
* **Sub-15ms Update Latency**: Connected clients receive updates instantly without manual page refreshes.

---

## 📽️ Slide 11: Auditability & Task Lifecycle
# **State Machine & Append-Only Audit Trail**

```
   ┌──────────────┐          Start Action          ┌──────────────┐          Mark Resolved          ┌──────────────┐
   │    ACTIVE    │ ─────────────────────────────► │ IN_PROGRESS  │ ────────────────────────────────► │   RESOLVED   │
   └──────────────┘                                └──────────────┘                                   └──────┬───────┘
                                                                                                             │
                                                   ┌──────────────┐                                          │
                                                   │ VERIFIED DB  │ ◄────────────────────────────────────────┘
                                                   │ Telemetry OK │
                                                   └──────────────┘
```

* **Audit Record Schema**: Every task action writes an immutable record to PostgreSQL `audit_logs`:
  * `(user_email, user_role, action, recommendation_id, facility_id, previous_status, new_status, timestamp)`

---

## 📽️ Slide 12: Modern UI/UX Dashboard
# **Resend-Inspired Minimalist Enterprise UI**

* **Dark Glassmorphism Aesthetics**: Built using curated CSS tokens, high-contrast typography, and smooth transitions.
* **API-Driven UI States**:
  * **Loading**: Animated pulse skeletons.
  * **Success**: Real-time business metrics and charts.
  * **Empty**: Clear notification without false error alerts.
  * **Error**: High-visibility error card with **"↻ Retry Fetch"** action button.
* **Fully Responsive**: Verified layouts across `390px`, `480px`, `768px`, `1024px`, and `1440px`.

---

## 📽️ Slide 13: Measurable Business Impact
# **Quantifiable Operational Benefits**

* **Pre-Emptive Stockout Reduction**: Transferring surplus inventory before stockouts occur reduces order fulfillment delays.
* **Automated Bottleneck Detection**: Eliminates manual cross-referencing of inventory spreadsheets across regional warehouses.
* **Immutable Compliance**: 100% audit coverage for enterprise logistics governance and regulatory reviews.

---

## 📽️ Slide 14: Future Enhancements Roadmap
# **Extensible Enterprise Evolution**

1. **Enterprise SAML 2.0 / Okta SSO**: Single Sign-On integration for enterprise identity providers.
2. **Automated PDF Audit Reports**: Scheduled PDF export of monthly facility resolution metrics.
3. **Bi-Directional WMS Connectors**: Direct ERP/WMS API integration (SAP, Oracle, Manhattan Associates).
4. **Automated Autonomous Dispatch**: Optional automated stock transfer execution for low-risk scenarios.
5. **Continuous Model Re-training Pipeline**: Automated monthly XGBoost model retraining on new telemetry logs.

---

## 📽️ Slide 15: Conclusion
# **Why NEXORA AI-BPI Stands Out**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            THE NEXORA DIFFERENCE                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ✅ Predicts bottlenecks before SLAs are breached                                │
│ ✅ Explains root causes in clear physical business units (TreeSHAP)              │
│ ✅ Prescribes actionable stock transfers without non-deterministic LLM hallucinations│
│ ✅ Enforces zero-trust server-side security and multi-facility RBAC             │
│ ✅ Delivers sub-15ms real-time event updates via WebSockets                      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### **Thank You! Questions & Live Demonstration**
