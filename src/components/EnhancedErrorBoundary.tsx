import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home, 
  FileText,
  Copy,
  ExternalLink
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  dashboardType?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Log error to console
    console.error('Enhanced Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send error report to backend
      await fetch('/api/system/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorId: this.state.errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          dashboardType: this.props.dashboardType,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  copyErrorDetails = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full space-y-6">
            <Card className="border-red-200">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-red-900">
                      Dashboard Error Detected
                    </CardTitle>
                    <CardDescription className="text-red-700">
                      {this.props.dashboardType ? 
                        `An error occurred in the ${this.props.dashboardType} dashboard` :
                        'An unexpected error occurred while loading the dashboard'
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    <strong>Error ID:</strong> {this.state.errorId}
                    <br />
                    <strong>Message:</strong> {this.state.error?.message || 'Unknown error'}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={this.handleRetry} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                </div>

                {this.props.showDetails && this.state.error && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Error Details</h4>
                      <div className="flex gap-2">
                        <Button 
                          onClick={this.copyErrorDetails} 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => window.open('mailto:support@spareflow.com?subject=Dashboard Error Report&body=' + encodeURIComponent(`Error ID: ${this.state.errorId}\nMessage: ${this.state.error?.message}`))}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Report Bug
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <pre className="text-xs text-gray-800 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </div>

                    {this.state.errorInfo && (
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <h5 className="font-medium text-xs mb-2">Component Stack:</h5>
                        <pre className="text-xs text-gray-800 overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    What happened?
                  </h4>
                  <p className="text-blue-800 text-sm mb-3">
                    A component in the dashboard encountered an unexpected error and couldn't continue rendering. 
                    This error has been automatically reported to our development team.
                  </p>
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Error automatically reported
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Development team notified
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      Safe to retry operation
                    </Badge>
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2">Troubleshooting Tips</h4>
                  <ul className="text-green-800 text-sm space-y-1">
                    <li>• Try refreshing the page or clicking "Try Again"</li>
                    <li>• Check your internet connection</li>
                    <li>• Clear your browser cache and cookies</li>
                    <li>• Try accessing the dashboard from a different browser</li>
                    <li>• Contact support if the problem persists</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;