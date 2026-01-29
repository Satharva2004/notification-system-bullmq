# System Architecture

## Overview
```
┌─────────────────────────────────────────────────────────────────────┐
│                        Notification System                          │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│   Client     │────────▶│  Express API │────────▶│    Redis     │
│ (HTTP/REST)  │         │   (app.js)   │         │  (ioredis)   │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
                                │                         │
                                │                         │
                                ▼                         ▼
                         ┌──────────────┐         ┌──────────────┐
                         │              │         │              │
                         │ Queue Service│◀────────│   BullMQ     │
                         │ (queueSvc.js)│         │    Queue     │
                         │              │         │              │
                         └──────────────┘         └──────────────┘
                                                          │
                                                          │
                                                          ▼
                         ┌──────────────┐         ┌──────────────┐
                         │              │         │              │
                         │Worker Service│◀────────│   BullMQ     │
                         │(workerSvc.js)│         │   Worker     │
                         │              │         │              │
                         └──────────────┘         └──────────────┘
                                │
                                │
                ┌───────────────┼───────────────┬───────────────┐
                │               │               │               │
                ▼               ▼               ▼               ▼
         ┌──────────┐    ┌──────────┐   ┌──────────┐   ┌──────────┐
         │  Email   │    │   SMS    │   │   Push   │   │ Webhook  │
         │ Service  │    │ Service  │   │ Service  │   │ Service  │
         └──────────┘    └──────────┘   └──────────┘   └──────────┘
```

## Request Flow

### 1. Create Notification
```
Client ──POST──▶ API Endpoint ──validate──▶ Controller
                                                │
                                                ▼
                                         Queue Service
                                                │
                                                ▼
                                         Add to Redis Queue
                                                │
                                                ▼
                                         Return Job ID
```

### 2. Process Notification
```
Worker ──poll──▶ Redis Queue ──get job──▶ Worker Service
                                                │
                                                ▼
                                         Process Job
                                                │
                                                ▼
                                    ┌───────────┴───────────┐
                                    │                       │
                              Success                    Failure
                                    │                       │
                                    ▼                       ▼
                            Mark Complete              Retry (3x)
                                    │                       │
                                    ▼                       ▼
                            Send Notification      Exponential Backoff
```

## Component Details

### 1. Redis Connection (`src/models/Redis.js`)
- **Purpose**: Centralized Redis connection management
- **Pattern**: Singleton
- **Features**:
  - Auto-reconnect with retry strategy
  - Event-based logging
  - BullMQ compatibility
  - Graceful disconnect

### 2. Queue Service (`src/services/queueService.js`)
- **Purpose**: Manage notification queue
- **Features**:
  - Add single/bulk notifications
  - Schedule delayed notifications
  - Job priority management
  - Queue statistics
  - Pause/resume queue
  - Clean old jobs

### 3. Worker Service (`src/services/workerService.js`)
- **Purpose**: Process queued notifications
- **Features**:
  - Multi-channel processing (email, SMS, push, webhook)
  - Concurrency control (5 jobs)
  - Rate limiting (10 jobs/sec)
  - Automatic retry (3 attempts)
  - Event-based monitoring

### 4. API Layer (`src/app.js`, `src/controllers/`)
- **Purpose**: HTTP interface for clients
- **Endpoints**:
  - POST `/notifications` - Create notification
  - POST `/notifications/bulk` - Bulk create
  - GET `/notifications/jobs/:id` - Job status
  - GET `/notifications/queue/stats` - Queue stats
  - DELETE `/notifications/jobs/:id` - Cancel job

## Data Flow

### Job Lifecycle
```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│         │    │         │    │         │    │         │    │         │
│ Waiting │───▶│ Active  │───▶│Processing│──▶│Completed│───▶│ Removed │
│         │    │         │    │         │    │         │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │
     │              │              ▼
     │              │         ┌─────────┐
     │              │         │         │
     │              └────────▶│ Failed  │
     │                        │         │
     │                        └─────────┘
     │                             │
     │                             ▼
     │                        ┌─────────┐
     │                        │         │
     │                        │  Retry  │──┐
     │                        │         │  │
     │                        └─────────┘  │
     │                             ▲       │
     │                             │       │
     │                             └───────┘
     │                          (max 3 times)
     │
     ▼
┌─────────┐
│         │
│ Delayed │
│         │
└─────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────┐
│           Application Layer             │
├─────────────────────────────────────────┤
│  Express.js (Web Framework)             │
│  - Routes                               │
│  - Controllers                          │
│  - Middlewares                          │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Business Logic Layer           │
├─────────────────────────────────────────┤
│  Services                               │
│  - Queue Service (BullMQ)               │
│  - Worker Service (BullMQ)              │
│  - Notification Service                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│            Data Layer                   │
├─────────────────────────────────────────┤
│  Redis (ioredis)                        │
│  - Queue Storage                        │
│  - Job State Management                 │
│  - Pub/Sub for Workers                  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         External Services               │
├─────────────────────────────────────────┤
│  - Email Provider (e.g., SendGrid)      │
│  - SMS Provider (e.g., Twilio)          │
│  - Push Provider (e.g., Firebase)       │
│  - Webhook Endpoints                    │
└─────────────────────────────────────────┘
```

## Scalability

### Horizontal Scaling
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Worker 1 │     │ Worker 2 │     │ Worker N │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Redis Queue  │
              └───────────────┘
                      ▲
                      │
     ┌────────────────┼────────────────┐
     │                │                │
┌────┴─────┐     ┌────┴─────┐     ┌────┴─────┐
│  API 1   │     │  API 2   │     │  API N   │
└──────────┘     └──────────┘     └──────────┘
```

### Load Balancing
- Multiple API instances behind load balancer
- Multiple worker instances processing jobs
- Redis as central queue coordinator

## Configuration

### Queue Configuration
```javascript
{
  attempts: 3,              // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',    // Exponential backoff
    delay: 2000             // Start with 2 seconds
  },
  removeOnComplete: {
    count: 100,             // Keep last 100 completed
    age: 24 * 3600          // Keep for 24 hours
  }
}
```

### Worker Configuration
```javascript
{
  concurrency: 5,           // Process 5 jobs at once
  limiter: {
    max: 10,                // Max 10 jobs
    duration: 1000          // per 1 second
  }
}
```

## Monitoring Points

1. **Queue Metrics**:
   - Waiting jobs count
   - Active jobs count
   - Completed jobs count
   - Failed jobs count
   - Delayed jobs count

2. **Worker Metrics**:
   - Jobs processed per second
   - Average processing time
   - Success rate
   - Failure rate

3. **System Health**:
   - Redis connection status
   - Worker status (running/paused)
   - API response times

## Error Handling

```
Job Processing
      │
      ▼
  Try Execute
      │
      ├──Success──▶ Mark Complete
      │
      └──Failure──▶ Attempt < 3?
                         │
                    ├──Yes──▶ Retry with Backoff
                    │
                    └──No───▶ Mark Failed
```

## Security Considerations

1. **Input Validation**: All inputs validated before queuing
2. **Rate Limiting**: Worker rate limiting prevents overload
3. **Error Isolation**: Failed jobs don't affect other jobs
4. **Graceful Shutdown**: Proper cleanup on termination

## Future Enhancements

1. **Dead Letter Queue**: For permanently failed jobs
2. **Job Prioritization**: Multiple priority levels
3. **Scheduled Jobs**: Cron-like scheduling
4. **Job Dependencies**: Chain jobs together
5. **Monitoring Dashboard**: Visual queue monitoring
6. **Metrics Export**: Prometheus/Grafana integration
