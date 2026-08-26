# Document Vault – GraphQL API

A backend API for managing collections and documents using Bun, TypeScript, GraphQL Yoga, PostgreSQL, and Prisma.

## Tech Stack

- Bun + TypeScript
- GraphQL Yoga
- PostgreSQL
- Prisma
- Docker Compose

## Setup

Start PostgreSQL:

```bash
docker compose up -d
```

Install dependencies:
```bash
bun install
```

Generate database and run migrations:
```bash
bun run gendb
```

Start the server:
```bash
bun run dev
```

GraphQL API:
http://localhost:4000/graphql


# Testing:
Run all tests:
```bash
bun test
```

Run type checking:
```bash
bun run typecheck
```


## Features
- Create and manage collections
- Create, update and delete documents
- Move documents between collections
- Search documents by title or content
- Filter by collection and archived state
- Cursor-based pagination
- Input validation with GraphQL errors
- Unit and PostgreSQL integration tests


## Design Notes
The API uses a schema-first GraphQL approach with Prisma for database access.
PostgreSQL runs through Docker Compose, and all database schema changes are managed using Prisma migrations.

Authentication, permissions, caching, federation, and deployment are intentionally out of scope as required by the assignment.

## Future Improvements
The design could later be extended with authentication, authorization, full-text search, improved pagination metadata, and deployment configuration.
