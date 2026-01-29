# Notification System - System Architecture

## Overview

The notification system is a scalable, queue-based architecture for processing multi-channel notifications (email, SMS, push, webhook) using Redis and BullMQ.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Notification System                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP   │              │  ioredis│              │
│   Client     ├────────►│  Express API ├────────►│    Redis     │
│ (HTTP/REST)  │         │   (app.js)   │         │   (Store)    │
│              │         │              │         │              │
└──────────────┘         └──────┬───────┘         └──────┬───────┘
                                │                        │
                                │ Enqueue                │ Poll
                                ▼                        ▼
                         ┌──────────────┐         ┌──────────────┐
                         │    Queue     │         │    BullMQ    │
                         │   Service    │◄────────┤     Queue    │
                         │ (queueSvc.js)│         │   (Jobs)     │
                         └──────────────┘         └──────┬───────┘
                                                         │
                                                         │ Process
                                                         ▼
                         ┌──────────────┐         ┌──────────────┐
                         │    Worker    │         │    BullMQ    │
                         │   Service    │◄────────┤    Worker    │
                         │(workerSvc.js)│         │  (Consumer)  │
                         └──────┬───────┘         └──────────────┘
                                │
                                │ Dispatch
                                │
                ┌───────────────┼───────────────┬───────────────┐
                │               │               │               │
                ▼               ▼               ▼               ▼
         ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
         │  Email   │    │   SMS    │   │   Push   │   │ Webhook  │
         │ Service  │    │ Service  │   │ Service  │   │ Service  │
         └──────────┘    └──────────┘   └──────────┘   └──────────┘
```

---

## Request Flow

### 1. Create Notification Request

```
┌────────┐                                                    ┌──────────┐
│ Client │                                                    │  Redis   │
└───┬────┘                                                    └────┬─────┘
    │                                                              │
    │ POST /api/notifications                                      │
    ├─────────────────────────────►┌──────────────┐               │
    │                               │  API Router  │               │
    │                               └──────┬───────┘               │
    │                                      │                       │
    │                                      │ Validate              │
    │                                      ▼                       │
    │                               ┌──────────────┐               │
    │                               │  Controller  │               │
    │                               └──────┬───────┘               │
    │                                      │                       │
    │                                      │ Enqueue               │
    │                                      ▼                       │
    │                               ┌──────────────┐               │
    │                               │Queue Service │               │
    │                               └──────┬───────┘               │
    │                                      │                       │
    │                                      │ queue.add()           │
    │                                      ├───────────────────────►
    │                                      │                       │
    │                                      │◄──────────────────────┤
    │                                      │   Job ID              │
    │                                      │                       │
    │                               ┌──────┴───────┐               │
    │        { jobId: "123" }       │   Response   │               │
    │◄──────────────────────────────┤              │               │
    │                               └──────────────┘               │
    │                                                              │
```

### 2. Process Notification

```
┌────────┐                                                   ┌──────────┐
│ Worker │                                                   │  Redis   │
└───┬────┘                                                   └────┬─────┘
    │                                                             │
    │ Poll for jobs                                               │
    ├─────────────────────────────────────────────────────────────►
    │                                                             │
    │◄────────────────────────────────────────────────────────────┤
    │                          Job data                           │
    │                                                             │
    │                                                             │
    ├────┐                                                        │
    │    │ Process job                                            │
    │◄───┘                                                        │
    │                                                             │
    │         ┌──────────────────┐                                │
    │         │  Send via:       │                                │
    │         │  - Email         │                                │
    │         │  - SMS           │                                │
    │         │  - Push          │                                │
    │         │  - Webhook       │                                │
    │         └──────────────────┘                                │
    │                                                             │
    │                                                             │
    ├─────────────────────────┐                                   │
    │                         │                                   │
    │                    Success?                                 │
    │                         │                                   │
    │         ┌───────────────┴───────────────┐                   │
    │         │                               │                   │
    │         ▼                               ▼                   │
    │      YES                              NO                    │
    │         │                               │                   │
    │         │ Mark complete                 │ Retry (max 3x)    │
    │         ├───────────────────────────────┼───────────────────►
    │         │                               │                   │
    │         │                               │ Exponential       │
    │         │                               │ backoff           │
    │         │                               │                   │
    │         │                               ├─────────┐         │
    │         │                               │         │         │
    │         │                               │    Attempt < 3?   │
    │         │                               │         │         │
    │         │                               ◄─────────┘         │
    │         │                               │                   │
    │         │                               │ If max attempts   │
    │         │                               │ reached:          │
    │         │                               │ Mark failed       │
    │         │                               │                   │
```

---

## Component Details

### 1. Redis Connection (`src/models/Redis.js`)

**Purpose:** Centralized Redis connection management

**Pattern:** Singleton

**Features:**
- Auto-reconnect with exponential retry strategy
- Event-based connection logging
- BullMQ-compatible connection pooling
- Graceful disconnect on shutdown

---

### 2. Queue Service (`src/services/queueService.js`)

**Purpose:** Manage notification queue operations

**Key Features:**
- Add single or bulk notifications
- Schedule delayed notifications (future delivery)
- Job priority management
- Queue statistics and monitoring
- Pause/resume queue operations
- Clean old/stale jobs

---

### 3. Worker Service (`src/services/workerService.js`)

**Purpose:** Process queued notifications

**Key Features:**
- Multi-channel processing (email, SMS, push, webhook)
- Concurrency control (5 concurrent jobs)
- Rate limiting (10 jobs per second)
- Automatic retry with exponential backoff (3 attempts)
- Event-based monitoring and logging

---

## Job Lifecycle

```
                                    New Job Created
                                          │
                                          ▼
                                    ┌──────────┐
                                    │ WAITING  │
                                    └────┬─────┘
                                         │
                        Worker picks up job
                                         │
                                         ▼
                                    ┌──────────┐
                                    │  ACTIVE  │
                                    └────┬─────┘
                                         │
                              Worker processes job
                                         │
                                         ▼
                                    ┌──────────┐
                                    │PROCESSING│
                                    └────┬─────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │                               │
                    Success                          Failure
                         │                               │
                         ▼                               ▼
                    ┌──────────┐                   ┌──────────┐
                    │COMPLETED │                   │  FAILED  │
                    └────┬─────┘                   └────┬─────┘
                         │                               │
                         │                        Attempt < 3?
                         │                               │
                         │                     ┌─────────┴─────────┐
                         │                     │                   │
                         │                    YES                 NO
                         │                     │                   │
                         │                     ▼                   ▼
                         │                ┌──────────┐        ┌────────┐
                         │                │  RETRY   │        │  DEAD  │
                         │                └────┬─────┘        └────────┘
                         │                     │
                         │           Exponential backoff
                         │                     │
                         │                     └──────► Back to WAITING
                         │
                         │
                    After 24h or
                    100+ completed
                         │
                         ▼
                    ┌──────────┐
                    │ REMOVED  │
                    └──────────┘


DELAYED Jobs:
┌──────────┐
│ DELAYED  │  ─────► Scheduled time reached ─────► WAITING
└──────────┘
```

---

## Scaling Architecture

### Horizontal Scaling

Multiple workers and API instances can process jobs concurrently from the same Redis queue:

```
                          ┌─────────────────┐
                          │  Load Balancer  │
                          └────────┬────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
                 ▼                 ▼                 ▼
          ┌───────────┐     ┌───────────┐     ┌───────────┐
          │  API      │     │  API      │     │  API      │
          │ Instance 1│     │ Instance 2│     │ Instance N│
          └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
                │                 │                 │
                └─────────────────┼─────────────────┘
                                  │ Enqueue
                                  ▼
                          ┌───────────────┐
                          │ Redis Queue   │
                          └───────┬───────┘
                                  │ Poll
                ┌─────────────────┼─────────────────┐
                │                 │                 │
                ▼                 ▼                 ▼
          ┌───────────┐     ┌───────────┐     ┌───────────┐
          │  Worker   │     │  Worker   │     │  Worker   │
          │ Instance 1│     │ Instance 2│     │ Instance N│
          └───────────┘     └───────────┘     └───────────┘
                │                 │                 │
                │                 │                 │
                └────────┬────────┴────────┬────────┘
                         │                 │
                         ▼                 ▼
                ┌──────────────┐   ┌──────────────┐
                │ Notification │   │ Notification │
                │  Providers   │   │  Providers   │
                └──────────────┘   └──────────────┘
  ```

**Benefits:**
- Load distribution across multiple workers
- High availability (if one worker fails, others continue)
- Easy to scale up/down based on load
- No coordination needed between workers (Redis handles it)

---

## Configuration

### Queue Configuration

```javascript
{
  attempts: 3,                    // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',          // Use exponential backoff strategy
    delay: 2000                   // Start with 2 second delay
  },                              // Delays: 2s, 4s, 8s
  removeOnComplete: {
    count: 100,                   // Keep last 100 completed jobs
    age: 24 * 3600                // Remove jobs older than 24 hours
  },
  removeOnFail: {
    count: 50                     // Keep last 50 failed jobs for debugging
  }
}
```

### Worker Configuration

```javascript
{
  concurrency: 5,                 // Process 5 jobs simultaneously
  limiter: {
    max: 10,                      // Maximum 10 jobs
    duration: 1000                // Per 1 second (rate limiting)
  }
}
```

---

## Error Handling Flow

```
                    Job Picked Up by Worker
                            │
                            ▼
                    ┌───────────────┐
                    │  Try Execute  │
                    └───────┬───────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Success                      Failure
              │                           │
              ▼                           ▼
      ┌───────────────┐          ┌────────────────┐
      │Mark Complete  │          │ Attempt < 3?   │
      └───────────────┘          └────────┬───────┘
                                          │
                                ┌─────────┴─────────┐
                                │                   │
                               YES                 NO
                                │                   │
                                ▼                   ▼
                      ┌─────────────────┐   ┌──────────────┐
                      │ Retry with      │   │ Mark Failed  │
                      │ Exponential     │   │              │
                      │ Backoff         │   │ Send alert   │
                      └─────────────────┘   └──────────────┘
                                │
                                │ Delay: 2^attempt * 2000ms
                                │
                                ▼
                      ┌─────────────────┐
                      │ Re-queue Job    │
                      └─────────────────┘
```

**Retry Delays:**
- 1st retry: 2 seconds
- 2nd retry: 4 seconds  
- 3rd retry: 8 seconds
- After 3rd failure: Job marked as failed

---

## Monitoring & Observability

### Queue Metrics

```javascript
{
  waiting: 45,        // Jobs waiting to be processed
  active: 5,          // Jobs currently being processed
  completed: 1250,    // Successfully completed jobs
  failed: 12,         // Failed jobs (after all retries)
  delayed: 8          // Jobs scheduled for future
}
```

### Worker Events

```
┌─────────────┐
│Worker Events│
└──────┬──────┘
       │
       ├──► completed  : Job successfully processed
       ├──► failed     : Job failed (after retries)
       ├──► active     : Job started processing
       ├──► stalled    : Job stalled (worker died)
       ├──► error      : Worker error occurred
       └──► progress   : Job progress update
```
