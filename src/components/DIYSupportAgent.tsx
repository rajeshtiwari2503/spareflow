import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedInput } from '@/components/ui/enhanced-input';
import { EnhancedLoading } from '@/components/ui/enhanced-loading';
import { validators } from '@/lib/validation';
import { 
  Search, 
  Video, 
  Package, 
  Loader2, 
  Play, 
  ExternalLink, 
  Star,
  Clock,
  DollarSign,
  Weight,
  AlertCircle,
  CheckCircle,
  Brain,
  Sparkles,
  HelpCircle,
  Lightbulb,
  ShoppingCart,
  Wrench,
  Phone,
  AlertTriangle,
  TrendingUp,
  History,
  Target,
  Zap,
  Shield,
  Info
} from 'lucide-react';

interface DiagnosisResult {
  issue: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  confidence: number;
  explanation: string;
  recommendations: string[];
}

interface ProbablePart {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  weight: number;
  msl: number;
  diyVideoUrl?: string;
  hasVideo: boolean;
  relevanceScore: number;
  brand: {
    id: string;
    name: string;
  };
  historicalFrequency: number;
  historicalReasons: string[];
  matchReason: string;
  imageUrl: string;
}

interface HistoricalPattern {
  totalSimilarRequests: number;
  commonFailures: Array<{
    partId: string;
    partName: string;
    frequency: number;
    reasons: string[];
  }>;
}

interface DiagnosisResponse {
  success: boolean;
  diagnosis: DiagnosisResult;
  probableParts: ProbablePart[];
  historicalPatterns: HistoricalPattern;
  searchAnalysis: {
    keywords: string[];
    suggestedParts: string[];
    searchTermsUsed: string[];
  };
  actions: {
    canOrderParts: boolean;
    canRequestTechnician: boolean;
    canCreateReverseRequest: boolean;
  };
}

interface DIYSupportAgentProps {
  userId?: string;
  userRole?: string;
  onOrderPart?: (partId: string) => void;
  onRequestTechnician?: (issue: string, severity: string) => void;
  onCreateReverseRequest?: (partId: string, reason: string) => void;
}

const EXAMPLE_ISSUES = [
  "TV not turning on after power cut",
  "burnt smell + not cooling",
  "LED is blinking red",
  "motor making grinding noise",
  "display flickering intermittently",
  "water leaking from bottom",
  "device overheating constantly",
  "buttons not responding"
];

const SEVERITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200'
};

const SEVERITY_ICONS = {
  CRITICAL: AlertTriangle,
  HIGH: AlertCircle,
  MEDIUM: Info,
  LOW: CheckCircle
};

export function DIYSupportAgent({ 
  userId, 
  userRole = 'CUSTOMER',
  onOrderPart,
  onRequestTechnician,
  onCreateReverseRequest
}: DIYSupportAgentProps) {
  const [issue, setIssue] = useState('');
  const [appliance, setAppliance] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPart, setSelectedPart] = useState<ProbablePart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  const validateInputs = () => {
    const errors: Record<string, string[]> = {};
    
    // Validate issue description
    const issueValidation = [
      validators.required,
      validators.minLength(10),
      validators.maxLength(1000)
    ];
    
    issueValidation.forEach(validator => {
      const error = validator(issue);
      if (error) {
        if (!errors.issue) errors.issue = [];
        errors.issue.push(error);
      }
    });

    // Validate appliance if provided
    if (appliance.trim()) {
      const applianceError = validators.maxLength(100)(appliance);
      if (applianceError) {
        errors.appliance = [applianceError];
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const performDiagnosis = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai-support/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: issue.trim(),
          appliance: appliance.trim() || undefined,
          userId,
          userRole
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success === false) {
        throw new Error(data.error || 'Diagnosis failed');
      }
      
      // Ensure all required arrays exist with safe defaults
      const safeData = {
        ...data,
        diagnosis: data.diagnosis ? {
          ...data.diagnosis,
          recommendations: Array.isArray(data.diagnosis.recommendations) ? data.diagnosis.recommendations : []
        } : {
          issue: 'Analysis complete',
          severity: 'MEDIUM',
          category: 'GENERAL',
          confidence: 50,
          explanation: 'Unable to provide detailed analysis',
          recommendations: []
        },
        probableParts: Array.isArray(data.probableParts) ? data.probableParts : [],
        historicalPatterns: data.historicalPatterns ? {
          ...data.historicalPatterns,
          commonFailures: Array.isArray(data.historicalPatterns.commonFailures) ? data.historicalPatterns.commonFailures : []
        } : {
          totalSimilarRequests: 0,
          commonFailures: []
        },
        searchAnalysis: data.searchAnalysis ? {
          ...data.searchAnalysis,
          keywords: Array.isArray(data.searchAnalysis.keywords) ? data.searchAnalysis.keywords : [],
          suggestedParts: Array.isArray(data.searchAnalysis.suggestedParts) ? data.searchAnalysis.suggestedParts : [],
          searchTermsUsed: Array.isArray(data.searchAnalysis.searchTermsUsed) ? data.searchAnalysis.searchTermsUsed : []
        } : {
          keywords: [],
          suggestedParts: [],
          searchTermsUsed: []
        },
        actions: data.actions || {
          canOrderParts: false,
          canRequestTechnician: false,
          canCreateReverseRequest: false
        }
      };
      
      setDiagnosisResult(safeData);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error performing diagnosis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to perform diagnosis';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    performDiagnosis();
  };

  const handleExampleIssue = (exampleIssue: string) => {
    setIssue(exampleIssue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      performDiagnosis();
    }
  };

  const getVideoEmbedUrl = (url: string): string => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-blue-600 bg-blue-100';
    if (confidence >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRelevanceColor = (score: number): string => {
    if (score >= 25) return 'text-green-600 bg-green-100';
    if (score >= 15) return 'text-blue-600 bg-blue-100';
    return 'text-orange-600 bg-orange-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <div className="p-3 bg-blue-600 rounded-full">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">AI Support Agent</h2>
          <Sparkles className="w-6 h-6 text-blue-600" />
        </motion.div>
        <p className="text-lg text-gray-600 mb-2">
          Describe your issue and get instant AI-powered diagnosis with repair solutions
        </p>
        <p className="text-sm text-gray-500">
          Powered by semantic analysis and historical repair patterns
        </p>
      </div>

      {/* Input Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Describe Your Issue
          </CardTitle>
          <CardDescription>
            Tell us what's wrong with your device in natural language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Issue Description */}
          <EnhancedInput
            label="Issue Description"
            value={issue}
            onChange={(value, isValid) => {
              setIssue(value);
              if (validationErrors.issue) {
                setValidationErrors(prev => ({ ...prev, issue: [] }));
              }
            }}
            onKeyPress={handleKeyPress}
            placeholder="Describe the problem... (e.g., TV not turning on after power cut, burnt smell + not cooling)"
            error={validationErrors.issue}
            required
            validationRules={[
              validators.required,
              validators.minLength(10),
              validators.maxLength(1000)
            ]}
            showValidation
            validateOnChange
            validateOnBlur
            characterLimit={1000}
            showCharacterCount
            helpText="Provide as much detail as possible for better diagnosis"
            disabled={loading}
          />

          {/* Appliance Type (Optional) */}
          <EnhancedInput
            label="Appliance Type (Optional)"
            value={appliance}
            onChange={(value) => {
              setAppliance(value);
              if (validationErrors.appliance) {
                setValidationErrors(prev => ({ ...prev, appliance: [] }));
              }
            }}
            placeholder="e.g., TV, Refrigerator, Washing Machine, Air Conditioner"
            error={validationErrors.appliance}
            validationRules={[validators.maxLength(100)]}
            showValidation
            validateOnChange={false}
            validateOnBlur
            characterLimit={100}
            helpText="Helps narrow down the diagnosis"
            disabled={loading}
          />

          {/* Action Button */}
          <Button 
            onClick={performDiagnosis} 
            disabled={loading || !issue.trim()}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Issue...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Get AI Diagnosis
              </>
            )}
          </Button>

          {/* Example Issues */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Try these examples:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_ISSUES.map((example, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleExampleIssue(example)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                >
                  "{example}"
                </motion.button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EnhancedLoading
              error={error}
              onRetry={handleRetry}
              retryCount={retryCount}
              maxRetries={3}
              showRetry={retryCount < 3}
              customMessages={{
                error: 'Failed to analyze your issue',
                retry: 'Try Again',
                networkError: 'Please check your connection and try again'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EnhancedLoading
              loading={true}
              title="Analyzing Your Issue"
              description="Our AI is processing your description and searching for solutions..."
              stage="Running semantic analysis"
              showStage
              variant="dots"
              size="lg"
              customMessages={{
                loading: 'Please wait while we analyze your issue'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diagnosis Results */}
      <AnimatePresence>
        {diagnosisResult && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* AI Diagnosis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  AI Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Severity and Confidence */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${SEVERITY_COLORS[diagnosisResult.diagnosis.severity]} border`}>
                      {React.createElement(SEVERITY_ICONS[diagnosisResult.diagnosis.severity], { 
                        className: "w-4 h-4 mr-1" 
                      })}
                      {diagnosisResult.diagnosis.severity}
                    </Badge>
                    <Badge className={`${getConfidenceColor(diagnosisResult.diagnosis.confidence)} border-0`}>
                      <Zap className="w-3 h-3 mr-1" />
                      {diagnosisResult.diagnosis.confidence}% Confidence
                    </Badge>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {diagnosisResult.diagnosis.category}
                  </Badge>
                </div>

                {/* Explanation */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-gray-800">{diagnosisResult.diagnosis.explanation}</p>
                </div>

                {/* Recommendations */}
                {diagnosisResult.diagnosis.recommendations && diagnosisResult.diagnosis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Recommendations:
                    </h4>
                    <ul className="space-y-1">
                      {diagnosisResult.diagnosis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700 pl-4">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Historical Patterns */}
                {diagnosisResult.historicalPatterns && diagnosisResult.historicalPatterns.totalSimilarRequests > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Historical Analysis:</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Found {diagnosisResult.historicalPatterns.totalSimilarRequests} similar cases in our database.
                      {diagnosisResult.historicalPatterns.commonFailures && diagnosisResult.historicalPatterns.commonFailures.length > 0 && (
                        <span className="ml-1">
                          Most common failures: {diagnosisResult.historicalPatterns.commonFailures.map(f => f.partName).join(', ')}.
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Probable Parts */}
            {diagnosisResult.probableParts && diagnosisResult.probableParts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h3 className="text-xl font-semibold">Probable Faulty Parts</h3>
                  <Badge variant="outline">{diagnosisResult.probableParts.length} matches</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {diagnosisResult.probableParts.map((part, index) => (
                    <motion.div
                      key={part.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-blue-600" />
                                {part.code}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {part.name}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge className={`${getRelevanceColor(part.relevanceScore)} border-0`}>
                                {part.relevanceScore} score
                              </Badge>
                              {part.hasVideo && (
                                <Badge variant="default" className="flex items-center gap-1">
                                  <Video className="w-3 h-3" />
                                  DIY Video
                                </Badge>
                              )}
                              {part.historicalFrequency > 0 && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  {part.historicalFrequency}x reported
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Part Details */}
                          <div>
                            <p className="text-gray-700 text-sm">{part.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Weight className="w-3 h-3" />
                                {part.weight}kg
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                ${part.price}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {part.msl}mo MSL
                              </div>
                            </div>
                          </div>

                          {/* Match Reason */}
                          <div className="p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Match Reason: </span>
                            <span className="text-gray-600">{part.matchReason}</span>
                          </div>

                          {/* DIY Video Section */}
                          {part.diyVideoUrl ? (
                            <div className="space-y-2">
                              <Separator />
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-sm">DIY Repair Video</span>
                              </div>
                              
                              {part.diyVideoUrl.includes('youtube.com') || part.diyVideoUrl.includes('youtu.be') ? (
                                <div className="aspect-video rounded overflow-hidden bg-gray-100">
                                  <iframe
                                    src={getVideoEmbedUrl(part.diyVideoUrl)}
                                    className="w-full h-full"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={`DIY video for ${part.name}`}
                                  />
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(part.diyVideoUrl, '_blank')}
                                  className="w-full"
                                >
                                  <Play className="w-4 h-4 mr-2" />
                                  Watch Repair Video
                                  <ExternalLink className="w-3 h-3 ml-2" />
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-sm">
                                No DIY video available for this part. Contact support for guidance.
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2 border-t">
                            {diagnosisResult.actions.canOrderParts && (
                              <Button
                                size="sm"
                                onClick={() => onOrderPart?.(part.id)}
                                className="flex-1"
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Order Part
                              </Button>
                            )}
                            {diagnosisResult.actions.canCreateReverseRequest && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCreateReverseRequest?.(part.id, diagnosisResult.diagnosis.issue)}
                                className="flex-1"
                              >
                                <Wrench className="w-4 h-4 mr-1" />
                                Request Return
                              </Button>
                            )}
                          </div>

                          {/* Brand Info */}
                          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                            <span>Brand: <span className="font-medium">{part.brand.name}</span></span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span>{Math.round((part.relevanceScore / 30) * 5 * 10) / 10}/5.0</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Global Actions */}
                {diagnosisResult.actions.canRequestTechnician && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium">Need Professional Help?</h4>
                            <p className="text-sm text-gray-600">
                              Request a technician visit for complex repairs
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => onRequestTechnician?.(diagnosisResult.diagnosis.issue, diagnosisResult.diagnosis.severity)}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Request Technician
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Parts Found</h3>
                  <p className="text-gray-600 mb-4">
                    The AI couldn't identify specific parts for this issue. This might require professional diagnosis.
                  </p>
                  {diagnosisResult.actions.canRequestTechnician && (
                    <Button
                      onClick={() => onRequestTechnician?.(diagnosisResult.diagnosis.issue, diagnosisResult.diagnosis.severity)}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Request Professional Help
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DIYSupportAgent;