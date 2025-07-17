'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search, 
  Filter,
  TrendingUp,
  TrendingDown,
  Eye,
  Settings,
  History,
  AlertCircle
} from 'lucide-react';

interface PricingMismatch {
  brandId: string;
  brandName: string;
  brandEmail: string;
  issue: string;
  adminValue: any;
  brandValue: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation: string;
}

interface PricingDiagnosticResult {
  summary: {
    totalBrands: number;
    brandsWithMismatches: number;
    criticalIssues: number;
    highPriorityIssues: number;
    lastUpdated: string;
  };
  mismatches: PricingMismatch[];
  systemHealth: {
    adminPricingConfigured: boolean;
    unifiedPricingActive: boolean;
    defaultRatesSet: boolean;
    brandOverridesCount: number;
  };
  recommendations: string[];
}

interface PricingAuditEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  brandId?: string;
  brandName?: string;
  oldValue: any;
  newValue: any;
  affectedField: string;
  reason?: string;
  ipAddress?: string;
}

const PricingDiagnosticManager: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<PricingDiagnosticResult | null>(null);
  const [auditTrail, setAuditTrail] = useState<PricingAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('diagnostic');

  useEffect(() => {
    loadDiagnostic();
    loadAuditTrail();
  }, []);

  const loadDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing-diagnostic');
      if (response.ok) {
        const data = await response.json();
        setDiagnostic(data);
      }
    } catch (error) {
      console.error('Error loading pricing diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditTrail = async () => {
    try {
      const response = await fetch('/api/admin/pricing-audit-trail?limit=20');
      if (response.ok) {
        const data = await response.json();
        setAuditTrail(data.entries);
      }
    } catch (error) {
      console.error('Error loading audit trail:', error);
    }
  };

  const fixMismatch = async (brandId: string) => {
    try {
      const response = await fetch('/api/admin/pricing-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fixMismatch', brandId })
      });

      if (response.ok) {
        await loadDiagnostic();
        await loadAuditTrail();
      }
    } catch (error) {
      console.error('Error fixing mismatch:', error);
    }
  };

  const fixAllMismatches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pricing-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fixAllMismatches' })
      });

      if (response.ok) {
        await loadDiagnostic();
        await loadAuditTrail();
      }
    } catch (error) {
      console.error('Error fixing all mismatches:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncBrandPricing = async (brandId: string) => {
    try {
      const response = await fetch('/api/admin/pricing-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncPricing', brandId })
      });

      if (response.ok) {
        await loadDiagnostic();
        await loadAuditTrail();
      }
    } catch (error) {
      console.error('Error syncing brand pricing:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive';
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertCircle className="h-4 w-4" />;
      case 'LOW': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredMismatches = diagnostic?.mismatches.filter(mismatch => {
    const matchesSearch = mismatch.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mismatch.brandEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mismatch.issue.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === 'ALL' || mismatch.severity === severityFilter;
    const matchesBrand = !selectedBrand || mismatch.brandId === selectedBrand;
    
    return matchesSearch && matchesSeverity && matchesBrand;
  }) || [];

  if (!diagnostic) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading pricing diagnostic...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pricing Diagnostic & Audit</h2>
          <p className="text-muted-foreground">
            Monitor and fix Brand vs Admin courier pricing mismatches
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDiagnostic} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={fixAllMismatches} disabled={loading}>
            Fix All Issues
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Brands</p>
                <p className="text-2xl font-bold">{diagnostic.summary.totalBrands}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Brands with Issues</p>
                <p className="text-2xl font-bold text-orange-600">
                  {diagnostic.summary.brandsWithMismatches}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {diagnostic.summary.criticalIssues}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold text-green-600">
                  {diagnostic.systemHealth.adminPricingConfigured ? 'Good' : 'Poor'}
                </p>
              </div>
              {diagnostic.systemHealth.adminPricingConfigured ? 
                <CheckCircle className="h-8 w-8 text-green-500" /> :
                <XCircle className="h-8 w-8 text-red-500" />
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="diagnostic">Pricing Issues</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostic" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search brands, emails, or issues..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="min-w-[150px]">
                  <Label htmlFor="severity">Severity</Label>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Severities</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[200px]">
                  <Label htmlFor="brand">Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Brands</SelectItem>
                      {Array.from(new Set(diagnostic.mismatches.map(m => m.brandId)))
                        .map(brandId => {
                          const mismatch = diagnostic.mismatches.find(m => m.brandId === brandId);
                          return (
                            <SelectItem key={brandId} value={brandId}>
                              {mismatch?.brandName}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Issues */}
          <div className="space-y-4">
            {filteredMismatches.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Pricing Issues Found</h3>
                  <p className="text-muted-foreground">
                    All brand pricing configurations are in sync with admin settings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMismatches.map((mismatch) => (
                <Card key={`${mismatch.brandId}-${mismatch.issue}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSeverityIcon(mismatch.severity)}
                          <Badge variant={getSeverityColor(mismatch.severity) as any}>
                            {mismatch.severity}
                          </Badge>
                          <h3 className="font-semibold">{mismatch.issue}</h3>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <p className="text-sm">
                            <strong>Brand:</strong> {mismatch.brandName} ({mismatch.brandEmail})
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Admin Value</p>
                              <p className="text-sm font-mono bg-muted p-2 rounded">
                                {typeof mismatch.adminValue === 'object' 
                                  ? JSON.stringify(mismatch.adminValue, null, 2)
                                  : String(mismatch.adminValue)
                                }
                              </p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Brand Value</p>
                              <p className="text-sm font-mono bg-muted p-2 rounded">
                                {typeof mismatch.brandValue === 'object' 
                                  ? JSON.stringify(mismatch.brandValue, null, 2)
                                  : String(mismatch.brandValue)
                                }
                              </p>
                            </div>
                          </div>
                          
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Recommendation:</strong> {mismatch.recommendation}
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => syncBrandPricing(mismatch.brandId)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => fixMismatch(mismatch.brandId)}
                        >
                          Fix Issue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Pricing Changes
              </CardTitle>
              <CardDescription>
                Track all pricing modifications made by administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditTrail.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entry.action}</Badge>
                        <span className="text-sm font-medium">{entry.adminName}</span>
                        {entry.brandName && (
                          <span className="text-sm text-muted-foreground">
                            → {entry.brandName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {entry.reason && (
                      <p className="text-sm text-muted-foreground mb-2">{entry.reason}</p>
                    )}
                    
                    {(entry.oldValue !== null || entry.newValue !== null) && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-medium text-muted-foreground">Old Value</p>
                          <p className="font-mono bg-muted p-1 rounded">
                            {entry.oldValue !== null ? String(entry.oldValue) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">New Value</p>
                          <p className="font-mono bg-muted p-1 rounded">
                            {entry.newValue !== null ? String(entry.newValue) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Recommendations
              </CardTitle>
              <CardDescription>
                Suggested improvements for pricing system consistency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {diagnostic.recommendations.map((recommendation, index) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Alert>
                ))}
                
                {diagnostic.recommendations.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">System is Healthy</h3>
                    <p className="text-muted-foreground">
                      No recommendations at this time. Your pricing system is well-configured.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Health Details */}
          <Card>
            <CardHeader>
              <CardTitle>System Health Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Admin Pricing Configured</span>
                  {diagnostic.systemHealth.adminPricingConfigured ? 
                    <CheckCircle className="h-5 w-5 text-green-500" /> :
                    <XCircle className="h-5 w-5 text-red-500" />
                  }
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Unified Pricing Active</span>
                  {diagnostic.systemHealth.unifiedPricingActive ? 
                    <CheckCircle className="h-5 w-5 text-green-500" /> :
                    <XCircle className="h-5 w-5 text-red-500" />
                  }
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Default Rates Set</span>
                  {diagnostic.systemHealth.defaultRatesSet ? 
                    <CheckCircle className="h-5 w-5 text-green-500" /> :
                    <XCircle className="h-5 w-5 text-red-500" />
                  }
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Brand Overrides</span>
                  <Badge variant="outline">
                    {diagnostic.systemHealth.brandOverridesCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PricingDiagnosticManager;