# ApexScholar API Contracts

ApexScholar exposes RESTful, GraphQL, and SOAP interfaces. All endpoints can be routed directly or via the API Gateway (`http://localhost:3000`).

---

## 1. Unified API Gateway (`http://localhost:3000`)

| Method | Gateway Path | Upstream Target | Auth Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Gateway Local Health | None |
| `POST` | `/api/v1/auth/register` | Identity Service (`:3001`) | None (Auth Rate Limited) |
| `POST` | `/api/v1/auth/login` | Identity Service (`:3001`) | None (Auth Rate Limited) |
| `GET` | `/api/v1/auth/me` | Identity Service (`:3001`) | `Bearer <JWT>` |
| `GET` | `/api/v1/profile` | Identity Service (`:3001`) | `Bearer <JWT>` |
| `GET` | `/api/v1/scholarships` | Scholarship Service (`:3002`) | None (Public, ETag, XML) |
| `POST` | `/api/v1/scholarships` | Scholarship Service (`:3002`) | `Bearer <JWT>` (`admin`) |
| `POST` | `/graphql` | Scholarship Service (`:3002`) | None / Optional |
| `GET` | `/soap/wsdl` | Scholarship Service (`:3002`) | None |
| `POST` | `/soap/eligibility` | Scholarship Service (`:3002`) | None (SOAP Envelope) |
| `GET` | `/api/v1/applications` | Application Service (`:3003`) | `Bearer <JWT>` |
| `POST` | `/api/v1/applications` | Application Service (`:3003`) | `Bearer <JWT>` |
| `POST` | `/api/v1/applications/:id/documents` | Application Service (`:3003`) | `Bearer <JWT>` (Multipart) |
| `GET` | `/api/v1/documents/:docId/download` | Application Service (`:3003`) | `Bearer <JWT>` |
| `GET` | `/api/reviews` or `/api/v1/reviews` | Review Service (`:3004`) | `Bearer <JWT>` (`reviewer`) |
| `PATCH` | `/api/reviews/:id/decision` | Review Service (`:3004`) | `Bearer <JWT>` (`reviewer`) |

---

## 2. Interactive Swagger UI Documentation

Every service includes an OpenAPI 3.0 specification file and a Swagger UI explorer mounted at `/api-docs`:

- **Identity Service**: `http://localhost:3001/api-docs`
- **Scholarship Service**: `http://localhost:3002/api-docs`
- **Application Service**: `http://localhost:3003/api-docs`
- **Review Service**: `http://localhost:3004/api-docs`

---

## 3. Rate Limiting Headers

The API Gateway injects standard rate limiting telemetry headers on every response:
- `X-RateLimit-Limit`: Maximum permitted requests per 15-minute window (default: 100).
- `X-RateLimit-Remaining`: Remaining allowance for the requesting IP.
- `X-RateLimit-Reset`: UTC epoch timestamp indicating quota reset time.

---

## 4. HTTP Caching & Content Negotiation Headers

- `ETag`: `"hash-value"` returned on GET `/api/v1/scholarships` and `/api/v1/scholarships/:id`.
- `If-None-Match`: Client may supply previous ETag. Service responds with `304 Not Modified` without re-transmitting data.
- `Accept: application/xml`: Service responds with XML payload `<scholarships>...</scholarships>`.
