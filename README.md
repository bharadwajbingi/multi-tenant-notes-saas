
<img width="1921" height="736" alt="image" src="https://github.com/user-attachments/assets/b2c49788-6fe6-4527-96f4-02adf8b4c02d" />
<img width="2140" height="1353" alt="image" src="https://github.com/user-attachments/assets/79ad3e4d-f48d-44da-b36a-e95f65495950" />


# Multi-Tenant SaaS Notes Application

A full-stack multi-tenant Notes SaaS application built with the MERN stack (MongoDB, Express, React, Node).
The application serves multiple companies (tenants) while enforcing strict data isolation, role-based access control, and subscription-based feature gating (Free vs Pro).

---

## Features

- Multi-tenant architecture (shared schema with tenant ID)
- JWT authentication and role-based authorization (Admin, Member)
- Notes CRUD API with tenant isolation
- Subscription gating: Free plan (max 3 notes per tenant), Pro plan (unlimited)
- Admin features: invite users, upgrade tenant subscription
- Minimal responsive frontend (React + Vite)
- Health endpoint and CORS enabled for frontend/back-end communication
- Seeded test accounts for quick validation

---

## Architecture

### Backend

- **Stack:** Node.js, Express.js, MongoDB (Mongoose)
- **Auth:** JWT (JSON Web Tokens). Tokens are issued on login and must be sent in `Authorization: Bearer <token>` header.
- **Database approach:** **Shared schema with tenant ID column** — all records live in the same database and in the same collections, but every record (users, notes, etc.) includes a `tenant` (or `tenantId`) reference to enforce isolation.

**Benefits of shared schema (tenant ID)**

- Simple to implement and maintain.
- Lower resource overhead (single DB connection, single set of collections).
- Easier to query across tenants for analytics (with proper safeguards).

**Trade-offs**

- Requires careful query scoping to avoid accidental cross-tenant access.
- Less isolation than schema-per-tenant or db-per-tenant (higher blast radius if DB is compromised).
- May require additional indexing for multi-tenant scale.

---

### Frontend

- **Stack:** React.js (Vite)
- **Styling:** Clean, neutral, and modern responsive UI. Focus on usability for both Admin and Member roles.
- **Key UI Pages:**

  - Login
  - Dashboard (tenant + role info, quick actions)
  - Notes list (create / view / edit / delete)
  - Invite user (Admin only)
  - Upgrade tenant plan (Admin only)

---

## API Endpoints

> All endpoints that require authentication expect an `Authorization: Bearer <token>` header.

### Health

- `GET /health`
  Response: `200 OK`

  ```json
  { "status": "ok" }
  ```

### Authentication

- `POST /api/login`
  Request body:

  ```json
  { "email": "admin@acme.test", "password": "password" }
  ```

  Response:

  ```json
  {
    "token": "<jwt>",
    "user": {
      "email": "admin@acme.test",
      "role": "Admin",
      "tenant": { "slug": "acme", "plan": "Free" }
    }
  }
  ```

### Users / Invite (Admin only)

- `POST /api/users/invite`
  Accessible only by Admins. Invite a new user for the Admin's tenant. The backend may auto-generate an email using the format `username@<tenant>.test`.

  - Request body:

    ```json
    { "username": "bunny", "role": "Member" }
    ```

  - Example behavior: creates `bunny@acme.test` (password can be set to default "password" for testing or an invitation flow can be used).

### Notes (tenant-scoped)

- `POST /api/notes` — Create a note
  Request body:

  ```json
  { "title": "My note", "content": "Note body" }
  ```

  Business rule: If tenant plan is **Free** and the tenant already has 3 notes, request returns `403` with a message to upgrade.

- `GET /api/notes` — List all notes for the authenticated user's tenant
  Response: array of note objects.

- `GET /api/notes/:id` — Get a specific note (must belong to the user's tenant)

- `PUT /api/notes/:id` — Update a note (tenant enforcement applies)

- `DELETE /api/notes/:id` — Delete a note (tenant enforcement applies)

### Tenant subscription

- `POST /api/tenants/:slug/upgrade` — Upgrade tenant plan to **Pro** (Admin only). After upgrade, note limit is lifted immediately.

---

## Test Accounts

> All test accounts use **password:** `password`

| Email                                         | Role   | Tenant |
| --------------------------------------------- | ------ | ------ |
| [admin@acme.test](mailto:admin@acme.test)     | Admin  | Acme   |
| [user@acme.test](mailto:user@acme.test)       | Member | Acme   |
| [admin@globex.test](mailto:admin@globex.test) | Admin  | Globex |
| [user@globex.test](mailto:user@globex.test)   | Member | Globex |

---

## Getting Started (Local Development)

> **Important:** Never commit real secrets into source control. Use environment variables (`.env`) and a secure secret manager in production.

### Prerequisites

- Node.js 18+ (recommended)
- npm (or yarn)
- MongoDB Atlas account (or local MongoDB)
- Ports: backend default `4000`, frontend default `3000`

### 1. Clone repository

```bash
git clone <repo-url>
cd <repo-root>
```

The project is structured as:

```
/backend
/frontend
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create `.env` file in `backend/` and **do not include secrets in source control**:

```env
# backend/.env
MONGO_URI=<your-mongodb-uri-here>
JWT_SECRET=<strong_random_secret_here>
PORT=4000
```

Start backend:

```bash
npm run dev
# or
node server.js
```

The server typically seeds initial tenants and test accounts on startup (check seed logic in server code).

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create `.env` in `frontend/`:

```env
# frontend/.env
VITE_API_URL=http://localhost:4000
```

Start frontend:

```bash
npm run dev
# opens http://localhost:3000
```

### 4. Quick manual test (curl)

- Login:

```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.test","password":"password"}'
```

- Use token from login to create a note:

```bash
curl -X POST http://localhost:4000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"title":"Hello","content":"This is a note"}'
```

---

## CORS & Deployment Notes

- Backend enables CORS. For local development, ensure the backend allows `http://localhost:3000`.
- For production deployments on Vercel (backend and frontend), set `VITE_API_URL` to your backend's public URL, configure environment variables in Vercel dashboard (MONGO_URI, JWT_SECRET), and confirm CORS settings to allow your frontend domain.
- Health check: `GET /health` should return `{ "status": "ok" }`.

---

## Security & Best Practices

- **Do not commit** `MONGO_URI`, `JWT_SECRET`, or other secrets into version control.
- Use a long, random `JWT_SECRET` (at least 32+ characters using a cryptographic-grade RNG).
- Rotate secrets if accidentally exposed.
- Consider rate limiting, input validation, and logging for production readiness.
- For production tenants, prefer network/IP ACLs for MongoDB, and consider schema-per-tenant or DB-per-tenant if regulatory/isolation needs demand it.

---

## Implementation Notes (reference)

- **Multi-tenant enforcement:** Every query filters by `tenantId` (or `tenant` reference) obtained from the JWT. Example JWT payload should include `tenantId` and `tenantSlug` so middleware can validate ownership.
- **Free Plan gating:** The POST notes route checks tenant plan and current note count before permitting creation.
- **Invite flow:** `POST /api/users/invite` should be protected by admin middleware. For simple testing, invited users may be created with a default password `password` and should be required to reset it in a real app.

---

## Troubleshooting

- **`querySrv ENOTFOUND` (MongoDB Atlas SRV DNS issue):** Use Atlas’s non-SRV (standard) connection string or ensure local DNS allows SRV records.
- **CORS errors:** Ensure backend CORS settings include your frontend origin (or use `app.use(cors())` during local dev).
- **Tailwind / Vite issues:** If using Vite + Tailwind, ensure correct `postcss` + `tailwindcss` versions and that `postcss.config.js` is configured appropriately.

---

## License & Contributing

- This README and project template are provided as-is. If you plan to open the project for contributions, add a `CONTRIBUTING.md` and clear guidelines for PRs, code style, testing, and environment configuration.

---

## A final note

This README is intended as a complete, copy-ready document to accompany the project. Before publishing or deploying, replace placeholder environment values with secure credentials configured in your hosting provider (for example, Vercel Environment Variables), and ensure you remove any test or demo secrets from code and configura
