import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Package,
  Truck,
  DollarSign,
  Clock,
  Eye,
  Edit,
  Trash2,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Share,
  Mail,
  Save,
  Copy,
  Database,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
  Layers,
  Grid,
  List
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'inventory' | 'shipping' | 'financial' | 'operational' | 'custom';
  type: 'table' | 'chart' | 'dashboard' | 'summary';
  isActive: boolean;
  isScheduled: boolean;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string;
    recipients: string[];
  };
  filters: ReportFilter[];
  columns: ReportColumn[];
  visualizations: ReportVisualization[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  runCount: number;
}

interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  secondaryValue?: any;
  isRequired: boolean;
}

interface ReportColumn {
  field: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'boolean';
  isVisible: boolean;
  sortable: boolean;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  format?: string;
}

interface ReportVisualization {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'table';
  title: string;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count';
  position: { x: number; y: number; width: number; height: number };
}

interface GeneratedReport {
  id: string;
  templateId: string;
  templateName: string;
  data: any[];
  metadata: {
    totalRecords: number;
    generatedAt: Date;
    filters: any;
    executionTime: number;
  };
  status: 'generating' | 'completed' | 'failed';
  downloadUrl?: string;
}

const AdvancedReportingSystem: React.FC<{ brandId: string }> = ({ brandId }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRunDialogOpen, setIsRunDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  // Form state for creating/editing templates
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'sales' as ReportTemplate['category'],
    type: 'table' as ReportTemplate['type'],
    isActive: true,
    isScheduled: false,
    schedule: {
      frequency: 'weekly' as const,
      time: '09:00',
      recipients: [] as string[]
    },
    filters: [] as ReportFilter[],
    columns: [] as ReportColumn[],
    visualizations: [] as ReportVisualization[]
  });

  // Available fields for reports
  const availableFields = [
    { value: 'shipment_id', label: 'Shipment ID', type: 'text' },
    { value: 'awb_number', label: 'AWB Number', type: 'text' },
    { value: 'status', label: 'Status', type: 'text' },
    { value: 'created_date', label: 'Created Date', type: 'date' },
    { value: 'delivery_date', label: 'Delivery Date', type: 'date' },
    { value: 'customer_name', label: 'Customer Name', type: 'text' },
    { value: 'destination', label: 'Destination', type: 'text' },
    { value: 'weight', label: 'Weight', type: 'number' },
    { value: 'cost', label: 'Cost', type: 'currency' },
    { value: 'revenue', label: 'Revenue', type: 'currency' },
    { value: 'margin', label: 'Margin', type: 'currency' },
    { value: 'margin_percent', label: 'Margin %', type: 'percentage' },
    { value: 'part_name', label: 'Part Name', type: 'text' },
    { value: 'part_code', label: 'Part Code', type: 'text' },
    { value: 'quantity', label: 'Quantity', type: 'number' },
    { value: 'category', label: 'Category', type: 'text' }
  ];

  useEffect(() => {
    loadReportTemplates();
    loadGeneratedReports();
  }, [brandId]);

  const loadReportTemplates = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration
      const mockTemplates: ReportTemplate[] = [
        {
          id: 'template_1',
          name: 'Monthly Sales Report',
          description: 'Comprehensive monthly sales analysis with revenue and margin breakdown',
          category: 'sales',
          type: 'dashboard',
          isActive: true,
          isScheduled: true,
          schedule: {
            frequency: 'monthly',
            time: '09:00',
            recipients: ['admin@brand.com', 'sales@brand.com']
          },
          filters: [
            { field: 'created_date', operator: 'between', value: '2024-01-01', secondaryValue: '2024-01-31', isRequired: true }
          ],
          columns: [
            { field: 'shipment_id', label: 'Shipment ID', type: 'text', isVisible: true, sortable: true },
            { field: 'revenue', label: 'Revenue', type: 'currency', isVisible: true, sortable: true, aggregation: 'sum' },
            { field: 'margin', label: 'Margin', type: 'currency', isVisible: true, sortable: true, aggregation: 'sum' }
          ],
          visualizations: [
            {
              type: 'line',
              title: 'Revenue Trend',
              xAxis: 'created_date',
              yAxis: 'revenue',
              aggregation: 'sum',
              position: { x: 0, y: 0, width: 6, height: 4 }
            }
          ],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
          lastRun: new Date('2024-01-31'),
          runCount: 12
        },
        {
          id: 'template_2',
          name: 'Inventory Status Report',
          description: 'Current inventory levels and stock movement analysis',
          category: 'inventory',
          type: 'table',
          isActive: true,
          isScheduled: false,
          filters: [
            { field: 'category', operator: 'in', value: ['Filters', 'Brakes', 'Engine'], isRequired: false }
          ],
          columns: [
            { field: 'part_name', label: 'Part Name', type: 'text', isVisible: true, sortable: true },
            { field: 'part_code', label: 'Part Code', type: 'text', isVisible: true, sortable: true },
            { field: 'quantity', label: 'Stock', type: 'number', isVisible: true, sortable: true, aggregation: 'sum' }
          ],
          visualizations: [],
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-20'),
          lastRun: new Date('2024-01-30'),
          runCount: 8
        },
        {
          id: 'template_3',
          name: 'Shipping Performance Report',
          description: 'Delivery performance and shipping cost analysis',
          category: 'shipping',
          type: 'chart',
          isActive: true,
          isScheduled: true,
          schedule: {
            frequency: 'weekly',
            time: '08:00',
            recipients: ['operations@brand.com']
          },
          filters: [
            { field: 'status', operator: 'in', value: ['DELIVERED', 'IN_TRANSIT'], isRequired: true }
          ],
          columns: [
            { field: 'awb_number', label: 'AWB', type: 'text', isVisible: true, sortable: true },
            { field: 'destination', label: 'Destination', type: 'text', isVisible: true, sortable: true },
            { field: 'cost', label: 'Shipping Cost', type: 'currency', isVisible: true, sortable: true, aggregation: 'avg' }
          ],
          visualizations: [
            {
              type: 'bar',
              title: 'Shipping Costs by Destination',
              xAxis: 'destination',
              yAxis: 'cost',
              aggregation: 'avg',
              position: { x: 0, y: 0, width: 12, height: 6 }
            }
          ],
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-25'),
          lastRun: new Date('2024-02-01'),
          runCount: 15
        }
      ];

      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading report templates:', error);
      toast({
        title: "Error",
        description: "Failed to load report templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGeneratedReports = async () => {
    try {
      // Mock data for demonstration
      const mockReports: GeneratedReport[] = [
        {
          id: 'report_1',
          templateId: 'template_1',
          templateName: 'Monthly Sales Report',
          data: [],
          metadata: {
            totalRecords: 1250,
            generatedAt: new Date('2024-02-01T09:00:00'),
            filters: { month: 'January 2024' },
            executionTime: 2.5
          },
          status: 'completed',
          downloadUrl: '/reports/monthly-sales-jan-2024.pdf'
        },
        {
          id: 'report_2',
          templateId: 'template_2',
          templateName: 'Inventory Status Report',
          data: [],
          metadata: {
            totalRecords: 450,
            generatedAt: new Date('2024-01-30T14:30:00'),
            filters: { categories: ['Filters', 'Brakes'] },
            executionTime: 1.2
          },
          status: 'completed',
          downloadUrl: '/reports/inventory-status-jan-2024.xlsx'
        },
        {
          id: 'report_3',
          templateId: 'template_3',
          templateName: 'Shipping Performance Report',
          data: [],
          metadata: {
            totalRecords: 0,
            generatedAt: new Date(),
            filters: {},
            executionTime: 0
          },
          status: 'generating'
        }
      ];

      setReports(mockReports);
    } catch (error) {
      console.error('Error loading generated reports:', error);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      if (!formData.name.trim() || formData.columns.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please provide a name and add at least one column",
          variant: "destructive"
        });
        return;
      }

      const newTemplate: ReportTemplate = {
        id: `template_${Date.now()}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
        runCount: 0
      };

      setTemplates(prev => [...prev, newTemplate]);
      setIsCreateDialogOpen(false);
      resetForm();

      toast({
        title: "Success",
        description: "Report template created successfully"
      });
    } catch (error) {
      console.error('Error creating report template:', error);
      toast({
        title: "Error",
        description: "Failed to create report template",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      if (!selectedTemplate || !formData.name.trim()) {
        return;
      }

      const updatedTemplate: ReportTemplate = {
        ...selectedTemplate,
        ...formData,
        updatedAt: new Date()
      };

      setTemplates(prev => prev.map(template => 
        template.id === selectedTemplate.id ? updatedTemplate : template
      ));
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      resetForm();

      toast({
        title: "Success",
        description: "Report template updated successfully"
      });
    } catch (error) {
      console.error('Error updating report template:', error);
      toast({
        title: "Error",
        description: "Failed to update report template",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      
      toast({
        title: "Success",
        description: "Report template deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting report template:', error);
      toast({
        title: "Error",
        description: "Failed to delete report template",
        variant: "destructive"
      });
    }
  };

  const handleRunReport = async (template: ReportTemplate) => {
    try {
      const newReport: GeneratedReport = {
        id: `report_${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        data: [],
        metadata: {
          totalRecords: 0,
          generatedAt: new Date(),
          filters: {},
          executionTime: 0
        },
        status: 'generating'
      };

      setReports(prev => [newReport, ...prev]);

      // Simulate report generation
      setTimeout(() => {
        setReports(prev => prev.map(report => 
          report.id === newReport.id 
            ? {
                ...report,
                status: 'completed' as const,
                metadata: {
                  ...report.metadata,
                  totalRecords: Math.floor(Math.random() * 1000) + 100,
                  executionTime: Math.random() * 5 + 1
                },
                downloadUrl: `/reports/${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
              }
            : report
        ));

        // Update template run count
        setTemplates(prev => prev.map(t => 
          t.id === template.id 
            ? { ...t, runCount: t.runCount + 1, lastRun: new Date() }
            : t
        ));

        toast({
          title: "Report Generated",
          description: `${template.name} has been generated successfully`
        });
      }, 3000);

      toast({
        title: "Report Generation Started",
        description: `Generating ${template.name}...`
      });
    } catch (error) {
      console.error('Error running report:', error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  const handleToggleSchedule = async (templateId: string, isScheduled: boolean) => {
    try {
      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, isScheduled, updatedAt: new Date() }
          : template
      ));

      toast({
        title: "Success",
        description: `Report schedule ${isScheduled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: "Error",
        description: "Failed to update schedule",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'sales',
      type: 'table',
      isActive: true,
      isScheduled: false,
      schedule: {
        frequency: 'weekly',
        time: '09:00',
        recipients: []
      },
      filters: [],
      columns: [],
      visualizations: []
    });
  };

  const addFilter = () => {
    setFormData(prev => ({
      ...prev,
      filters: [...prev.filters, {
        field: 'created_date',
        operator: 'equals',
        value: '',
        isRequired: false
      }]
    }));
  };

  const updateFilter = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { ...filter, [field]: value } : filter
      )
    }));
  };

  const removeFilter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }));
  };

  const addColumn = () => {
    setFormData(prev => ({
      ...prev,
      columns: [...prev.columns, {
        field: 'shipment_id',
        label: 'Shipment ID',
        type: 'text',
        isVisible: true,
        sortable: true
      }]
    }));
  };

  const updateColumn = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.map((column, i) => 
        i === index ? { ...column, [field]: value } : column
      )
    }));
  };

  const removeColumn = (index: number) => {
    setFormData(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const openEditDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      type: template.type,
      isActive: template.isActive,
      isScheduled: template.isScheduled,
      schedule: template.schedule || {
        frequency: 'weekly',
        time: '09:00',
        recipients: []
      },
      filters: [...template.filters],
      columns: [...template.columns],
      visualizations: [...template.visualizations]
    });
    setIsEditDialogOpen(true);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales': return <DollarSign className="h-4 w-4" />;
      case 'inventory': return <Package className="h-4 w-4" />;
      case 'shipping': return <Truck className="h-4 w-4" />;
      case 'financial': return <BarChart3 className="h-4 w-4" />;
      case 'operational': return <Settings className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'table': return <List className="h-4 w-4" />;
      case 'chart': return <BarChart3 className="h-4 w-4" />;
      case 'dashboard': return <Grid className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'generating': return 'text-blue-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'generating': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading reporting system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced Reporting System</h2>
          <p className="text-gray-600">Create, schedule, and manage custom reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadReportTemplates} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generated">Generated Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search templates by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Templates List */}
          <div className="grid grid-cols-1 gap-6">
            {filteredTemplates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Report Templates Found</h3>
                  <p className="text-gray-600 mb-4">
                    {templates.length === 0 
                      ? "Create your first report template to get started with custom reporting."
                      : "No templates match your current filters."
                    }
                  </p>
                  {templates.length === 0 && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Template
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getCategoryIcon(template.category)}
                            {template.name}
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getTypeIcon(template.type)}
                              {template.type}
                            </Badge>
                            {template.isScheduled && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Scheduled
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunReport(template)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Filters */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          Filters ({template.filters.length})
                        </h4>
                        <div className="space-y-2">
                          {template.filters.slice(0, 3).map((filter, index) => (
                            <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                              <span className="font-medium">{filter.field}</span>
                              <span className="text-gray-500 mx-1">{filter.operator}</span>
                              <span>{filter.value}</span>
                            </div>
                          ))}
                          {template.filters.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{template.filters.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Columns */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          Columns ({template.columns.length})
                        </h4>
                        <div className="space-y-2">
                          {template.columns.slice(0, 3).map((column, index) => (
                            <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                              <span className="font-medium">{column.label}</span>
                              <span className="text-gray-500 ml-1">({column.type})</span>
                            </div>
                          ))}
                          {template.columns.length > 3 && (
                            <div className="text-sm text-gray-500">
                              +{template.columns.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Schedule */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Schedule
                        </h4>
                        {template.isScheduled && template.schedule ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Frequency:</span>
                              <span className="font-medium capitalize">{template.schedule.frequency}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time:</span>
                              <span className="font-medium">{template.schedule.time}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Recipients:</span>
                              <span className="font-medium">{template.schedule.recipients.length}</span>
                            </div>
                            <Switch
                              checked={template.isScheduled}
                              onCheckedChange={(checked) => handleToggleSchedule(template.id, checked)}
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            <p>Not scheduled</p>
                            <Switch
                              checked={template.isScheduled}
                              onCheckedChange={(checked) => handleToggleSchedule(template.id, checked)}
                            />
                          </div>
                        )}
                      </div>

                      {/* Statistics */}
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Statistics
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Runs:</span>
                            <span className="font-medium">{template.runCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Run:</span>
                            <span className="font-medium">
                              {template.lastRun ? template.lastRun.toLocaleDateString() : 'Never'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Updated:</span>
                            <span className="font-medium">{template.updatedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Generated Reports Tab */}
        <TabsContent value="generated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.templateName}</TableCell>
                      <TableCell>{report.metadata.generatedAt.toLocaleString()}</TableCell>
                      <TableCell>{report.metadata.totalRecords.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${getStatusColor(report.status)}`}>
                          {getStatusIcon(report.status)}
                          <span className="capitalize">{report.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.metadata.executionTime > 0 
                          ? `${report.metadata.executionTime.toFixed(1)}s`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && report.downloadUrl && (
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Manage automated report generation schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.filter(t => t.isScheduled).map((template) => (
                  <div key={template.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-gray-600">{template.description}</p>
                        {template.schedule && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>Frequency: <strong>{template.schedule.frequency}</strong></span>
                            <span>Time: <strong>{template.schedule.time}</strong></span>
                            <span>Recipients: <strong>{template.schedule.recipients.length}</strong></span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.isScheduled}
                          onCheckedChange={(checked) => handleToggleSchedule(template.id, checked)}
                        />
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(template)}>
                          <Settings className="w-4 h-4 mr-1" />
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.filter(t => t.isScheduled).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled reports configured</p>
                    <p className="text-sm">Enable scheduling on your report templates to automate generation</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateDialogOpen ? 'Create Report Template' : 'Edit Report Template'}
            </DialogTitle>
            <DialogDescription>
              Configure your custom report template with filters, columns, and visualizations
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="columns">Columns</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Report Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this report shows"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Report Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Table</SelectItem>
                      <SelectItem value="chart">Chart</SelectItem>
                      <SelectItem value="dashboard">Dashboard</SelectItem>
                      <SelectItem value="summary">Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Report Filters</h4>
                <Button onClick={addFilter} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Filter
                </Button>
              </div>

              {formData.filters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No filters added yet</p>
                  <p className="text-sm">Add filters to control what data is included in the report</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.filters.map((filter, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div className="space-y-2">
                            <Label>Field</Label>
                            <Select
                              value={filter.field}
                              onValueChange={(value) => updateFilter(index, 'field', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                              value={filter.operator}
                              onValueChange={(value) => updateFilter(index, 'operator', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                                <SelectItem value="between">Between</SelectItem>
                                <SelectItem value="in">In</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Value</Label>
                            <Input
                              value={filter.value}
                              onChange={(e) => updateFilter(index, 'value', e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Required</Label>
                            <div className="pt-2">
                              <Switch
                                checked={filter.isRequired}
                                onCheckedChange={(checked) => updateFilter(index, 'isRequired', checked)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Action</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFilter(index)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="columns" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Report Columns</h4>
                <Button onClick={addColumn} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Column
                </Button>
              </div>

              {formData.columns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No columns added yet</p>
                  <p className="text-sm">Add columns to define what data fields to include in the report</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.columns.map((column, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="space-y-2">
                            <Label>Field</Label>
                            <Select
                              value={column.field}
                              onValueChange={(value) => {
                                const field = availableFields.find(f => f.value === value);
                                updateColumn(index, 'field', value);
                                updateColumn(index, 'type', field?.type || 'text');
                                updateColumn(index, 'label', field?.label || value);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.value} value={field.value}>
                                    {field.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              value={column.label}
                              onChange={(e) => updateColumn(index, 'label', e.target.value)}
                              placeholder="Column label"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={column.type}
                              onValueChange={(value) => updateColumn(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="currency">Currency</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Visible</Label>
                            <div className="pt-2">
                              <Switch
                                checked={column.isVisible}
                                onCheckedChange={(checked) => updateColumn(index, 'isVisible', checked)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Sortable</Label>
                            <div className="pt-2">
                              <Switch
                                checked={column.sortable}
                                onCheckedChange={(checked) => updateColumn(index, 'sortable', checked)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Action</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeColumn(index)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="isScheduled"
                  checked={formData.isScheduled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isScheduled: checked }))}
                />
                <Label htmlFor="isScheduled">Enable Scheduled Generation</Label>
              </div>

              {formData.isScheduled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={formData.schedule.frequency}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, frequency: value as any }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={formData.schedule.time}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, time: e.target.value }
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email Recipients</Label>
                    <Textarea
                      value={formData.schedule.recipients.join(', ')}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        schedule: {
                          ...prev.schedule,
                          recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                        }
                      }))}
                      placeholder="Enter email addresses separated by commas"
                      rows={3}
                    />
                    <p className="text-sm text-gray-600">
                      Reports will be automatically generated and emailed to these recipients
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={isCreateDialogOpen ? handleCreateTemplate : handleUpdateTemplate}>
              {isCreateDialogOpen ? 'Create Template' : 'Update Template'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedReportingSystem;