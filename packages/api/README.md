# @spm/api

Registry API for SPM. Handles skill publishing, search, discovery, security scanning, and admin operations.

**Deployed to:** [registry.skillpkg.dev](https://registry.skillpkg.dev) (Cloudflare Workers)

## API Routes

All routes are prefixed with `/api/v1/`.

| Group         | Endpoints                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**      | `POST /auth/device`, `POST /auth/token`, `GET /auth/whoami`, `POST /auth/logout`                                                     |
| **Skills**    | `POST /skills` (publish), `GET /skills/:name`, `GET /skills/search`, `PATCH /skills/:name`, `DELETE /skills/:name/versions/:version` |
| **Discovery** | `GET /categories`, `GET /trending`, `GET /authors/:name`, `GET /resolve`                                                             |
| **Template**  | `GET /template`                                                                                                                      |
| **Reviews**   | `POST /skills/:name/reviews`, `GET /skills/:name/reviews`                                                                            |
| **Reports**   | `POST /reports`                                                                                                                      |
| **Admin**     | `/admin/queue`, `/admin/skills`, `/admin/reports`, `/admin/stats`, `/admin/users`                                                    |
| **SEO**       | `/robots.txt`, `/sitemap.xml`                                                                                                        |

## Development

```bash
pnpm dev           # Start local Workers dev server
pnpm test          # Run tests
pnpm typecheck     # Type check
pnpm deploy        # Deploy to production
```

### Environment Variables

Copy `.dev.vars.example` to `.dev.vars` and fill in:

- `DATABASE_URL` — Neon Postgres connection string
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth app
- `JWT_SECRET` — JWT signing key

## Stack

Hono, Drizzle ORM, Neon Postgres, Cloudflare R2 + KV, Zod validation
