# API Testing Examples

This file contains example requests for testing the Notification System API.

## Base URL
```
http://localhost:3000/api/v1/notifications
```

---

## 1. Send Email Notification

### Request
```http
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "userId": "user123",
  "type": "welcome",
  "title": "Welcome to Our Platform!",
  "message": "Thank you for signing up. We're excited to have you!",
  "channel": "email",
  "recipient": "user@example.com",
  "priority": 1,
  "metadata": {
    "source": "signup-flow",
    "template": "welcome-email"
  }
}
```

---

## 2. Send SMS Notification

### Request
```http
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "userId": "user456",
  "type": "verification",
  "title": "Verification Code",
  "message": "Your verification code is: 123456",
  "channel": "sms",
  "recipient": "+1234567890",
  "priority": 1
}
```

---

## 3. Send Push Notification

### Request
```http
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "userId": "user789",
  "type": "reminder",
  "title": "Meeting Reminder",
  "message": "Your meeting with John starts in 15 minutes",
  "channel": "push",
  "recipient": "device-token-abc123",
  "priority": 2,
  "metadata": {
    "meetingId": "meeting-123",
    "action": "view-meeting"
  }
}
```

---

## 4. Send Webhook Notification

### Request
```http
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "userId": "system",
  "type": "webhook",
  "title": "Order Completed",
  "message": "Order #12345 has been completed",
  "channel": "webhook",
  "recipient": "https://example.com/webhooks/orders",
  "priority": 1,
  "metadata": {
    "orderId": "12345",
    "status": "completed",
    "total": 99.99
  }
}
```

---

## 5. Schedule Notification (5 seconds delay)

### Request
```http
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "userId": "user123",
  "type": "reminder",
  "title": "Scheduled Reminder",
  "message": "This notification was scheduled for 5 seconds from now",
  "channel": "email",
  "recipient": "user@example.com",
  "delay": 5000
}
```

---

## 6. Send Bulk Notifications

### Request
```http
POST http://localhost:3000/api/v1/notifications/bulk
Content-Type: application/json

{
  "notifications": [
    {
      "userId": "user1",
      "title": "Promotion Alert",
      "message": "50% off on all items!",
      "channel": "email",
      "recipient": "user1@example.com",
      "priority": 2
    },
    {
      "userId": "user2",
      "title": "Promotion Alert",
      "message": "50% off on all items!",
      "channel": "sms",
      "recipient": "+1234567890",
      "priority": 2
    },
    {
      "userId": "user3",
      "title": "Promotion Alert",
      "message": "50% off on all items!",
      "channel": "push",
      "recipient": "device-token-xyz",
      "priority": 2
    }
  ]
}
```

---

## 7. Get Job Status

### Request
```http
GET http://localhost:3000/api/v1/notifications/jobs/1
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "jobId": "1",
    "state": "completed",
    "progress": 100,
    "data": {
      "userId": "user123",
      "title": "Welcome to Our Platform!",
      "message": "Thank you for signing up.",
      "channel": "email",
      "recipient": "user@example.com"
    },
    "attemptsMade": 1,
    "finishedOn": 1706543210000,
    "processedOn": 1706543200000
  }
}
```

---

## 8. Get Queue Statistics

### Request
```http
GET http://localhost:3000/api/v1/notifications/queue/stats
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 100,
    "failed": 3,
    "delayed": 1,
    "total": 111
  }
}
```

---

## 9. Cancel a Job

### Request
```http
DELETE http://localhost:3000/api/v1/notifications/jobs/5
```

### Expected Response
```json
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

---

## 10. Health Check

### Request
```http
GET http://localhost:3000/
```

### Expected Response
```json
{
  "message": "Notification System API",
  "version": "v1",
  "status": "running"
}
```

---

## Testing with cURL

### Send Email Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test Email",
    "message": "This is a test email notification",
    "channel": "email",
    "recipient": "test@example.com"
  }'
```

### Get Queue Stats
```bash
curl http://localhost:3000/api/v1/notifications/queue/stats
```

### Get Job Status
```bash
curl http://localhost:3000/api/v1/notifications/jobs/1
```

---

## Testing with PowerShell (Windows)

### Send Email Notification
```powershell
$body = @{
    userId = "user123"
    title = "Test Email"
    message = "This is a test email notification"
    channel = "email"
    recipient = "test@example.com"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/notifications" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

### Get Queue Stats
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/notifications/queue/stats"
```

---

## Expected Console Output

When you send a notification, you should see output like this in your terminal:

```
📬 Notification job added to queue: 1
🔄 Job 1 is now active
🔄 Processing notification job 1: {
  userId: 'user123',
  type: 'welcome',
  title: 'Welcome to Our Platform!',
  message: 'Thank you for signing up.',
  channel: 'email',
  recipient: 'user@example.com'
}
📧 Sending email to user@example.com:
   Subject: Welcome to Our Platform!
   Message: Thank you for signing up.
✅ Notification job 1 completed successfully
✅ Job 1 completed: {
  success: true,
  jobId: '1',
  channel: 'email',
  recipient: 'user@example.com',
  processedAt: '2026-01-30T01:30:00.000Z'
}
```

---

## Notes

- Replace `localhost:3000` with your actual server URL if different
- Job IDs are auto-generated by BullMQ
- All timestamps are in Unix milliseconds
- Priority: Lower number = higher priority (1 is highest)
- Delay is in milliseconds (5000 = 5 seconds)
