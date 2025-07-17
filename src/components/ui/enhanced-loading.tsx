import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle, 
  Clock,
  Wifi,
  WifiOff,
  Server,
  Database,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
  stage?: string;
  estimatedTime?: number;
  retryCount?: number;
  maxRetries?: number;
  lastUpdated?: Date;
  networkStatus?: 'online' | 'offline' | 'slow';
}

export interface EnhancedLoadingProps {
  loading?: boolean;
  error?: string | null;
  progress?: number;
  stage?: string;
  estimatedTime?: number;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'skeleton' | 'progress' | 'dots' | 'pulse';
  showProgress?: boolean;
  showStage?: boolean;
  showRetry?: boolean;
  showCancel?: boolean;
  showEstimatedTime?: boolean;
  showNetworkStatus?: boolean;
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  timeout?: number;
  onTimeout?: () => void;
  networkStatus?: 'online' | 'offline' | 'slow';
  customMessages?: {
    loading?: string;
    error?: string;
    retry?: string;
    cancel?: string;
    timeout?: string;
    networkError?: string;
  };
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const LoadingSpinner = ({ size = 'md', className }: { size?: keyof typeof sizeClasses; className?: string }) => (
  <Loader2 className={cn(sizeClasses[size], 'animate-spin', className)} />
);

const LoadingDots = ({ size = 'md', className }: { size?: keyof typeof sizeClasses; className?: string }) => (
  <div className={cn('flex space-x-1', className)}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className={cn(
          'rounded-full bg-current',
          size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-4 h-4'
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: i * 0.2
        }}
      />
    ))}
  </div>
);

const LoadingPulse = ({ size = 'md', className }: { size?: keyof typeof sizeClasses; className?: string }) => (
  <motion.div
    className={cn(
      'rounded-full bg-current',
      sizeClasses[size],
      className
    )}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5]
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity
    }}
  />
);

const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={cn('space-y-3', className)}>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

const NetworkStatusIndicator = ({ status }: { status: 'online' | 'offline' | 'slow' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return { icon: Wifi, color: 'text-green-600', label: 'Online' };
      case 'offline':
        return { icon: WifiOff, color: 'text-red-600', label: 'Offline' };
      case 'slow':
        return { icon: Wifi, color: 'text-yellow-600', label: 'Slow Connection' };
      default:
        return { icon: Wifi, color: 'text-gray-600', label: 'Unknown' };
    }
  };

  const { icon: Icon, color, label } = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className={cn('w-4 h-4', color)} />
      <span className={color}>{label}</span>
    </div>
  );
};

export function EnhancedLoading({
  loading = false,
  error = null,
  progress,
  stage,
  estimatedTime,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  onCancel,
  size = 'md',
  variant = 'spinner',
  showProgress = true,
  showStage = true,
  showRetry = true,
  showCancel = false,
  showEstimatedTime = false,
  showNetworkStatus = false,
  title,
  description,
  className,
  children,
  fallback,
  timeout,
  onTimeout,
  networkStatus = 'online',
  customMessages = {}
}: EnhancedLoadingProps) {
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Timeout handling
  React.useEffect(() => {
    if (!loading || !timeout) return;

    const timer = setTimeout(() => {
      setHasTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [loading, timeout, onTimeout]);

  // Elapsed time tracking
  React.useEffect(() => {
    if (!loading) {
      setElapsedTime(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  const renderLoadingIndicator = () => {
    const commonProps = { size, className: 'text-blue-600' };

    switch (variant) {
      case 'dots':
        return <LoadingDots {...commonProps} />;
      case 'pulse':
        return <LoadingPulse {...commonProps} />;
      case 'skeleton':
        return <SkeletonLoader className={className} />;
      case 'progress':
        return progress !== undefined ? (
          <div className="w-full space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{Math.round(progress)}% complete</span>
              {estimatedTime && (
                <span>{Math.round(estimatedTime / 1000)}s remaining</span>
              )}
            </div>
          </div>
        ) : (
          <LoadingSpinner {...commonProps} />
        );
      default:
        return <LoadingSpinner {...commonProps} />;
    }
  };

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Show error state
  if (error || hasTimedOut) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn('w-full', className)}
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <p className="font-medium">
                    {hasTimedOut 
                      ? (customMessages.timeout || 'Operation timed out')
                      : (customMessages.error || error || 'An error occurred')
                    }
                  </p>
                  {networkStatus === 'offline' && (
                    <p className="text-sm mt-1">
                      {customMessages.networkError || 'Please check your internet connection and try again.'}
                    </p>
                  )}
                  {retryCount > 0 && (
                    <p className="text-sm mt-1">
                      Attempt {retryCount} of {maxRetries}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {showRetry && onRetry && retryCount < maxRetries && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {customMessages.retry || 'Retry'}
                    </Button>
                  )}
                  {showCancel && onCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCancel}
                    >
                      {customMessages.cancel || 'Cancel'}
                    </Button>
                  )}
                </div>

                {showNetworkStatus && (
                  <NetworkStatusIndicator status={networkStatus} />
                )}
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn('w-full', className)}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {/* Loading indicator */}
                <div className="flex items-center justify-center">
                  {renderLoadingIndicator()}
                </div>

                {/* Title and description */}
                {(title || description) && (
                  <div className="text-center space-y-1">
                    {title && (
                      <h3 className="text-lg font-medium">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-sm text-gray-600">
                        {description}
                      </p>
                    )}
                  </div>
                )}

                {/* Stage information */}
                {showStage && stage && (
                  <div className="text-center">
                    <Badge variant="outline" className="flex items-center gap-2">
                      <Database className="w-3 h-3" />
                      {stage}
                    </Badge>
                  </div>
                )}

                {/* Progress bar */}
                {showProgress && progress !== undefined && variant !== 'progress' && (
                  <div className="w-full max-w-xs space-y-2">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{Math.round(progress)}%</span>
                      {showEstimatedTime && estimatedTime && (
                        <span>{Math.round(estimatedTime / 1000)}s left</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Elapsed time */}
                {elapsedTime > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Elapsed: {formatElapsedTime(elapsedTime)}</span>
                  </div>
                )}

                {/* Network status */}
                {showNetworkStatus && (
                  <NetworkStatusIndicator status={networkStatus} />
                )}

                {/* Cancel button */}
                {showCancel && onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                  >
                    {customMessages.cancel || 'Cancel'}
                  </Button>
                )}

                {/* Warning for slow operations */}
                {elapsedTime > 10000 && networkStatus === 'slow' && (
                  <Alert className="w-full max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      This operation is taking longer than usual due to slow network conditions.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show success state or children
  return (
    <AnimatePresence>
      {children || fallback || null}
    </AnimatePresence>
  );
}

// Specialized loading components
export function LoadingOverlay({ 
  show, 
  children, 
  ...props 
}: { show: boolean; children: React.ReactNode } & EnhancedLoadingProps) {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <EnhancedLoading loading={true} {...props} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LoadingButton({ 
  loading, 
  children, 
  disabled,
  ...props 
}: { loading: boolean; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}

export function LoadingCard({ 
  loading, 
  error, 
  onRetry, 
  children, 
  title,
  description,
  ...props 
}: { 
  loading: boolean; 
  error?: string | null; 
  onRetry?: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
} & React.ComponentProps<typeof Card>) {
  if (loading) {
    return (
      <Card {...props}>
        <CardContent className="p-6">
          <EnhancedLoading 
            loading={true} 
            title={title}
            description={description}
            variant="skeleton"
          />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card {...props}>
        <CardContent className="p-6">
          <EnhancedLoading 
            error={error} 
            onRetry={onRetry}
            showRetry={!!onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  return <Card {...props}>{children}</Card>;
}