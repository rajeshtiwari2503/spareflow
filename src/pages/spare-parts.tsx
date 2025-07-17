import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ShoppingCart, Play, Truck, Star, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/Footer';

interface Part {
  id: string;
  name: string;
  description: string;
  price: number;
  code: string;
  weight: number;
  diyVideoUrl?: string;
  brand: { id: string; name: string };
  imageUrl: string;
  inventory: number;
  inStock: boolean;
  compatibleAppliances: string[];
  relevanceScore?: number;
}

interface CartItem extends Part {
  quantity: number;
}

interface CheckoutData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  pincode: string;
  paymentMethod: string;
}

export default function SparePartsPortal() {
  const [parts, setParts] = useState<Part[]>([]);
  const [filteredParts, setFilteredParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSearchTerm, setAiSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedAppliance, setSelectedAppliance] = useState('');
  const [selectedPartType, setSelectedPartType] = useState('');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [aiResults, setAiResults] = useState<Part[]>([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    pincode: '',
    paymentMethod: 'cod'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  // Fetch parts with filters
  const fetchParts = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedBrand) params.append('brand', selectedBrand);
      if (selectedAppliance) params.append('appliance', selectedAppliance);
      if (selectedPartType) params.append('partType', selectedPartType);
      if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString());
      if (priceRange[1] < 10000) params.append('maxPrice', priceRange[1].toString());

      const response = await fetch(`/api/public/parts?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch parts');
      }
      
      const data = await response.json();

      if (data.success && data.parts) {
        // Transform the data to match our interface
        const transformedParts = data.parts.map((part: any) => ({
          id: part.id,
          name: part.name,
          description: part.description || '',
          price: part.price,
          code: part.code,
          weight: part.weight || 0.5,
          diyVideoUrl: part.diyVideoUrl,
          brand: part.brand || { id: 'unknown', name: 'Unknown' },
          imageUrl: part.imageUrl || part.images?.[0] || `https://images.unsplash.com/400x300/?${encodeURIComponent(part.name)}+spare+part`,
          inventory: part.stock || part.inventory || 10,
          inStock: part.availability !== 'OUT_OF_STOCK',
          compatibleAppliances: part.compatibleAppliances || ['Universal']
        }));

        setParts(transformedParts);
        setFilteredParts(transformedParts);
        setCurrentPage(data.pagination?.currentPage || 1);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching parts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch parts. Please try again.",
        variant: "destructive"
      });
      // Set empty arrays to prevent crashes
      setParts([]);
      setFilteredParts([]);
    } finally {
      setLoading(false);
    }
  };

  // AI Semantic Search
  const performAiSearch = async () => {
    if (!aiSearchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description of your issue",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/public/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue: aiSearchTerm,
          appliance: selectedAppliance
        })
      });

      if (!response.ok) {
        throw new Error('AI search failed');
      }

      const data = await response.json();

      if (data.success && data.parts) {
        // Transform the AI results
        const transformedResults = data.parts.map((part: any) => ({
          id: part.id,
          name: part.name,
          description: part.description || '',
          price: part.price,
          code: part.code,
          weight: part.weight || 0.5,
          diyVideoUrl: part.diyVideoUrl,
          brand: part.brand || { id: 'unknown', name: 'Unknown' },
          imageUrl: part.imageUrl || `https://images.unsplash.com/400x300/?${encodeURIComponent(part.name)}+spare+part`,
          inventory: part.inventory || 10,
          inStock: part.inStock !== false,
          compatibleAppliances: part.compatibleAppliances || ['Universal'],
          relevanceScore: part.relevanceScore
        }));

        setAiResults(transformedResults);
        setAiExplanation(data.explanation || 'AI search completed successfully');
        setShowAiSearch(true);
      } else {
        throw new Error('Invalid AI search response');
      }
    } catch (error) {
      console.error('Error in AI search:', error);
      toast({
        title: "Error",
        description: "AI search failed. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Cart functions
  const addToCart = (part: Part) => {
    try {
      const existingItem = cart.find(item => item.id === part.id);
      if (existingItem) {
        setCart(cart.map(item =>
          item.id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        setCart([...cart, { ...part, quantity: 1 }]);
      }
      toast({
        title: "Added to Cart",
        description: `${part.name} added to cart`
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };

  const removeFromCart = (partId: string) => {
    try {
      setCart(cart.filter(item => item.id !== partId));
      toast({
        title: "Removed from Cart",
        description: "Item removed from cart"
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = (partId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeFromCart(partId);
        return;
      }
      setCart(cart.map(item =>
        item.id === partId ? { ...item, quantity } : item
      ));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const getTotalAmount = () => {
    try {
      return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    } catch (error) {
      console.error('Error calculating total:', error);
      return 0;
    }
  };

  // Checkout function
  const handleCheckout = async () => {
    if (!checkoutData.customerName || !checkoutData.customerPhone || !checkoutData.address || !checkoutData.pincode) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const cartItems = cart.map(item => ({
        partId: item.id,
        partName: item.name,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight
      }));

      const response = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: checkoutData.customerName,
          customerPhone: checkoutData.customerPhone,
          customerEmail: checkoutData.customerEmail,
          shippingAddress: {
            address: checkoutData.address,
            pincode: checkoutData.pincode
          },
          items: cartItems,
          totalAmount: getTotalAmount(),
          paymentMethod: checkoutData.paymentMethod
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Order Placed Successfully!",
          description: "You'll receive WhatsApp confirmation shortly."
        });
        setCart([]);
        setShowCheckout(false);
        setShowCart(false);
        // Reset checkout form
        setCheckoutData({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          address: '',
          pincode: '',
          paymentMethod: 'cod'
        });
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to place order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [searchTerm, selectedBrand, selectedAppliance, selectedPartType, priceRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster />
      
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="bg-white shadow-lg border-b"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">SpareFlow</h1>
              <Badge variant="secondary">Public Store</Badge>
            </div>
            <Button
              onClick={() => setShowCart(true)}
              className="relative"
              variant="outline"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cart ({cart.length})
              {cart.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <Label>Search Parts</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by part name, code, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label>AI Issue Search</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe your issue (e.g., 'fan making noise')"
                      value={aiSearchTerm}
                      onChange={(e) => setAiSearchTerm(e.target.value)}
                    />
                    <Button onClick={performAiSearch} disabled={loading}>
                      AI Search
                    </Button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Brands</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="LG">LG</SelectItem>
                      <SelectItem value="Whirlpool">Whirlpool</SelectItem>
                      <SelectItem value="Bosch">Bosch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Appliance</Label>
                  <Select value={selectedAppliance} onValueChange={setSelectedAppliance}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Appliances" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Appliances</SelectItem>
                      <SelectItem value="Washing Machine">Washing Machine</SelectItem>
                      <SelectItem value="Refrigerator">Refrigerator</SelectItem>
                      <SelectItem value="Air Conditioner">Air Conditioner</SelectItem>
                      <SelectItem value="Microwave">Microwave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Part Type</Label>
                  <Select value={selectedPartType} onValueChange={setSelectedPartType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="Motor">Motor</SelectItem>
                      <SelectItem value="Filter">Filter</SelectItem>
                      <SelectItem value="Belt">Belt</SelectItem>
                      <SelectItem value="Sensor">Sensor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={10000}
                    step={100}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Parts Grid */}
        <AnimatePresence>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredParts.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredParts.map((part, index) => (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <div className="relative">
                      <img
                        src={part.imageUrl}
                        alt={part.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = `https://images.unsplash.com/400x300/?${encodeURIComponent(part.name)}+spare+part`;
                        }}
                      />
                      {part.diyVideoUrl && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>DIY Video - {part.name}</DialogTitle>
                            </DialogHeader>
                            <div className="aspect-video">
                              <iframe
                                src={part.diyVideoUrl}
                                className="w-full h-full rounded-lg"
                                allowFullScreen
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Badge
                        className={`absolute top-2 left-2 ${
                          part.inStock ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      >
                        {part.inStock ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-lg line-clamp-2">{part.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {part.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{part.brand.name}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Code: {part.code}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {part.compatibleAppliances.map((appliance, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {appliance}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-primary">
                            ₹{part.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Stock: {part.inventory}
                          </span>
                        </div>
                        <Button
                          onClick={() => addToCart(part)}
                          disabled={!part.inStock}
                          className="w-full"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No parts found</h3>
              <p className="text-gray-600">Try adjusting your search criteria or filters</p>
            </div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-2">
            <Button
              variant="outline"
              onClick={() => fetchParts(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => fetchParts(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shopping Cart ({cart.length} items)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.src = `https://images.unsplash.com/400x300/?${encodeURIComponent(item.name)}+spare+part`;
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.brand.name}</p>
                    <p className="font-bold">₹{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total: ₹{getTotalAmount().toLocaleString()}</span>
              </div>
              <Button
                onClick={() => setShowCheckout(true)}
                className="w-full"
                size="lg"
              >
                Proceed to Checkout
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={checkoutData.customerName}
                  onChange={(e) => setCheckoutData({...checkoutData, customerName: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={checkoutData.customerPhone}
                  onChange={(e) => setCheckoutData({...checkoutData, customerPhone: e.target.value})}
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
            <div>
              <Label>Email (Optional)</Label>
              <Input
                value={checkoutData.customerEmail}
                onChange={(e) => setCheckoutData({...checkoutData, customerEmail: e.target.value})}
                placeholder="Enter your email"
                type="email"
              />
            </div>
            <div>
              <Label>Delivery Address *</Label>
              <Textarea
                value={checkoutData.address}
                onChange={(e) => setCheckoutData({...checkoutData, address: e.target.value})}
                placeholder="Enter your complete delivery address"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Pincode *</Label>
                <Input
                  value={checkoutData.pincode}
                  onChange={(e) => setCheckoutData({...checkoutData, pincode: e.target.value})}
                  placeholder="Enter pincode"
                />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={checkoutData.paymentMethod}
                  onValueChange={(value) => setCheckoutData({...checkoutData, paymentMethod: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cod">Cash on Delivery</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-semibold">Order Summary</h4>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x {item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>₹{getTotalAmount().toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Search Results Dialog */}
      <Dialog open={showAiSearch} onOpenChange={setShowAiSearch}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>AI Search Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {aiExplanation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm">{aiExplanation}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {aiResults.map((part) => (
                <Card key={part.id} className="p-4">
                  <div className="flex space-x-4">
                    <img
                      src={part.imageUrl}
                      alt={part.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = `https://images.unsplash.com/400x300/?${encodeURIComponent(part.name)}+spare+part`;
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{part.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {part.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold">₹{part.price.toLocaleString()}</span>
                        {part.relevanceScore && (
                          <Badge variant="secondary">
                            {part.relevanceScore}% match
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addToCart(part)}
                        className="mt-2 w-full"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}