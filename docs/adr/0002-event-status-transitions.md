# 0002. Event status transitions from the judging queue

Date: 2026-11-28

Status: Accepted

Issue: BESTCAT-89

## Context

The schedule shows each event's status. Keep that status in sync with the judging queue.

## Decision

A [Payload hook](../../src/collections/CatEventEntries.ts) updates event status when a queue entry is saved.

- Start a `planned` event when an entry is saved as `called`, `exhibited`, or `rated`.
- Finish an `ongoing` event when an entry is saved as `rated` or `absent`, every entry is in one of
  those two states, and at least one entry is `rated`.

SQLite checks the queue and marks the event `finished` in a single statement.

## Consequences

- A failed event update can leave the saved entry and the event out of sync because SQLite
  transactions are disabled in the current configuration.
- Automatic transitions only move forward. Recalling an absent cat or returning it to `waiting`
  can leave an active entry in a `finished` event.
