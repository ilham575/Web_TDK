# Local Docker Compose Setup (web_tdk_server)

This guide explains how to run the backend locally using a development Dockerfile and docker-compose.

Prerequisites:
- Docker and Docker Compose installed

Quick start:

1. Copy example environment file if you want to keep your local secrets separate:

```bash
cp .env.local .env.local
# Edit `.env.local` values as needed
```

2. Build and run using docker-compose:

```bash
# From web_tdk_server folder
docker compose up --build
```

3. The backend should be available at http://localhost:8080

Notes:
- This configuration uses MySQL 8.0 (image `mysql:8.0`) for local development and maps database host to the `db` container.
- The container mounts the current working directory into `/app` so code changes will be visible to the running container and uvicorn runs in `--reload` mode.
- If you want to persist data across runs, the `db_data` volume persists MySQL data.

Clean up:

```bash
# Stop and remove containers
docker compose down
# Remove volumes (data will be lost)
docker compose down -v
```

Security:
- The local `JWT_SECRET_KEY` and database passwords are kept in `.env.local` (not committed). Keep secure values out of version control in production.
