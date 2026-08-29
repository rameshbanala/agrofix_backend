# AgroFix Backend

Express + PostgreSQL API for the AgroFix bulk produce ordering marketplace.

## Architecture

```
src/
├── app.js                # Express app: middleware + route wiring
├── index.js              # Entry point — starts the HTTP server
├── config/
│   ├── env.js             # Centralized, validated environment config
│   └── db.js              # PostgreSQL connection pool
├── routes/                # Thin route definitions (path -> middleware -> controller)
├── controllers/           # Request/response handling, no business logic
├── services/               # Business logic + SQL queries
├── validators/            # Joi request-validation schemas
├── middleware/
│   ├── auth.js             # JWT authentication + admin authorization
│   ├── validate.js         # Generic Joi-schema validation middleware
│   ├── errorHandler.js     # Central error + 404 handling
│   └── rateLimiters.js     # Rate limiting for auth endpoints
└── utils/                 # ApiError, asyncHandler, sendEmail
```

Request flow: `routes` wire a path to `middleware` (auth/validation) and a `controller`.
Controllers parse the request and delegate to `services`, which hold all business logic and
database access. Errors — expected (`ApiError`) or not — flow to the central error handler in
`app.js` instead of being handled ad hoc in every route.

## Setup

```bash
npm install
cp .env.example .env   # fill in DB/JWT/email values
npm run dev             # nodemon, auto-restarts
npm start                # plain node, for production
```

See `.env.example` for all required/optional environment variables.

## Notable security/architecture fixes in this pass

- `POST /auth/admin/signup` now requires an authenticated admin's token (it was previously
  unauthenticated, allowing anyone to create an admin account).
- Password-reset tokens are generated with `crypto.randomBytes` instead of `Math.random()`.
- `/auth/forgot-password` no longer reveals whether an email is registered.
- Centralized error handling — raw database error messages are no longer leaked to clients.
- Request validation via Joi on every route (previously installed but unused).
- `helmet`, a CORS allowlist (was previously wide open), and rate limiting on auth endpoints.
- Order listing endpoints use a single aggregated SQL query instead of one query per order (N+1).
- Placing an order locks the relevant product rows (`SELECT ... FOR UPDATE`) to prevent a race
  condition where concurrent orders could oversell stock.
- Fixed a bug where cancelling an order that failed validation left a transaction open on the
  connection before it was returned to the pool.
