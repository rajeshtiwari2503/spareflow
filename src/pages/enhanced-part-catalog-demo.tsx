import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Video, 
  FileImage, 
  PlayCircle, 
  Zap, 
  Monitor, 
  Volume2, 
  Settings, 
  Smartphone, 
  Globe, 
  Gauge, 
  Shield,
  Package,
  Star,
  Eye,
  Info,
  CheckCircle,
  AlertCircle,
  Tv,
  Wrench,
  Brain,
  ImageIcon
} from 'lucide-react';
import EnhancedPartCatalogWithMedia from '@/components/EnhancedPartCatalogWithMedia';
import { useToast } from '@/components/ui/use-toast';

// Mock data for demonstration
const DEMO_PARTS = [
  {
    id: 'demo-1',
    code: 'TV-PSU-001',
    name: 'TV Power Supply Board',
    description: 'Universal power supply board for LED/LCD TVs',
    price: 45.99,
    category: 'Electronics',
    subCategory: 'Power Supply',
    imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop',
    imageUrls: JSON.stringify([
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=300&fit=crop'
    ]),
    diyVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    installationVideos: JSON.stringify([
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ]),
    technicalDrawings: JSON.stringify([
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=300&fit=crop'
    ]),
    problemKeywords: 'no power, won\'t turn on, dead, blank screen, power issues',
    symptoms: 'TV won\'t turn on, no display, power LED not working, clicking sound from TV',
    compatibleAppliances: 'LED TV, LCD TV, Smart TV, 32-55 inch TVs',
    installationDifficulty: 'MEDIUM',
    commonFailureReasons: 'Power surges, age-related component failure, overheating, voltage fluctuations',
    troubleshootingSteps: '1. Check power cable\n2. Test with different outlet\n3. Look for burnt components on board\n4. Check fuses',
    urgencyLevel: 'HIGH',
    customerDescription: 'This power supply board provides electricity to your TV. If your TV won\'t turn on or has power issues, this part likely needs replacement.',
    technicalSpecs: 'Input: AC 100-240V, Output: DC 12V 5A, Power: 60W, Efficiency: >85%',
    safetyWarnings: 'Disconnect power before installation, Handle with anti-static precautions',
    featured: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brand: { id: 'demo-brand', name: 'Demo Electronics', email: 'demo@example.com' }
  },
  {
    id: 'demo-2',
    code: 'AC-FAN-002',
    name: 'AC Cooling Fan Motor',
    description: 'High-efficiency cooling fan motor for air conditioners',
    price: 89.99,
    category: 'Motor',
    subCategory: 'Cooling Fan',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    imageUrls: JSON.stringify([
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'
    ]),
    diyVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    installationVideos: JSON.stringify([
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ]),
    problemKeywords: 'fan not working, overheating, no cooling, hot air',
    symptoms: 'AC not cooling, fan not spinning, overheating unit, unusual noise',
    compatibleAppliances: 'Split AC, Window AC, Central AC, 1-2 Ton capacity',
    installationDifficulty: 'HARD',
    commonFailureReasons: 'Bearing wear, electrical failure, dust accumulation, age',
    troubleshootingSteps: '1. Check power supply\n2. Inspect fan blades\n3. Test motor windings\n4. Check capacitor',
    urgencyLevel: 'HIGH',
    customerDescription: 'This fan motor circulates air in your AC unit. If your AC is not cooling or making noise, this motor may need replacement.',
    technicalSpecs: 'Voltage: 220V AC, Power: 150W, Speed: 1350 RPM, Bearing: Ball bearing',
    safetyWarnings: 'Turn off power and gas supply, Professional installation recommended',
    featured: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brand: { id: 'demo-brand', name: 'Demo Electronics', email: 'demo@example.com' }
  },
  {
    id: 'demo-3',
    code: 'WM-CTRL-003',
    name: 'Washing Machine Control Board',
    description: 'Electronic control board for automatic washing machines',
    price: 125.50,
    category: 'Electronics',
    subCategory: 'Control Board',
    imageUrl: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    imageUrls: JSON.stringify([
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop'
    ]),
    diyVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    problemKeywords: 'buttons not working, display not working, program not starting',
    symptoms: 'Control panel not responding, display blank, programs not starting, error codes',
    compatibleAppliances: 'Front Load Washing Machine, Top Load Washing Machine, 6-8 kg capacity',
    installationDifficulty: 'EXPERT',
    commonFailureReasons: 'Water damage, electrical surge, component aging, moisture',
    troubleshootingSteps: '1. Check power connection\n2. Inspect for water damage\n3. Test button response\n4. Check error codes',
    urgencyLevel: 'MEDIUM',
    customerDescription: 'This control board manages all washing machine functions. If buttons don\'t work or programs won\'t start, this board may be faulty.',
    technicalSpecs: 'Voltage: 220V AC, Microcontroller: ARM Cortex, Display: LED, Programs: 12',
    safetyWarnings: 'Disconnect power and water supply, Professional installation required',
    featured: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brand: { id: 'demo-brand', name: 'Demo Electronics', email: 'demo@example.com' }
  }
];

const FAULT_CATEGORIES = [
  {
    id: 'power',
    name: 'Power Issues',
    description: 'Device won\'t turn on, power problems, electrical issues',
    icon: Zap,
    keywords: ['no power', 'won\'t turn on', 'dead', 'not starting', 'power supply', 'electrical'],
    urgency: 'HIGH',
    color: 'red'
  },
  {
    id: 'display',
    name: 'Display Problems',
    description: 'Screen issues, no display, flickering, color problems',
    icon: Monitor,
    keywords: ['no display', 'blank screen', 'flickering', 'lines on screen', 'color issues', 'dim display'],
    urgency: 'MEDIUM',
    color: 'blue'
  },
  {
    id: 'mechanical',
    name: 'Mechanical Failures',
    description: 'Moving parts, motors, fans, mechanical components',
    icon: Settings,
    keywords: ['motor failure', 'fan not working', 'mechanical noise', 'stuck parts', 'vibration'],
    urgency: 'MEDIUM',
    color: 'orange'
  },
  {
    id: 'control',
    name: 'Control Issues',
    description: 'Remote control, buttons, user interface problems',
    icon: Smartphone,
    keywords: ['remote not working', 'buttons not responding', 'control issues', 'interface problems'],
    urgency: 'LOW',
    color: 'green'
  }
];

export default function EnhancedPartCatalogDemo() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedDemo, setSelectedDemo] = useState('overview');
  const [mockParts, setMockParts] = useState(DEMO_PARTS);

  const handlePartCreated = (part: any) => {
    setMockParts(prev => [part, ...prev]);
    toast({
      title: "Success",
      description: "Demo part created successfully!"
    });
  };

  const handlePartUpdated = (part: any) => {
    setMockParts(prev => prev.map(p => p.id === part.id ? part : p));
    toast({
      title: "Success", 
      description: "Demo part updated successfully!"
    });
  };

  const renderMediaPreview = (part: any) => {
    const additionalImages = part.imageUrls ? JSON.parse(part.imageUrls) : [];
    const installationVideos = part.installationVideos ? JSON.parse(part.installationVideos) : [];
    const technicalDrawings = part.technicalDrawings ? JSON.parse(part.technicalDrawings) : [];
    
    const allMedia = [
      ...(part.imageUrl ? [{ url: part.imageUrl, type: 'image', title: 'Primary Image' }] : []),
      ...additionalImages.map((url: string, index: number) => ({ url, type: 'image', title: `Image ${index + 1}` })),
      ...(part.diyVideoUrl ? [{ url: part.diyVideoUrl, type: 'video', title: 'DIY Video' }] : []),
      ...installationVideos.map((url: string, index: number) => ({ url, type: 'video', title: `Installation Video ${index + 1}` })),
      ...technicalDrawings.map((url: string, index: number) => ({ url, type: 'image', title: `Technical Drawing ${index + 1}` }))
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {allMedia.slice(0, 4).map((media, index) => (
          <div key={index} className="relative group">
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-20 object-cover rounded border"
              />
            ) : (
              <div className="w-full h-20 bg-black rounded border flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {media.type === 'video' ? (
                  <PlayCircle className="w-6 h-6 text-white" />
                ) : (
                  <Eye className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
        {allMedia.length > 4 && (
          <div className="w-full h-20 bg-gray-100 rounded border flex items-center justify-center">
            <span className="text-sm text-gray-600">+{allMedia.length - 4} more</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Part Catalog with Media</h1>
              <p className="text-gray-600 mt-2">
                Comprehensive parts catalog with images, videos, and fault-based filtering for customers and service centers
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard/brand')} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={selectedDemo} onValueChange={setSelectedDemo} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Key Features</TabsTrigger>
            <TabsTrigger value="demo-data">Demo Data</TabsTrigger>
            <TabsTrigger value="live-catalog">Live Catalog</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Enhanced Part Catalog Implementation:</strong> This demo showcases the comprehensive part catalog with 
                images, DIY videos, installation guides, technical drawings, and AI-powered fault-based filtering. 
                Customers and service centers can now find parts based on problem symptoms and appliance types.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Media Support */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5 text-blue-600" />
                    <span>Rich Media Support</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Multiple product images</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Video className="h-4 w-4 text-red-600" />
                      <span className="text-sm">DIY repair videos</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PlayCircle className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Installation guides</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileImage className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Technical drawings</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fault-Based Filtering */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <span>AI-Powered Search</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Power issues detection</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Display problems</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Mechanical failures</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Control issues</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Experience */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <span>Enhanced UX</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Symptom-based search</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wrench className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Installation difficulty</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Urgency indicators</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tv className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Appliance compatibility</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fault Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Fault Categories for Smart Filtering</CardTitle>
                <CardDescription>
                  Parts are automatically categorized based on the problems they solve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {FAULT_CATEGORIES.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <div key={category.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center space-x-3 mb-2">
                          <IconComponent className={`h-6 w-6 text-${category.color}-500`} />
                          <h3 className="font-semibold">{category.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                        <Badge variant="outline" className={`text-${category.color}-700 border-${category.color}-300`}>
                          {category.urgency} Priority
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Enhanced Media Management</CardTitle>
                  <CardDescription>Comprehensive media support for better customer experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <ImageIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Multiple Product Images</h4>
                        <p className="text-sm text-gray-600">Primary image plus additional gallery images for different angles and details</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Video className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">DIY Repair Videos</h4>
                        <p className="text-sm text-gray-600">Step-by-step video guides for customers to repair issues themselves</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <PlayCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Installation Videos</h4>
                        <p className="text-sm text-gray-600">Professional installation guides for service centers</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <FileImage className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Technical Drawings</h4>
                        <p className="text-sm text-gray-600">Detailed technical diagrams and schematics</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI-Powered Features */}
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Search & Recommendations</CardTitle>
                  <CardDescription>Smart part discovery based on problem symptoms</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Problem-Based Search</h4>
                        <p className="text-sm text-gray-600">Find parts by describing the problem instead of knowing part names</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Tv className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Appliance Compatibility</h4>
                        <p className="text-sm text-gray-600">Automatic filtering based on appliance type and model</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Wrench className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Installation Difficulty</h4>
                        <p className="text-sm text-gray-600">Clear indicators for DIY vs professional installation</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Urgency Levels</h4>
                        <p className="text-sm text-gray-600">Priority indicators for critical vs non-critical repairs</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Implementation Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Benefits</CardTitle>
                <CardDescription>How this enhances the SpareFlow platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Improved Customer Experience</h3>
                    <p className="text-sm text-gray-600">Customers can easily find parts by describing their problems, with visual guides for installation</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Star className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">Enhanced Service Center Support</h3>
                    <p className="text-sm text-gray-600">Service centers get detailed technical information, installation videos, and troubleshooting guides</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Brain className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">AI-Driven Efficiency</h3>
                    <p className="text-sm text-gray-600">Intelligent part recommendations reduce search time and improve accuracy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Data Tab */}
          <TabsContent value="demo-data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Demo Parts with Enhanced Media</CardTitle>
                <CardDescription>
                  Sample parts showcasing the new media and AI-optimized features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockParts.map((part) => (
                    <div key={part.id} className="border rounded-lg p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Part Info */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{part.name}</h3>
                            <Badge variant="outline">{part.code}</Badge>
                          </div>
                          
                          <p className="text-gray-600">{part.customerDescription}</p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Price:</span> ${part.price}
                            </div>
                            <div>
                              <span className="font-medium">Category:</span> {part.category}
                            </div>
                            <div>
                              <span className="font-medium">Installation:</span> 
                              <Badge variant="outline" className="ml-2 text-xs">
                                {part.installationDifficulty}
                              </Badge>
                            </div>
                            <div>
                              <span className="font-medium">Urgency:</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {part.urgencyLevel}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <span className="font-medium text-sm">Compatible with:</span>
                            <p className="text-sm text-gray-600">{part.compatibleAppliances}</p>
                          </div>

                          <div>
                            <span className="font-medium text-sm">Problem Keywords:</span>
                            <p className="text-sm text-gray-600">{part.problemKeywords}</p>
                          </div>
                        </div>

                        {/* Media Preview */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Media Gallery</h4>
                          {renderMediaPreview(part)}
                          
                          <div className="flex flex-wrap gap-2">
                            {part.diyVideoUrl && (
                              <Badge variant="outline" className="text-xs">
                                <PlayCircle className="w-3 h-3 mr-1" />
                                DIY Video
                              </Badge>
                            )}
                            {part.installationVideos && JSON.parse(part.installationVideos).length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Video className="w-3 h-3 mr-1" />
                                Installation Guide
                              </Badge>
                            )}
                            {part.technicalDrawings && JSON.parse(part.technicalDrawings).length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <FileImage className="w-3 h-3 mr-1" />
                                Technical Drawings
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Catalog Tab */}
          <TabsContent value="live-catalog" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Interactive Demo:</strong> This is a fully functional part catalog with all the enhanced features. 
                You can test the fault-based filtering, media gallery, and AI-powered search capabilities.
              </AlertDescription>
            </Alert>

            {/* Live Component */}
            <div className="bg-white rounded-lg border">
              <EnhancedPartCatalogWithMedia
                brandId="demo-brand"
                userRole="BRAND"
                onPartCreated={handlePartCreated}
                onPartUpdated={handlePartUpdated}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}