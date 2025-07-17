import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle, CheckCircle, Loader2, Database, Shield, Clock, FileText, Download, Upload, RefreshCw, Eye, Info, Settings, Zap, Activity, BarChart3, Users, Package, Truck, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface CleanupOptions {
  preservePartStructure: boolean;
  preserveUserAccounts: boolean;
  preserveSystemConfig: boolean;
  confirmCleanup: boolean;
  createBackup: boolean;
  scheduleCleanup: boolean;
  scheduledTime?: string;
  notifyOnCompletion: boolean;
  generateReport: boolean;
}

interface CleanupResult {
  success: boolean;
  message: string;
  cleanupVerified: boolean;
  timestamp: string;
  summary?: {
    totalRecordsDeleted: number;
    tablesAffected: number;
    executionTime: number;
    backupCreated: boolean;
    reportGenerated: boolean;
  };
}

interface SystemStats {
  totalUsers: number;
  totalParts: number;
  totalShipments: number;
  totalOrders: number;
  totalTransactions: number;
  totalNotifications: number;
  databaseSize: string;
  lastBackup: string | null;
}

interface CleanupHistory {
  id: string;
  timestamp: string;
  options: CleanupOptions;
  result: CleanupResult;
  executedBy: string;
}

export default function DemoDataCleanupManager() {
  const [options, setOptions] = useState<CleanupOptions>({
    preservePartStructure: true,
    preserveUserAccounts: false, // Changed to false for production cleanup
    preserveSystemConfig: true,
    confirmCleanup: false,
    createBackup: true,
    scheduleCleanup: false,
    notifyOnCompletion: true,
    generateReport: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [cleanupHistory, setCleanupHistory] = useState<CleanupHistory[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewResults, setPreviewResults] = useState<any>(null);

  // Fetch system statistics on component mount
  useEffect(() => {
    fetchSystemStats();
    fetchCleanupHistory();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin/system-stats');
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  };

  const fetchCleanupHistory = async () => {
    try {
      const response = await fetch('/api/admin/cleanup-history');
      if (response.ok) {
        const data = await response.json();
        setCleanupHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch cleanup history:', error);
    }
  };

  const handlePreviewCleanup = async () => {
    setIsPreviewMode(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/cleanup-demo-data/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed');
      }

      setPreviewResults(data);
      toast.success('Preview generated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
      toast.error('Failed to generate preview');
    } finally {
      setIsPreviewMode(false);
    }
  };

  const handleCleanup = async () => {
    if (!options.confirmCleanup) {
      setError('Please confirm that you want to proceed with the cleanup');
      return;
    }

    if (confirmationText !== 'DELETE ALL DEMO DATA') {
      setError('Please type "DELETE ALL DEMO DATA" to confirm');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Show progress updates
      toast.info('Starting demo data cleanup...');

      const response = await fetch('/api/admin/cleanup-all-mock-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed');
      }

      setResult(data);
      setConfirmationText('');
      fetchSystemStats(); // Refresh stats after cleanup
      fetchCleanupHistory(); // Refresh history
      
      if (options.notifyOnCompletion) {
        toast.success('Demo data cleanup completed successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(`Cleanup failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleCleanup = async () => {
    if (!options.scheduledTime) {
      setError('Please select a scheduled time');
      return;
    }

    try {
      const response = await fetch('/api/admin/cleanup-demo-data/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...options,
          scheduledTime: options.scheduledTime
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule cleanup');
      }

      toast.success(`Cleanup scheduled for ${new Date(options.scheduledTime).toLocaleString()}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule cleanup';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const updateOption = (key: keyof CleanupOptions, value: boolean | string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const downloadReport = async () => {
    try {
      const response = await fetch('/api/admin/cleanup-demo-data/report', {
        method: 'GET',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cleanup-report-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report downloaded successfully');
      }
    } catch (error) {
      toast.error('Failed to download report');
    }
  };

  const createBackup = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/database-backup', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Database backup created successfully');
        fetchSystemStats(); // Refresh stats to show new backup time
      } else {
        throw new Error('Backup failed');
      }
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="cleanup" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cleanup" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Cleanup
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Statistics
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        {/* Main Cleanup Tab */}
        <TabsContent value="cleanup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Demo Data Cleanup Manager
              </CardTitle>
              <CardDescription>
                Comprehensive demo data cleanup with advanced options and safety features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Critical Warning Alert */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>⚠️ CRITICAL WARNING:</strong> This action is irreversible and will permanently delete all demo data.
                  Ensure you have a recent backup before proceeding. Production data will be lost if not properly configured.
                </AlertDescription>
              </Alert>

              {/* System Status Overview */}
              {systemStats && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-sm">Current System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{systemStats.totalUsers} Users</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-500" />
                        <span>{systemStats.totalParts} Parts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-purple-500" />
                        <span>{systemStats.totalShipments} Shipments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-orange-500" />
                        <span>{systemStats.totalTransactions} Transactions</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Database Size: {systemStats.databaseSize}</span>
                        <span>Last Backup: {systemStats.lastBackup ? new Date(systemStats.lastBackup).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Basic Cleanup Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preservation Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2 p-3 border rounded">
                    <Checkbox
                      id="preservePartStructure"
                      checked={options.preservePartStructure}
                      onCheckedChange={(checked) => updateOption('preservePartStructure', checked as boolean)}
                    />
                    <div>
                      <label htmlFor="preservePartStructure" className="text-sm font-medium">
                        Preserve Parts Structure
                      </label>
                      <p className="text-xs text-muted-foreground">Keep part definitions, reset stock to 0</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded">
                    <Checkbox
                      id="preserveUserAccounts"
                      checked={options.preserveUserAccounts}
                      onCheckedChange={(checked) => updateOption('preserveUserAccounts', checked as boolean)}
                    />
                    <div>
                      <label htmlFor="preserveUserAccounts" className="text-sm font-medium">
                        Preserve User Accounts
                      </label>
                      <p className="text-xs text-muted-foreground">Keep accounts, clear profiles</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded">
                    <Checkbox
                      id="preserveSystemConfig"
                      checked={options.preserveSystemConfig}
                      onCheckedChange={(checked) => updateOption('preserveSystemConfig', checked as boolean)}
                    />
                    <div>
                      <label htmlFor="preserveSystemConfig" className="text-sm font-medium">
                        Preserve System Config
                      </label>
                      <p className="text-xs text-muted-foreground">Keep settings and pricing rules</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Advanced Options</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
                  </Button>
                </div>

                {showAdvancedOptions && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="createBackup"
                        checked={options.createBackup}
                        onCheckedChange={(checked) => updateOption('createBackup', checked as boolean)}
                      />
                      <label htmlFor="createBackup" className="text-sm font-medium">
                        Create Backup Before Cleanup
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="generateReport"
                        checked={options.generateReport}
                        onCheckedChange={(checked) => updateOption('generateReport', checked as boolean)}
                      />
                      <label htmlFor="generateReport" className="text-sm font-medium">
                        Generate Cleanup Report
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="notifyOnCompletion"
                        checked={options.notifyOnCompletion}
                        onCheckedChange={(checked) => updateOption('notifyOnCompletion', checked as boolean)}
                      />
                      <label htmlFor="notifyOnCompletion" className="text-sm font-medium">
                        Notify on Completion
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="scheduleCleanup"
                        checked={options.scheduleCleanup}
                        onCheckedChange={(checked) => updateOption('scheduleCleanup', checked as boolean)}
                      />
                      <label htmlFor="scheduleCleanup" className="text-sm font-medium">
                        Schedule for Later
                      </label>
                    </div>

                    {options.scheduleCleanup && (
                      <div className="col-span-2">
                        <Label htmlFor="scheduledTime">Scheduled Time</Label>
                        <Input
                          id="scheduledTime"
                          type="datetime-local"
                          value={options.scheduledTime || ''}
                          onChange={(e) => updateOption('scheduledTime', e.target.value)}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preview Impact</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePreviewCleanup}
                    disabled={isPreviewMode}
                  >
                    {isPreviewMode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Cleanup
                      </>
                    )}
                  </Button>
                  
                  {previewResults && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <FileText className="mr-2 h-4 w-4" />
                          View Preview Results
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Cleanup Preview Results</DialogTitle>
                          <DialogDescription>
                            This shows what will be affected by the cleanup operation
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(previewResults.tablesAffected || {}).map(([table, count]) => (
                              <div key={table} className="flex justify-between p-2 border rounded">
                                <span className="font-medium">{table}</span>
                                <Badge variant="outline">{count} records</Badge>
                              </div>
                            ))}
                          </div>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              Total records to be deleted: <strong>{previewResults.totalRecords}</strong>
                            </AlertDescription>
                          </Alert>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              {/* Confirmation Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Final Confirmation</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="confirmCleanup"
                      checked={options.confirmCleanup}
                      onCheckedChange={(checked) => updateOption('confirmCleanup', checked as boolean)}
                    />
                    <label htmlFor="confirmCleanup" className="text-sm font-medium">
                      I understand this action is irreversible and want to proceed with demo data cleanup
                    </label>
                  </div>

                  {options.confirmCleanup && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmationText">
                        Type "DELETE ALL DEMO DATA" to confirm:
                      </Label>
                      <Input
                        id="confirmationText"
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="DELETE ALL DEMO DATA"
                        className="font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {options.scheduleCleanup ? (
                  <Button
                    onClick={handleScheduleCleanup}
                    disabled={!options.confirmCleanup || !options.scheduledTime}
                    className="flex-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Schedule Cleanup
                  </Button>
                ) : (
                  <Button
                    onClick={handleCleanup}
                    disabled={!options.confirmCleanup || confirmationText !== 'DELETE ALL DEMO DATA' || isLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cleaning Demo Data...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Execute Cleanup Now
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={createBackup}
                  disabled={isLoading}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Create Backup
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Display */}
              {result && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div><strong>Success:</strong> {result.message}</div>
                      <div><strong>Cleanup Verified:</strong> {result.cleanupVerified ? 'Yes' : 'No'}</div>
                      <div><strong>Completed At:</strong> {new Date(result.timestamp).toLocaleString()}</div>
                      {result.summary && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <h4 className="font-semibold text-sm">Cleanup Summary:</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                            <div>Records Deleted: {result.summary.totalRecordsDeleted}</div>
                            <div>Tables Affected: {result.summary.tablesAffected}</div>
                            <div>Execution Time: {result.summary.executionTime}ms</div>
                            <div>Backup Created: {result.summary.backupCreated ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                System Statistics
              </CardTitle>
              <CardDescription>
                Current database statistics and cleanup impact analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Total Users</p>
                            <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">Total Parts</p>
                            <p className="text-2xl font-bold">{systemStats.totalParts}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-medium">Total Shipments</p>
                            <p className="text-2xl font-bold">{systemStats.totalShipments}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium">Transactions</p>
                            <p className="text-2xl font-bold">{systemStats.totalTransactions}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Database Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span>Database Size:</span>
                          <Badge variant="outline">{systemStats.databaseSize}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Backup:</span>
                          <span className="text-sm text-gray-600">
                            {systemStats.lastBackup ? new Date(systemStats.lastBackup).toLocaleString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Orders:</span>
                          <Badge variant="outline">{systemStats.totalOrders}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Notifications:</span>
                          <Badge variant="outline">{systemStats.totalNotifications}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Cleanup Impact Estimate</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Data to be cleaned:</span>
                            <span className="font-medium">~85%</span>
                          </div>
                          <Progress value={85} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Data to be preserved:</span>
                            <span className="font-medium">~15%</span>
                          </div>
                          <Progress value={15} className="h-2" />
                        </div>
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Estimates based on current preservation settings
                          </AlertDescription>
                        </Alert>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading statistics...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cleanup History
              </CardTitle>
              <CardDescription>
                Previous cleanup operations and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cleanupHistory.length > 0 ? (
                <div className="space-y-4">
                  {cleanupHistory.map((entry) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={entry.result.success ? 'default' : 'destructive'}>
                              {entry.result.success ? 'Success' : 'Failed'}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{entry.result.message}</p>
                          <p className="text-xs text-gray-500">Executed by: {entry.executedBy}</p>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Cleanup Details</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold">Options Used:</h4>
                                <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                                  {JSON.stringify(entry.options, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <h4 className="font-semibold">Result:</h4>
                                <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
                                  {JSON.stringify(entry.result, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cleanup history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Tools
                </CardTitle>
                <CardDescription>
                  Database management and backup utilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={createBackup}
                  disabled={isLoading}
                >
                  <Database className="mr-2 h-4 w-4" />
                  Create Database Backup
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={fetchSystemStats}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh System Statistics
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={downloadReport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Cleanup Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Alternative Methods
                </CardTitle>
                <CardDescription>
                  Other ways to perform cleanup operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Command Line Script:</h4>
                  <code className="block bg-muted p-2 rounded text-xs mt-1">
                    node scripts/cleanup-demo-data.js --preserve-parts --preserve-users --preserve-config
                  </code>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm">API Endpoint:</h4>
                  <code className="block bg-muted p-2 rounded text-xs mt-1">
                    POST /api/admin/cleanup-demo-data
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold text-sm">Direct Database Access:</h4>
                  <p className="text-xs text-muted-foreground">
                    Use the DemoDataCleanup utility class directly in your application code for programmatic cleanup.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Safety Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Before Cleanup:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Create a full database backup</li>
                    <li>• Verify preservation settings</li>
                    <li>• Review preview results</li>
                    <li>• Notify team members</li>
                    <li>• Schedule during low-traffic hours</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">After Cleanup:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Verify cleanup completion</li>
                    <li>• Test critical system functions</li>
                    <li>• Review cleanup report</li>
                    <li>• Update documentation</li>
                    <li>• Monitor system performance</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}