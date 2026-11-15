# ApexScholar Architecture Documentation

## 1. System Overview

**ApexScholar** is an enterprise-grade academic scholarship management portal designed using an event-driven and service-oriented **Microservices Architecture**. It enables higher education students to discover merit- and need-based scholarships, submit verified applications with digital document proofs, track approval milestones, and enables scrutiny officers and reviewers to audit student eligibility and approve grants.

```
                           +---------------------------+
                           |  React + Vite Frontend    |
                           |   (Port 5173 - Client)    |
                           +-------------+-------------+
                                         |
                                         | HTTP/REST & GraphQL & SOAP
                                         v
                           +---------------------------+
                           |        API Gateway        |
                           |   (Port 3000 - Express)   |
                           +-------------+-------------+
                                         |
         +-----------------+-------------+-------------+-----------------+
         |                 |                           |                 |
         v                 v                           v                 v
+-----------------+ +-----------------+       +-----------------+ +-----------------+
| Identity Service| |Scholarship Serv.|       |Application Serv.| | Review Service  |
|   (Port 3001)   | |   (Port 3002)   |       |   (Port 3003)   | |   (Port 3004)   |
+--------+--------+ +--------+--------+       +--------+--------+ +--------+--------+
         |                   |                         |                   |
         v                   v                         v                   v
+-----------------+ +-----------------+       +-----------------+ +-----------------+
| PostgreSQL DB   | | PostgreSQL DB   |       | PostgreSQL DB   | | PostgreSQL DB   |
|  (identity_db)  | |(scholarship_db) |       |(application_db) | |  (review_db)    |
+-----------------+ +-----------------+       +--------+--------+ +-----------------+
                                                       |
                                                       v
                                              +-----------------+
                                              | MongoDB GridFS  |
                                              | (documents col) |
                                              +-----------------+
```

---

## 2. Microservice Roster & Service Boundaries

| Service Name | Port | Primary DB / Storage | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **API Gateway** | 3000 | In-Memory Rate Store | Routing, Correlation IDs, Rate Limiting, Request Logging, Security headers |
| **Identity Service** | 3001 | PostgreSQL (`identity_db`) | User authentication (JWT), RBAC (Student/Reviewer/Admin), Student profiles, Session auditing |
| **Scholarship Service** | 3002 | PostgreSQL (`scholarship_db`) | Scholarship catalog, Eligibility criteria, ETag caching, XML content negotiation, GraphQL, SOAP WSDL |
| **Application Service** | 3003 | PostgreSQL (`application_db`) + MongoDB GridFS | Application lifecycle, Multi-part document upload, GridFS blob storage, Idempotency, Outbox events |
| **Review Service** | 3004 | PostgreSQL (`review_db`) | Scrutiny review desk, Document verification, Eligibility decision engine, Async callback sync |

---

## 3. Communication Patterns

1. **Synchronous REST APIs**:
   - Standard CRUD operations using JSON payloads, HTTP status codes, and URI hierarchy.
2. **GraphQL Queries**:
   - Available on `/graphql` via Scholarship Service and forwarded through API Gateway. Enables client-specified querying of scholarship cards and metadata.
3. **SOAP / WSDL Integration**:
   - WSDL published at `/soap/wsdl`.
   - SOAP endpoint at `/soap/eligibility` processing XML Envelopes for automated student eligibility calculation.
4. **Resilient Inter-Service Callbacks**:
   - Review decisions synchronize with Application Service via authenticated REST callbacks with timeout protection and pending retry queues.
5. **MongoDB GridFS Storage**:
   - Binary document storage (PDFs, certificates) streamed into MongoDB GridFS bucket (`scholarship_documents`), with fallback to encrypted local storage.
