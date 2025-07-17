import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/Footer';
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
  Lightbulb
} from 'lucide-react';

interface SearchResult {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  weight: number;
  msl: number;
  diyVideoUrl?: string;
  hasVideo: boolean;
  similarityScore: number;
  matchReason: string;
  brand: {
    id: string;
    name: string;
  };
}

interface SearchResponse {
  query: string;
  enhancedQueries: string[];
  results: SearchResult[];
  totalParts: number;
  matchedParts: number;
  message: string;
}

const EXAMPLE_QUERIES = [
  "my LED is blinking red",
  "display not working",
  "motor making noise",
  "device overheating",
  "power button not responding",
  "screen flickering",
  "battery not charging",
  "fan not spinning"
];

export default function DIYSearchPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          brandId: selectedBrand || undefined,
          limit: 10
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        console.error('Search failed');
      }
    } catch (error) {
      console.error('Error performing search:', error);
    }
    setLoading(false);
  };

  const handleExampleQuery = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const getVideoEmbedUrl = (url: string): string => {
    // Convert YouTube URLs to embed format
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // For direct MP4 or other video URLs, return as is
    return url;
  };

  const getSimilarityColor = (score: number): string => {
    if (score >= 0.7) return 'text-green-600 bg-green-100';
    if (score >= 0.4) return 'text-blue-600 bg-blue-100';
    return 'text-orange-600 bg-orange-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-3 mb-4"
            >
              <div className="p-3 bg-blue-600 rounded-full">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">AI DIY Assistant</h1>
              <Sparkles className="w-6 h-6 text-blue-600" />
            </motion.div>
            <p className="text-xl text-gray-600 mb-2">
              Describe your problem and find the right spare part with video instructions
            </p>
            <p className="text-sm text-gray-500">
              Powered by semantic search technology
            </p>
          </div>

          {/* Search Interface */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for Parts
              </CardTitle>
              <CardDescription>
                Describe your issue in natural language (e.g., "my LED is blinking red")
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Input */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your problem... (e.g., display not working, motor making noise)"
                    className="text-lg py-3"
                  />
                </div>
                <Button 
                  onClick={performSearch} 
                  disabled={loading || !query.trim()}
                  size="lg"
                  className="px-8"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Example Queries */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Try these examples:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.map((example, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleExampleQuery(example)}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      "{example}"
                    </motion.button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Search Summary */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Search className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Search Results</h3>
                          <p className="text-sm text-gray-600">
                            Query: "{searchResults.query}"
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{searchResults.matchedParts} matches found</p>
                        <p className="text-sm text-gray-600">
                          from {searchResults.totalParts} total parts
                        </p>
                      </div>
                    </div>

                    {searchResults.enhancedQueries.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium">AI Enhanced Search Terms:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {searchResults.enhancedQueries.map((term, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Results Grid */}
                {searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {searchResults.results.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="h-full">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                  <Package className="w-5 h-5 text-blue-600" />
                                  {result.code}
                                </CardTitle>
                                <CardDescription className="mt-1">
                                  {result.name}
                                </CardDescription>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge 
                                  className={`${getSimilarityColor(result.similarityScore)} border-0`}
                                >
                                  {Math.round(result.similarityScore * 100)}% match
                                </Badge>
                                {result.hasVideo && (
                                  <Badge variant="default" className="flex items-center gap-1">
                                    <Video className="w-3 h-3" />
                                    Has Video
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Part Description */}
                            <div>
                              <p className="text-gray-700">{result.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Weight className="w-3 h-3" />
                                  {result.weight}kg
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${result.price}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {result.msl} months MSL
                                </div>
                              </div>
                            </div>

                            {/* Match Reason */}
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium">Match Reason:</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{result.matchReason}</p>
                            </div>

                            {/* Video Section */}
                            {result.diyVideoUrl ? (
                              <div className="space-y-3">
                                <Separator />
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium">DIY Repair Video</span>
                                </div>
                                
                                {/* Video Embed or Link */}
                                {result.diyVideoUrl.includes('youtube.com') || result.diyVideoUrl.includes('youtu.be') ? (
                                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                                    <iframe
                                      src={getVideoEmbedUrl(result.diyVideoUrl)}
                                      className="w-full h-full"
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      title={`DIY video for ${result.name}`}
                                    />
                                  </div>
                                ) : (
                                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                                    <Video className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-600 mb-3">
                                      Video available for this part
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(result.diyVideoUrl, '_blank')}
                                    >
                                      <Play className="w-4 h-4 mr-2" />
                                      Watch Video
                                      <ExternalLink className="w-3 h-3 ml-2" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-800">
                                    No video available for this part
                                  </span>
                                </div>
                                <p className="text-sm text-orange-700 mt-1">
                                  Contact support for repair instructions
                                </p>
                              </div>
                            )}

                            {/* Brand Info */}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="text-sm text-gray-600">
                                Brand: <span className="font-medium">{result.brand.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span className="text-sm font-medium">
                                  {Math.round(result.similarityScore * 5 * 10) / 10}/5.0
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="text-center py-12">
                      <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No matching parts found</h3>
                      <p className="text-gray-600 mb-4">{searchResults.message}</p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <p>Try:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Using different keywords</li>
                          <li>Being more specific about the problem</li>
                          <li>Describing the symptoms you're seeing</li>
                          <li>Mentioning the device or component type</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Help Section */}
          {!searchResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  How to Use the AI DIY Assistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Search Tips:</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Describe the problem in natural language</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Include symptoms (blinking, noise, not working)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Mention colors, patterns, or behaviors</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Be specific about the component</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">What You'll Get:</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Video className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span>Matching spare parts with repair videos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Brain className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>AI-powered similarity matching</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <span>Confidence scores for each match</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Part specifications and pricing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
      
      <Footer />
    </div>
  );
}