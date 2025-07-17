import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { CheckCircle, AlertCircle, Loader2, Mail, Building2, Wrench, Clock, XCircle } from 'lucide-react';

interface InvitationData {
  id: string;
  brandName: string;
  partnerType: string;
  message: string;
  expiresAt: string;
  status: string;
}

export default function AcceptInvitation() {
  const router = useRouter();
  const { token, id } = router.query;
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token && id) {
      fetchInvitationDetails();
    }
  }, [token, id]);

  const fetchInvitationDetails = async () => {
    try {
      const response = await fetch(`/api/brand/authorized-network/invitation-details?token=${token}&id=${id}`);
      const data = await response.json();

      if (response.ok) {
        setInvitation(data.invitation);
      } else {
        setError(data.error || 'Failed to load invitation details');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Network error while loading invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token || !id) return;

    setAccepting(true);
    try {
      const response = await fetch('/api/brand/authorized-network/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          invitationId: id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAccepted(true);
        toast({
          title: "Invitation Accepted!",
          description: data.message,
        });
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);
      } else {
        if (response.status === 401 && data.redirectTo) {
          // User needs to login
          router.push(data.redirectTo);
          return;
        }
        setError(data.error || 'Failed to accept invitation');
        toast({
          title: "Error",
          description: data.error || 'Failed to accept invitation',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Network error while accepting invitation');
      toast({
        title: "Error",
        description: "Network error while accepting invitation",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();
  const isInvalid = invitation && invitation.status !== 'PENDING';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading invitation...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">Invitation Accepted!</CardTitle>
            <CardDescription>
              You have successfully joined {invitation.brandName}'s authorized network.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Redirecting to your dashboard...
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired || isInvalid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-orange-700">
              {isExpired ? 'Invitation Expired' : 'Invitation No Longer Valid'}
            </CardTitle>
            <CardDescription>
              {isExpired 
                ? 'This invitation has expired. Please contact the brand for a new invitation.'
                : 'This invitation has already been used or is no longer valid.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {invitation.partnerType === 'SERVICE_CENTER' ? (
              <Wrench className="h-12 w-12 text-blue-500" />
            ) : (
              <Building2 className="h-12 w-12 text-green-500" />
            )}
          </div>
          <CardTitle>Partner Network Invitation</CardTitle>
          <CardDescription>
            You've been invited to join an authorized partner network
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">{invitation.brandName}</h3>
              <p className="text-sm text-muted-foreground">has invited you to join their network as a</p>
              <Badge variant={invitation.partnerType === 'SERVICE_CENTER' ? 'default' : 'secondary'} className="mt-2">
                {invitation.partnerType === 'SERVICE_CENTER' ? 'Service Center' : 'Distributor'}
              </Badge>
            </div>

            {invitation.message && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Message from {invitation.brandName}:
                </h4>
                <p className="text-sm text-muted-foreground">{invitation.message}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">What this means:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• You'll be authorized to receive spare parts from {invitation.brandName}</li>
                <li>• You can participate in their logistics network</li>
                <li>• Access to their partner portal and tools</li>
                <li>• Direct communication channel with the brand</li>
              </ul>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 inline mr-1" />
              This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="w-full"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Accepting Invitation...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Decline
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            By accepting this invitation, you agree to SpareFlow's terms of service and privacy policy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}