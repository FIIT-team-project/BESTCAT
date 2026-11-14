# 0001. Payload API access

Date: 2026-11-14

Status: Accepted

## Context

The application accesses Payload from server-side components and also needs the built-in admin
dashboard. That dashboard requires REST endpoints for authentication and data management.

## Decision

Application code uses Payload's Local API from the server. REST is reserved for authenticated
administrators and the dashboard's sign-in, setup, password recovery, and session lookup endpoints.
Regular users may also use Payload's built-in REST auth endpoints.
GraphQL and its playground are disabled.

## Consequences

Application users access data through server-side code. Collection data REST requests from anonymous
clients and regular users return HTTP 403. GraphQL and playground requests return HTTP 404.
The admin dashboard remains available.
