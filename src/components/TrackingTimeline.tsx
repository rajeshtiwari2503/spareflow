import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, MapPin, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TrackingEvent {
  status: string;
  location?: string;
  timestamp: string;
  description?: string;
  scanCode?: string;
}

interface TrackingTimelineProps {
  awbNumber: string;
  currentStatus: string;
  trackingHistory: TrackingEvent[];
  boxNumber?: string;
  parts?: Array<{
    name: string;
    code: string;
    quantity: number;
  }>;
}

const getStatusIcon = (status: string) => {
  switch (status.toUpperCase()) {
    case 'BOOKED':
      return <Package className="h-4 w-4" />;
    case 'PICKED_UP':
      return <Truck className="h-4 w-4" />;
    case 'IN_TRANSIT':
    case 'REACHED_HUB':
      return <MapPin className="h-4 w-4" />;
    case 'OUT_FOR_DELIVERY':
      return <Truck className="h-4 w-4" />;
    case 'DELIVERED':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'BOOKED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PICKED_UP':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'IN_TRANSIT':
    case 'REACHED_HUB':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'OUT_FOR_DELIVERY':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDateTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  };
};

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({
  awbNumber,
  currentStatus,
  trackingHistory,
  boxNumber,
  parts
}) => {
  const sortedHistory = [...trackingHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Shipment Tracking
            {boxNumber && <span className="text-sm font-normal text-muted-foreground ml-2">Box #{boxNumber}</span>}
          </CardTitle>
          <Badge className={getStatusColor(currentStatus)}>
            {currentStatus.replace('_', ' ')}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          AWB: <span className="font-mono font-medium">{awbNumber}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Parts Summary */}
        {parts && parts.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">Package Contents</h4>
            <div className="space-y-1">
              {parts.map((part, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{part.name} ({part.code})</span>
                  <span className="text-muted-foreground">Qty: {part.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tracking Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Tracking History</h4>
          
          {sortedHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-5 w-5 mr-2" />
              No tracking information available
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
              
              {sortedHistory.map((event, index) => {
                const { date, time } = formatDateTime(event.timestamp);
                const isLatest = index === 0;
                
                return (
                  <div key={index} className="relative flex items-start space-x-4 pb-6">
                    {/* Timeline dot */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2
                      ${isLatest 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-border'
                      }
                    `}>
                      {getStatusIcon(event.status)}
                    </div>
                    
                    {/* Event details */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-sm">
                          {event.status.replace('_', ' ')}
                          {event.scanCode && (
                            <span className="ml-2 text-xs text-muted-foreground font-mono">
                              [{event.scanCode}]
                            </span>
                          )}
                        </h5>
                        <div className="text-xs text-muted-foreground text-right">
                          <div>{date}</div>
                          <div>{time}</div>
                        </div>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center mt-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                      
                      {event.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackingTimeline;