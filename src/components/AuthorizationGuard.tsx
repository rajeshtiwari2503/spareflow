import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Users } from 'lucide-react';
import { useAuthorization } from '@/hooks/useAuthorization';
import { cn } from '@/lib/utils';

interface AuthorizationGuardProps {
  children: React.ReactNode;
  feature: string;
  onRequestAccess?: () => void;
  className?: string;
}

interface AuthorizationStatusBannerProps {
  className?: string;
}

export function AuthorizationGuard({ 
  children, 
  feature, 
  onRequestAccess, 
  className 
}: AuthorizationGuardProps) {
  const { authStatus, loading } = useAuthorization();

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authStatus?.isAuthorized) {
    return (
      <Card className={cn("border-orange-200 bg-orange-50", className)}>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-orange-900">Authorization Required</CardTitle>
          <CardDescription className="text-orange-700">
            You need brand authorization to access {feature}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-orange-600">
            To use this feature, you must be authorized by a brand. Please request access from the brands you work with.
          </p>
          {onRequestAccess && (
            <Button onClick={onRequestAccess} className="bg-orange-600 hover:bg-orange-700">
              <Users className="h-4 w-4 mr-2" />
              Request Brand Access
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function AuthorizationStatusBanner({ className }: AuthorizationStatusBannerProps) {
  const { authStatus, loading } = useAuthorization();

  if (loading || !authStatus) {
    return null;
  }

  if (authStatus.isAuthorized) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>Authorized:</strong> You have access to brand features through {authStatus.authorizedBrands?.length || 0} brand(s)
            </span>
            <div className="flex gap-1">
              {authStatus.authorizedBrands?.slice(0, 3).map((brand, index) => (
                <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                  {brand}
                </Badge>
              ))}
              {(authStatus.authorizedBrands?.length || 0) > 3 && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  +{(authStatus.authorizedBrands?.length || 0) - 3} more
                </Badge>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={cn("border-orange-200 bg-orange-50", className)}>
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <span>
            <strong>Limited Access:</strong> You need brand authorization to access shipment and order management features
          </span>
          <Badge variant="outline" className="text-orange-700 border-orange-300">
            Not Authorized
          </Badge>
        </div>
      </AlertDescription>
    </Alert>
  );
}