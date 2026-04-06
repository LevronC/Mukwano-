# Railway API Deployment Setup

## Railway API Configuration

### Required Environment Variables on Railway:

Set these in your Railway project dashboard:

```bash
DATABASE_URL=postgresql://... # Your Neon DB URL
JWT_SECRET=<your-secret-key>
REFRESH_TOKEN_SECRET=<your-refresh-secret>
DEMO_MODE=true
PORT=4000  # Railway will override this, but keep for consistency
CORS_ORIGIN=https://mukwano.vercel.app  # Your Vercel frontend URL
```

### Railway Build & Start Commands:

**IMPORTANT**: Deploy from the repository **root**, not `packages/api`.

The `railway.toml` is configured to:
- **Build**: `npm install && npm run build:api` (runs Prisma generate + TypeScript build)
- **Start**: `node packages/api/dist/server.js` (direct Node.js execution)

**Critical**: Railway must have `DATABASE_URL` set as an environment variable **during the build phase** because `prisma generate` runs during the build.

### Railway Configuration (already in `railway.toml`):

```toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build:api"

[deploy]
startCommand = "node packages/api/dist/server.js"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

## Frontend Configuration

### For Vercel Deployment:

1. **Set Environment Variable in Vercel Dashboard**:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-railway-app.up.railway.app/api/v1`

2. **Or Update `.env.production`** (already created):
   ```bash
   VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api/v1
   ```

### Local Development (unchanged):

Vite uses `.env.example` or defaults to proxy:
```bash
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Deployment Checklist:

- [ ] Railway API deployed with environment variables set
- [ ] Railway API URL obtained (e.g., `https://mukwano-api-production.up.railway.app`)
- [ ] Update `packages/web/.env.production` with your Railway URL
- [ ] Update `CORS_ORIGIN` on Railway to match your Vercel URL
- [ ] Test: `curl https://your-railway-app.up.railway.app/api/v1/config`
- [ ] Deploy frontend to Vercel
- [ ] Verify frontend can reach API (check browser network tab)

## Testing Railway API:

```bash
# Health check (if you have one)
curl https://your-railway-app.up.railway.app/api/v1/config

# Expected response:
# {"demoMode":true,"currency":"USD","escrowLabel":"Simulated Escrow"}
```

## Common Issues:

1. **CORS errors**: Make sure `CORS_ORIGIN` on Railway matches your Vercel URL exactly
2. **404 on API routes**: Verify Railway start command is `npm run start` not `npm run dev`
3. **Database connection**: Ensure Neon DATABASE_URL is set on Railway with `sslmode=require`
