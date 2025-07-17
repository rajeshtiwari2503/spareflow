# SpareFlow Shipment Tracking System

## Overview
The SpareFlow tracking system provides real-time shipment status updates by automatically calling the DTDC Track API every 2-4 hours for all dispatched boxes. The system stores tracking history and displays timeline information across Brand, Service Center, and Customer dashboards.

## Architecture

### Database Schema
- **BoxTrackingHistory**: Stores tracking events for each box
  - `boxId`: Reference to the box being tracked
  - `awbNumber`: AWB number for tracking
  - `scanCode`: DTDC scan code (BK, PU, IT, RH, OD, DL)
  - `status`: Current status (BOOKED, PICKED_UP, IN_TRANSIT, etc.)
  - `location`: Current location of the package
  - `timestamp`: When the tracking event occurred
  - `description`: Human-readable description of the event

### API Endpoints

#### Background Job System
- **`/api/tracking/background-job`**: Main background job that processes all IN_TRANSIT boxes
- **`/api/tracking/scheduled-job`**: Wrapper for external cron services (requires authentication)
- **`/api/tracking/manual-trigger`**: Manual trigger for testing purposes

#### Tracking Data Access
- **`/api/tracking/get-tracking`**: Retrieve tracking data with role-based filtering
- **`/api/tracking/customer-orders`**: Customer-specific order tracking

### DTDC Integration

#### Mock Tracking API
The system includes a comprehensive mock DTDC tracking API that simulates realistic tracking progression:

```typescript
// Tracking statuses based on package age
- BOOKED (immediate)
- PICKED_UP (after 2 hours)
- IN_TRANSIT (after 6 hours)
- REACHED_HUB (after 24 hours)
- OUT_FOR_DELIVERY (after 36 hours)
- DELIVERED (after 48 hours)
```

#### Batch Processing
- Supports tracking multiple AWBs in a single API call
- Optimized for background job efficiency
- Handles API failures gracefully

### Background Job Workflow

1. **Query**: Find all boxes with status 'IN_TRANSIT' and valid AWB numbers
2. **Track**: Call DTDC API for batch tracking
3. **Process**: Update tracking history for new events
4. **Update**: Update box status based on latest tracking info
5. **Aggregate**: Update shipment status when all boxes are delivered

### Frontend Components

#### TrackingTimeline
Displays a visual timeline of tracking events with:
- Status icons and colors
- Location information
- Timestamps
- Package contents summary
- QR codes for quick access

#### TrackingDashboard
Comprehensive dashboard featuring:
- Statistics cards (total, pending, in-transit, delivered)
- Search and filter capabilities
- Real-time status updates
- Role-based data filtering
- Timeline modal for detailed tracking

### Role-Based Access

#### Brand Dashboard
- View all shipments sent by the brand
- Track boxes across all service centers
- Monitor delivery performance
- Access to comprehensive analytics

#### Service Center Dashboard
- Track incoming shipments
- Monitor delivery status to service center
- View expected delivery times

#### Customer Dashboard
- Track D2C orders
- Real-time delivery updates
- Estimated delivery times

## Setup Instructions

### 1. Database Migration
The tracking system requires the new `BoxTrackingHistory` table. Run:
```bash
npx prisma db push
```

### 2. Environment Variables
Set up the following environment variables:
```env
CRON_SECRET=your-secure-cron-secret-here
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 3. Cron Job Setup
Set up a cron job to call the scheduled endpoint every 2-4 hours:

#### Using cron-job.org or similar service:
```
URL: https://your-domain.com/api/tracking/scheduled-job
Method: POST
Headers: Authorization: Bearer your-cron-secret
Schedule: 0 */3 * * * (every 3 hours)
```

#### Using Vercel Cron (vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/tracking/scheduled-job",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

### 4. Manual Testing
Test the system manually:
```bash
curl -X POST https://your-domain.com/api/tracking/manual-trigger
```

## Usage Examples

### Creating Trackable Shipments
1. Create shipment with boxes
2. Generate AWB numbers for boxes
3. Boxes automatically become trackable when status is 'IN_TRANSIT'

### Viewing Tracking Information
```typescript
// Get tracking for specific user
const response = await fetch('/api/tracking/get-tracking?userId=brand-1&role=BRAND');

// Get tracking by AWB
const response = await fetch('/api/tracking/get-tracking?awbNumber=DTDC123456789');

// Get customer order tracking
const response = await fetch('/api/tracking/customer-orders?customerId=customer-1');
```

### Integrating Timeline Component
```tsx
import { TrackingTimeline } from '@/components/TrackingTimeline';

<TrackingTimeline
  awbNumber="DTDC123456789"
  currentStatus="IN_TRANSIT"
  trackingHistory={trackingEvents}
  boxNumber="1"
  parts={packageContents}
/>
```

## Production Considerations

### Performance
- Background job processes boxes in batches
- Database queries are optimized with proper indexing
- API calls are rate-limited and include retry logic

### Monitoring
- Comprehensive logging for all tracking operations
- Error handling for API failures
- Success/failure metrics for background jobs

### Scalability
- Batch processing for multiple AWBs
- Efficient database queries
- Stateless background job design

### Security
- Authentication required for scheduled endpoints
- Role-based access control for tracking data
- Input validation for all API endpoints

## Troubleshooting

### Common Issues

1. **Background job not running**
   - Check cron job configuration
   - Verify CRON_SECRET environment variable
   - Check server logs for errors

2. **Tracking data not updating**
   - Verify boxes have AWB numbers
   - Check box status is 'IN_TRANSIT'
   - Review DTDC API response logs

3. **Timeline not displaying**
   - Ensure tracking history exists
   - Check component props
   - Verify API response format

### Debug Commands
```bash
# Manual trigger for testing
curl -X POST https://your-domain.com/api/tracking/manual-trigger

# Check specific box tracking
curl "https://your-domain.com/api/tracking/get-tracking?boxId=box-123"

# View customer order tracking
curl "https://your-domain.com/api/tracking/customer-orders?customerId=customer-1"
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live tracking updates
2. **Push Notifications**: SMS/Email alerts for delivery milestones
3. **Analytics Dashboard**: Delivery performance metrics and insights
4. **Predictive Delivery**: ML-based delivery time estimation
5. **Multi-carrier Support**: Integration with additional courier services

## API Reference

### Background Job Response
```json
{
  "success": true,
  "message": "Background tracking job completed",
  "processed": 15,
  "newTrackingEntries": 8,
  "updatedBoxes": 3
}
```

### Tracking Data Response
```json
{
  "success": true,
  "data": [
    {
      "boxId": "box-123",
      "boxNumber": "1",
      "awbNumber": "DTDC123456789",
      "status": "IN_TRANSIT",
      "currentTracking": {
        "status": "REACHED_HUB",
        "location": "Mumbai Hub",
        "timestamp": "2024-01-15T10:30:00Z",
        "description": "Package reached destination hub"
      },
      "trackingHistory": [...]
    }
  ]
}
```