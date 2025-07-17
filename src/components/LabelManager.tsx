import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Download, 
  Eye, 
  Package, 
  Truck, 
  QrCode, 
  FileText, 
  Printer,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface LabelData {
  boxNumber: string;
  awbNumber: string;
  shipmentId: string;
  brandName: string;
  destinationAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  partsSummary: {
    code: string;
    name: string;
    quantity: number;
  }[];
  totalWeight: number;
  createdDate: string;
  trackingUrl?: string;
}

interface LabelManagerProps {
  boxId: string;
  boxNumber: string;
  awbNumber?: string;
  shipmentId: string;
  onLabelGenerated?: (labelData: any) => void;
}

export default function LabelManager({ 
  boxId, 
  boxNumber, 
  awbNumber, 
  shipmentId,
  onLabelGenerated 
}: LabelManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [labelFormat, setLabelFormat] = useState<'pdf' | 'html'>('pdf');
  const [labelSize, setLabelSize] = useState<'label' | 'A4' | 'A5'>('label');
  const [showPreview, setShowPreview] = useState(false);

  const boxDisplayId = `SHP-${shipmentId.slice(-6)}-BX${boxNumber}`;

  const generateLabel = async (format: 'pdf' | 'html' = 'pdf') => {
    if (!awbNumber) {
      toast.error('AWB number is required to generate label');
      return;
    }

    setIsGenerating(true);
    try {
      if (format === 'pdf') {
        // Direct download for PDF
        const downloadUrl = `/api/labels/download/${boxId}?format=${labelFormat}&size=${labelSize}`;
        window.open(downloadUrl, '_blank');
        toast.success('Label download initiated');
      } else {
        // Generate HTML preview
        const response = await fetch('/api/labels/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boxId,
            options: {
              format: 'html',
              preview: true,
              size: labelSize,
              includeQR: true
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate label preview');
        }

        const data = await response.json();
        setLabelData(data.labelData);
        setPreviewHtml(data.labelHTML);
        setShowPreview(true);
        
        toast.success('Label preview generated');
      }

      if (onLabelGenerated) {
        onLabelGenerated({ boxId, format, success: true });
      }

    } catch (error) {
      console.error('Error generating label:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate label');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadLabel = () => {
    if (!awbNumber) {
      toast.error('AWB number is required');
      return;
    }

    const downloadUrl = `/api/labels/download/${boxId}?format=${labelFormat}&size=${labelSize}`;
    window.open(downloadUrl, '_blank');
  };

  const printLabel = () => {
    if (!previewHtml) {
      toast.error('Please generate preview first');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(previewHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Shipping Label Manager
            </CardTitle>
            <CardDescription>
              Generate and manage shipping labels for Box #{boxDisplayId}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {awbNumber ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                AWB: {awbNumber}
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No AWB
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Label Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <Select value={labelFormat} onValueChange={(value: 'pdf' | 'html') => setLabelFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF (Download)</SelectItem>
                <SelectItem value="html">HTML (Preview)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <Select value={labelSize} onValueChange={(value: 'label' | 'A4' | 'A5') => setLabelSize(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="label">Label (4" x 6")</SelectItem>
                <SelectItem value="A5">A5 Paper</SelectItem>
                <SelectItem value="A4">A4 Paper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => generateLabel(labelFormat)}
            disabled={!awbNumber || isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : labelFormat === 'pdf' ? (
              <Download className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : labelFormat === 'pdf' ? 'Download PDF' : 'Preview Label'}
          </Button>

          <Button
            variant="outline"
            onClick={downloadLabel}
            disabled={!awbNumber}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Quick Download
          </Button>

          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => generateLabel('html')}
                disabled={!awbNumber}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Label Preview - {boxDisplayId}</DialogTitle>
                <DialogDescription>
                  Preview of the shipping label with QR code and part details
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {previewHtml && (
                  <div className="border rounded-lg p-4 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={printLabel}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Label
                  </Button>
                  <Button
                    onClick={() => generateLabel('pdf')}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Label Information */}
        {labelData && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Label Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Box ID:</strong> {boxDisplayId}</p>
                <p><strong>AWB:</strong> {labelData.awbNumber}</p>
                <p><strong>Weight:</strong> {labelData.totalWeight} kg</p>
              </div>
              <div>
                <p><strong>Brand:</strong> {labelData.brandName}</p>
                <p><strong>Parts:</strong> {labelData.partsSummary.length} items</p>
                <p><strong>Generated:</strong> {labelData.createdDate}</p>
              </div>
            </div>
            
            {labelData.trackingUrl && (
              <div className="mt-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open(labelData.trackingUrl, '_blank')}
                  className="flex items-center gap-1 p-0 h-auto"
                >
                  <Truck className="h-3 w-3" />
                  Track Shipment
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <QrCode className="h-3 w-3" />
            Labels include QR codes for easy tracking and part identification
          </p>
        </div>
      </CardContent>
    </Card>
  );
}