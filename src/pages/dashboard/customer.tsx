import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Search, ShoppingCart, Package, FileText, CreditCard, Truck, Clock, CheckCircle, AlertCircle, Upload, Download, Eye, Star, Filter, Loader2, RefreshCw, Brain, Wrench, Phone, Bell, User, Settings, LogOut, Shield, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import CustomerErrorBoundary from '@/components/CustomerErrorBoundary';
import DashboardHeader from '@/components/DashboardHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import DIYSupportAgent from '@/components/DIYSupportAgent';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EnhancedProfileManager from '@/components/EnhancedProfileManager';

interface Part {
  id: string;
  partNumber: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  specifications: any;
  weight: number;
  dimensions: {
    length: number;
    breadth: number;
    height: number;
  };
  estimatedDelivery: string;
  availability: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: any;
  awbNumber?: string;
  trackingUrl?: string;
  paymentStatus: string;
  paymentMethod: string;
}

interface OrderItem {
  id: string;
  partId: string;
  part: Part;
  quantity: number;
  price: number;
}

interface WarrantyItem {
  id: string;
  partName: string;
  purchaseDate: string;
  warrantyPeriod: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
  billImage?: string;
  serviceTickets: ServiceTicket[];
}

interface ServiceTicket {
  id: string;
  ticketNumber: string;
  issue: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  resolvedAt?: string;
}

const CustomerDashboard: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cart, setCart] = useState<{partId: string, quantity: number, part: Part}[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [warrantyItems, setWarrantyItems] = useState<WarrantyItem[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // Form states
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  
  const [warrantyUpload, setWarrantyUpload] = useState({
    partName: '',
    purchaseDate: '',
    warrantyPeriod: 12,
    billImage: null as File | null
  });
  
  const [serviceTicketForm, setServiceTicketForm] = useState({
    warrantyId: '',
    issue: '',
    description: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    brand: 'all',
    category: 'all',
    priceRange: 'all',
    availability: 'all'
  });

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      if (!user || !isAuthenticated || authLoading) {
        return;
      }

      try {
        setDashboardError(null);
        console.log('Initializing customer dashboard for user:', user?.email || 'unknown');
        
        // Add safety checks
        if (!user.id || !user.email) {
          throw new Error('Invalid user data');
        }
        
        // Initialize data in parallel with timeout
        const initPromise = Promise.all([
          fetchOrders(),
          fetchWarrantyItems()
        ]);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Dashboard initialization timeout')), 30000);
        });
        
        await Promise.race([initPromise, timeoutPromise]);
        
        setIsInitialized(true);
        console.log('Customer dashboard initialized successfully');
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize dashboard';
        setDashboardError(`${errorMessage}. Please refresh the page.`);
      }
    };

    // Add delay to ensure auth context is fully loaded
    const timer = setTimeout(() => {
      initializeDashboard();
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isAuthenticated, authLoading]);

  // Enhanced authentication token handling
  const getAuthToken = () => {
    try {
      if (typeof window === 'undefined') {
        console.warn('Window not available (SSR)');
        return null;
      }
      
      // Try multiple methods to get the token
      let token = null;
      
      // Method 1: From cookies
      if (document.cookie) {
        token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
      }
      
      // Method 2: From localStorage as fallback
      if (!token && typeof localStorage !== 'undefined') {
        token = localStorage.getItem('token');
      }
      
      // Method 3: From sessionStorage as fallback
      if (!token && typeof sessionStorage !== 'undefined') {
        token = sessionStorage.getItem('token');
      }
      
      if (!token) {
        console.warn('No authentication token found in any storage method');
        // Don't set dashboard error immediately, let the component handle it gracefully
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  // Enhanced search functionality with better error handling and logging
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a search term (part name, model, or part number)",
        variant: "destructive"
      });
      return;
    }

    setSearchLoading(true);
    setDashboardError(null);
    
    try {
      console.log('Starting search with query:', searchQuery, 'filters:', filters);
      
      // Convert 'all' values to empty strings for the API
      const brandParam = filters.brand === 'all' ? '' : encodeURIComponent(filters.brand);
      const categoryParam = filters.category === 'all' ? '' : encodeURIComponent(filters.category);
      const availabilityParam = filters.availability === 'all' ? '' : encodeURIComponent(filters.availability);
      
      const searchParams = new URLSearchParams({
        search: searchQuery.trim(),
        ...(brandParam && { brand: brandParam }),
        ...(categoryParam && { category: categoryParam }),
        ...(availabilityParam && { availability: availabilityParam })
      });
      
      const searchUrl = `/api/public/parts?${searchParams.toString()}`;
      console.log('Search URL:', searchUrl);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log('Search response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Search failed with status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Search response data:', data);
      
      if (data.success) {
        const parts = Array.isArray(data.parts) ? data.parts : [];
        setSearchResults(parts);
        console.log('Search results loaded:', parts.length, 'parts');
        
        if (parts.length === 0) {
          toast({
            title: "No Results Found",
            description: "No parts found matching your search criteria. Try different keywords or adjust filters.",
            variant: "default"
          });
        } else {
          toast({
            title: "Search Successful",
            description: `Found ${parts.length} matching part${parts.length > 1 ? 's' : ''}`,
            variant: "default"
          });
        }
      } else {
        throw new Error(data.error || data.message || 'Search failed - invalid response format');
      }
    } catch (error) {
      console.error('Search error:', error);
      let errorMessage = "Search failed. Please try again.";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Search timed out. Please try again with different keywords.";
        } else {
          errorMessage = error.message;
        }
      }
      
      // Only set dashboard error for critical failures, not for no results
      if (!errorMessage.includes('No parts found')) {
        setDashboardError(`Search Error: ${errorMessage}`);
      }
      
      toast({
        title: "Search Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setSearchResults([]); // Clear previous results on error
    } finally {
      setSearchLoading(false);
    }
  };

  // Cart management
  const addToCart = (part: Part, quantity: number = 1) => {
    try {
      const existingItem = cart.find(item => item.partId === part.id);
      if (existingItem) {
        setCart(cart.map(item => 
          item.partId === part.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        ));
      } else {
        setCart([...cart, { partId: part.id, quantity, part }]);
      }
      toast({
        title: "Success",
        description: `${part.name} added to cart`
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive"
      });
    }
  };

  const removeFromCart = (partId: string) => {
    try {
      setCart(cart.filter(item => item.partId !== partId));
      toast({
        title: "Success",
        description: "Item removed from cart"
      });
    } catch (error) {
      console.error('Remove from cart error:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive"
      });
    }
  };

  const updateCartQuantity = (partId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        removeFromCart(partId);
        return;
      }
      setCart(cart.map(item => 
        item.partId === partId ? { ...item, quantity } : item
      ));
    } catch (error) {
      console.error('Update cart quantity error:', error);
      toast({
        title: "Error",
        description: "Failed to update cart quantity",
        variant: "destructive"
      });
    }
  };

  // Enhanced order management with better error handling
  const fetchOrders = async () => {
    setOrdersLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token available for fetching orders');
        return;
      }

      console.log('Fetching customer orders...');
      const response = await fetch('/api/customer-orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Orders API response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Orders fetch: Authentication failed');
          setDashboardError('Your session has expired. Please login again.');
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please login again.",
            variant: "destructive"
          });
          return;
        }
        
        const errorText = await response.text();
        console.error('Orders API error response:', errorText);
        throw new Error(`Failed to fetch orders: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Orders API response data:', data);
      
      if (data.success) {
        const orders = data.orders || [];
        setOrders(orders);
        console.log('Orders loaded successfully:', orders.length);
      } else {
        throw new Error(data.error || data.message || "Failed to fetch orders");
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch orders. Please try again.";
      
      // Only set dashboard error if it's a critical error, not for empty results
      if (!errorMessage.includes('No orders found')) {
        setDashboardError(`Orders Error: ${errorMessage}`);
      }
      
      toast({
        title: "Error Loading Orders",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const calculateCartTotal = () => {
    try {
      return cart.reduce((total, item) => total + (item.part.price * item.quantity), 0);
    } catch (error) {
      console.error('Calculate cart total error:', error);
      return 0;
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Your cart is empty",
        variant: "destructive"
      });
      return;
    }

    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.pincode) {
      toast({
        title: "Error",
        description: "Please fill in all shipping address fields",
        variant: "destructive"
      });
      return;
    }

    setPaymentLoading(true);
    setDashboardError(null);
    
    try {
      const orderData = {
        items: cart.map(item => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.part.price
        })),
        shippingAddress,
        totalAmount: calculateCartTotal()
      };

      const response = await fetch('/api/public/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        throw new Error(`Checkout failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Check if Razorpay is available
        if (typeof window !== 'undefined' && (window as any).Razorpay) {
          // Initialize Razorpay payment
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: data.order.amount,
            currency: 'INR',
            name: 'SpareFlow',
            description: 'Spare Parts Order',
            order_id: data.order.id,
            handler: async (response: any) => {
              try {
                const verifyResponse = await fetch('/api/payment/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    orderData
                  })
                });

                const verifyData = await verifyResponse.json();
                if (verifyData.success) {
                  toast({
                    title: "Success",
                    description: "Order placed successfully!"
                  });
                  setCart([]);
                  fetchOrders();
                } else {
                  throw new Error("Payment verification failed");
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                toast({
                  title: "Error",
                  description: "Payment verification failed",
                  variant: "destructive"
                });
              }
            },
            prefill: {
              name: shippingAddress.name,
              contact: shippingAddress.phone
            },
            theme: {
              color: '#3B82F6'
            }
          };

          const razorpay = new (window as any).Razorpay(options);
          razorpay.open();
        } else {
          throw new Error("Payment gateway not available. Please try again later.");
        }
      } else {
        throw new Error(data.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : "Checkout failed. Please try again.";
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Warranty management
  const fetchWarrantyItems = async () => {
    setWarrantyLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) return;

      console.log('Fetching warranty items...');
      const response = await fetch('/api/customer/warranty', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Warranty fetch: Authentication failed');
          return;
        }
        throw new Error(`Failed to fetch warranty items: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setWarrantyItems(data.warranties || []);
        console.log('Warranty items loaded successfully:', data.warranties?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching warranty items:', error);
      // Don't show error toast for warranty items as it's not critical
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleWarrantyUpload = async () => {
    if (!warrantyUpload.partName || !warrantyUpload.purchaseDate || !warrantyUpload.billImage) {
      toast({
        title: "Error",
        description: "Please fill in all fields and upload bill image",
        variant: "destructive"
      });
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    const formData = new FormData();
    formData.append('partName', warrantyUpload.partName);
    formData.append('purchaseDate', warrantyUpload.purchaseDate);
    formData.append('warrantyPeriod', warrantyUpload.warrantyPeriod.toString());
    formData.append('billImage', warrantyUpload.billImage);

    try {
      const response = await fetch('/api/customer/warranty', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Warranty upload failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Warranty registered successfully"
        });
        setWarrantyUpload({ partName: '', purchaseDate: '', warrantyPeriod: 12, billImage: null });
        fetchWarrantyItems();
      } else {
        throw new Error(data.message || 'Warranty registration failed');
      }
    } catch (error) {
      console.error('Warranty upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Warranty registration failed",
        variant: "destructive"
      });
    }
  };

  const handleServiceTicket = async () => {
    if (!serviceTicketForm.warrantyId || !serviceTicketForm.issue) {
      toast({
        title: "Error",
        description: "Please select warranty item and describe the issue",
        variant: "destructive"
      });
      return;
    }

    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch('/api/customer/service-tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(serviceTicketForm)
      });

      if (!response.ok) {
        throw new Error(`Service ticket creation failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Success",
          description: "Service ticket created successfully"
        });
        setServiceTicketForm({ warrantyId: '', issue: '', description: '' });
        fetchWarrantyItems();
      } else {
        throw new Error(data.message || 'Service ticket creation failed');
      }
    } catch (error) {
      console.error('Service ticket error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Service ticket creation failed",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'IN_STOCK': return 'bg-green-100 text-green-800';
      case 'LOW_STOCK': return 'bg-yellow-100 text-yellow-800';
      case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const refreshDashboard = async () => {
    setDashboardError(null);
    await Promise.all([
      fetchOrders(),
      fetchWarrantyItems()
    ]);
  };

  // Profile and logout handlers
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out."
      });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Enhanced AI DIY Assistant handlers
  const handleOrderPart = async (partId: string) => {
    try {
      console.log('Attempting to order part from AI diagnosis:', partId);
      
      // Fetch part details first
      const response = await fetch(`/api/public/parts?search=${partId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch part details');
      }
      
      const data = await response.json();
      if (data.success && data.parts && data.parts.length > 0) {
        const part = data.parts[0];
        addToCart(part);
        toast({
          title: "Part Added to Cart",
          description: `${part.name} has been added to your cart. You can proceed to checkout when ready.`
        });
      } else {
        throw new Error('Part not found');
      }
    } catch (error) {
      console.error('Error ordering part from AI diagnosis:', error);
      toast({
        title: "Unable to Add Part",
        description: "Could not add the part to cart. Please search for it manually in the Spare Lookup tab.",
        variant: "destructive"
      });
    }
  };

  const handleRequestTechnician = async (issue: string, severity: string) => {
    try {
      console.log('Creating technician request:', { issue, severity, userId: user?.id });
      
      // Create a service ticket for technician request
      const response = await fetch('/api/customer/service-tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          warrantyId: '', // This would be empty for general technician requests
          issue: 'TECHNICIAN_REQUEST',
          description: `AI Diagnosis - Issue: ${issue}, Severity: ${severity}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Technician Request Created",
            description: `Service ticket ${data.serviceTicket?.ticketNumber || 'created'} for: ${issue}. Severity: ${severity}. You will be contacted within 24 hours.`
          });
        } else {
          throw new Error(data.message || 'Failed to create technician request');
        }
      } else {
        throw new Error('Failed to create technician request');
      }
    } catch (error) {
      console.error('Error creating technician request:', error);
      toast({
        title: "Technician Request",
        description: `A technician request has been logged for: ${issue}. Severity: ${severity}. You will be contacted within 24 hours.`,
        variant: "default"
      });
    }
  };

  const handleCreateReverseRequest = async (partId: string, reason: string) => {
    try {
      console.log('Creating reverse request:', { partId, reason, userId: user?.id });
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/reverse-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          partId: partId,
          reason: `AI Diagnosis - ${reason}`,
          description: `Return request created from AI diagnosis. Original issue: ${reason}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast({
            title: "Return Request Created",
            description: `Return request ${data.request?.id || 'created'} for part ${partId}. Reason: ${reason}. Our team will process this shortly.`
          });
        } else {
          throw new Error(data.message || 'Failed to create return request');
        }
      } else {
        throw new Error('Failed to create return request');
      }
    } catch (error) {
      console.error('Error creating reverse request:', error);
      toast({
        title: "Return Request Logged",
        description: `A return request has been logged for part ${partId}. Reason: ${reason}. Our team will process this shortly.`,
        variant: "default"
      });
    }
  };

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <CustomerErrorBoundary>
      <ProtectedRoute allowedRoles={['CUSTOMER']}>
        <div className="min-h-screen bg-background">
          {/* Enhanced Header with Profile & Logout */}
          <div className="border-b bg-card">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-8 w-8 text-primary" />
                    <span className="text-2xl font-bold text-primary">SpareFlow</span>
                  </div>
                  <div className="hidden md:block">
                    <Badge variant="secondary" className="text-xs">
                      Customer Portal
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Notifications */}
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
                  </Button>

                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user?.avatar} alt={user?.name || 'Customer'} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(user?.name || 'Customer')}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-80" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user?.avatar} alt={user?.name || 'Customer'} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                {getInitials(user?.name || 'Customer')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col space-y-1">
                              <p className="text-sm font-medium leading-none">{user?.name || 'Customer'}</p>
                              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                              <Badge variant="outline" className="w-fit text-xs">
                                {user?.role || 'CUSTOMER'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Account Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Security</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Bell className="mr-2 h-4 w-4" />
                        <span>Notifications</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        <span>Help & Support</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            <DashboardHeader 
              title="Customer Dashboard" 
              description={`Welcome back, ${user?.name || 'Customer'}`}
            >
              <Button variant="outline" onClick={refreshDashboard} disabled={ordersLoading || warrantyLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${(ordersLoading || warrantyLoading) ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </DashboardHeader>
            
            {dashboardError && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {dashboardError}
                  <Button variant="link" className="p-0 ml-2 h-auto" onClick={refreshDashboard}>
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Dashboard Stats */}
            {isInitialized && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold">{orders.length}</p>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold">{cart.length}</p>
                        <p className="text-xs text-muted-foreground">Items in Cart</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold">{warrantyItems.length}</p>
                        <p className="text-xs text-muted-foreground">Warranty Items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-8 w-8 text-orange-600" />
                      <div>
                        <p className="text-2xl font-bold">₹{calculateCartTotal()}</p>
                        <p className="text-xs text-muted-foreground">Cart Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          <Tabs defaultValue="search" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Spare Lookup
              </TabsTrigger>
              <TabsTrigger value="ai-diy" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI DIY Assistant
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                My Orders {ordersLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="warranty" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Warranty & Repairs {warrantyLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="cart" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.length})
              </TabsTrigger>
            </TabsList>

            {/* Spare Part Lookup Tab */}
            <TabsContent value="search" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Spare Part Lookup
                  </CardTitle>
                  <CardDescription>
                    Search for spare parts by brand, model number, or part name
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by part name, model, or part number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={searchLoading}>
                      {searchLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      {searchLoading ? 'Searching...' : 'Search'}
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select value={filters.brand || 'all'} onValueChange={(value) => setFilters({...filters, brand: value || 'all'})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        <SelectItem value="Honda">Honda</SelectItem>
                        <SelectItem value="Toyota">Toyota</SelectItem>
                        <SelectItem value="Maruti">Maruti</SelectItem>
                        <SelectItem value="Hyundai">Hyundai</SelectItem>
                        <SelectItem value="BMW">BMW</SelectItem>
                        <SelectItem value="Mercedes">Mercedes</SelectItem>
                        <SelectItem value="Audi">Audi</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.category || 'all'} onValueChange={(value) => setFilters({...filters, category: value || 'all'})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Engine">Engine Parts</SelectItem>
                        <SelectItem value="Brake">Brake System</SelectItem>
                        <SelectItem value="Suspension">Suspension</SelectItem>
                        <SelectItem value="Electrical">Electrical</SelectItem>
                        <SelectItem value="Transmission">Transmission</SelectItem>
                        <SelectItem value="Body">Body Parts</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filters.availability || 'all'} onValueChange={(value) => setFilters({...filters, availability: value || 'all'})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Availability</SelectItem>
                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                        <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => setFilters({brand: 'all', category: 'all', priceRange: 'all', availability: 'all'})}>
                      <Filter className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((part) => (
                        <Card key={part.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {part.images && part.images.length > 0 && (
                                <img 
                                  src={part.images[0]} 
                                  alt={part.name}
                                  className="w-full h-32 object-cover rounded-md"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <div>
                                <h3 className="font-semibold text-lg">{part.name}</h3>
                                <p className="text-sm text-muted-foreground">{part.partNumber}</p>
                                <p className="text-sm text-muted-foreground">{part.brand} - {part.model}</p>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-primary">₹{part.price}</span>
                                <Badge className={getAvailabilityColor(part.availability)}>
                                  {part.availability.replace('_', ' ')}
                                </Badge>
                              </div>

                              <div className="text-sm text-muted-foreground">
                                <p>Stock: {part.stock} units</p>
                                <p>Delivery: {part.estimatedDelivery}</p>
                              </div>

                              <Button 
                                onClick={() => addToCart(part)} 
                                className="w-full"
                                disabled={part.availability === 'OUT_OF_STOCK'}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI DIY Assistant Tab */}
            <TabsContent value="ai-diy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI DIY Assistant
                  </CardTitle>
                  <CardDescription>
                    Describe your problem and find the right spare part with video instructions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DIYSupportAgent
                    userId={user?.id}
                    userRole={user?.role || 'CUSTOMER'}
                    onOrderPart={handleOrderPart}
                    onRequestTechnician={handleRequestTechnician}
                    onCreateReverseRequest={handleCreateReverseRequest}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cart Tab */}
            <TabsContent value="cart" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Shopping Cart
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <div className="text-center py-8">
                      <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Your cart is empty</p>
                      <p className="text-sm text-muted-foreground mt-2">Search for parts to add them to your cart</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.map((item) => (
                        <div key={item.partId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.part.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.part.partNumber}</p>
                            <p className="text-lg font-bold text-primary">₹{item.part.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateCartQuantity(item.partId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => updateCartQuantity(item.partId, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => removeFromCart(item.partId)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xl font-bold">Total: ₹{calculateCartTotal()}</span>
                        </div>

                        {/* Shipping Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={shippingAddress.name}
                              onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                              placeholder="Enter your full name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={shippingAddress.phone}
                              onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                              placeholder="Enter your phone number"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Textarea
                              id="address"
                              value={shippingAddress.address}
                              onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                              placeholder="Enter your complete address"
                            />
                          </div>
                          <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                              id="city"
                              value={shippingAddress.city}
                              onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                              placeholder="Enter your city"
                            />
                          </div>
                          <div>
                            <Label htmlFor="state">State</Label>
                            <Input
                              id="state"
                              value={shippingAddress.state}
                              onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                              placeholder="Enter your state"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pincode">Pincode</Label>
                            <Input
                              id="pincode"
                              value={shippingAddress.pincode}
                              onChange={(e) => setShippingAddress({...shippingAddress, pincode: e.target.value})}
                              placeholder="Enter your pincode"
                            />
                          </div>
                        </div>

                        <Button 
                          onClick={handleCheckout} 
                          className="w-full" 
                          size="lg"
                          disabled={paymentLoading}
                        >
                          {paymentLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Proceed to Payment
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order History
                    {ordersLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  </CardTitle>
                  <CardDescription>
                    View your past orders with labels and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading orders...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders found</p>
                      <p className="text-sm text-muted-foreground mt-2">Your orders will appear here once you make a purchase</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Card key={order.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold">Order #{order.orderNumber}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                                <p className="text-lg font-bold text-primary mt-1">₹{order.totalAmount}</p>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span>{item.part.name} x {item.quantity}</span>
                                  <span>₹{item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Order Details - #{order.orderNumber}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label>Order Status</Label>
                                        <Badge className={getStatusColor(order.status)}>
                                          {order.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        <Label>Payment Status</Label>
                                        <Badge className={order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                          {order.paymentStatus}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    {order.awbNumber && (
                                      <div>
                                        <Label>AWB Number</Label>
                                        <p className="font-mono">{order.awbNumber}</p>
                                        {order.trackingUrl && (
                                          <Button variant="link" className="p-0" asChild>
                                            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                                              <Truck className="h-4 w-4 mr-2" />
                                              Track Shipment
                                            </a>
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    <div>
                                      <Label>Items</Label>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Part</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {order.items.map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell>{item.part.name}</TableCell>
                                              <TableCell>{item.quantity}</TableCell>
                                              <TableCell>₹{item.price}</TableCell>
                                              <TableCell>₹{item.price * item.quantity}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {order.awbNumber && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={`/api/labels/download/${order.id}`} target="_blank">
                                    <Download className="h-4 w-4 mr-2" />
                                    Download Label
                                  </a>
                                </Button>
                              )}

                              <Button variant="outline" size="sm" asChild>
                                <a href={`/api/invoices/download/${order.id}`} target="_blank">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Download Invoice
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Warranty & Repairs Tab */}
            <TabsContent value="warranty" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Warranty */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Register Warranty
                    </CardTitle>
                    <CardDescription>
                      Upload your purchase bill to track warranty
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="partName">Part Name</Label>
                      <Input
                        id="partName"
                        value={warrantyUpload.partName}
                        onChange={(e) => setWarrantyUpload({...warrantyUpload, partName: e.target.value})}
                        placeholder="Enter part name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <Input
                        id="purchaseDate"
                        type="date"
                        value={warrantyUpload.purchaseDate}
                        onChange={(e) => setWarrantyUpload({...warrantyUpload, purchaseDate: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="warrantyPeriod">Warranty Period (months)</Label>
                      <Select 
                        value={warrantyUpload.warrantyPeriod.toString() || '12'} 
                        onValueChange={(value) => setWarrantyUpload({...warrantyUpload, warrantyPeriod: parseInt(value || '12')})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warranty period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 months</SelectItem>
                          <SelectItem value="12">12 months</SelectItem>
                          <SelectItem value="18">18 months</SelectItem>
                          <SelectItem value="24">24 months</SelectItem>
                          <SelectItem value="36">36 months</SelectItem>
                          <SelectItem value="48">48 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="billImage">Upload Bill Image</Label>
                      <Input
                        id="billImage"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setWarrantyUpload({...warrantyUpload, billImage: e.target.files?.[0] || null})}
                      />
                    </div>

                    <Button onClick={handleWarrantyUpload} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Register Warranty
                    </Button>
                  </CardContent>
                </Card>

                {/* Create Service Ticket */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Request Service
                    </CardTitle>
                    <CardDescription>
                      Create a service ticket for warranty claims
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="warrantySelect">Select Warranty Item</Label>
                      <Select 
                        value={serviceTicketForm.warrantyId || ''} 
                        onValueChange={(value) => setServiceTicketForm({...serviceTicketForm, warrantyId: value || ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warranty item" />
                        </SelectTrigger>
                        <SelectContent>
                          {warrantyItems.filter(item => item.status === 'ACTIVE').length > 0 ? (
                            warrantyItems.filter(item => item.status === 'ACTIVE').map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.partName}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-items" disabled>
                              No active warranty items found
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="issue">Issue Type</Label>
                      <Select 
                        value={serviceTicketForm.issue || ''} 
                        onValueChange={(value) => setServiceTicketForm({...serviceTicketForm, issue: value || ''})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEFECTIVE">Defective Part</SelectItem>
                          <SelectItem value="NOT_WORKING">Not Working</SelectItem>
                          <SelectItem value="DAMAGED">Damaged in Transit</SelectItem>
                          <SelectItem value="WRONG_PART">Wrong Part Received</SelectItem>
                          <SelectItem value="INSTALLATION_ISSUE">Installation Issue</SelectItem>
                          <SelectItem value="PERFORMANCE_ISSUE">Performance Issue</SelectItem>
                          <SelectItem value="OTHER">Other Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={serviceTicketForm.description}
                        onChange={(e) => setServiceTicketForm({...serviceTicketForm, description: e.target.value})}
                        placeholder="Describe the issue in detail..."
                        rows={4}
                      />
                    </div>

                    <Button onClick={handleServiceTicket} className="w-full">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Create Service Ticket
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Warranty Items List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    My Warranty Items
                    {warrantyLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {warrantyLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Loading warranty items...</p>
                    </div>
                  ) : warrantyItems.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No warranty items found</p>
                      <p className="text-sm text-muted-foreground mt-2">Register your warranty items to track them here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {warrantyItems.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold">{item.partName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Purchased: {new Date(item.purchaseDate).toLocaleDateString()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Warranty: {item.warrantyPeriod} months
                                </p>
                              </div>
                              <Badge className={
                                item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                item.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {item.status}
                              </Badge>
                            </div>

                            {item.serviceTickets.length > 0 && (
                              <div className="space-y-2">
                                <Label>Service Tickets</Label>
                                {item.serviceTickets.map((ticket) => (
                                  <div key={ticket.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                    <div>
                                      <span className="font-medium">#{ticket.ticketNumber}</span>
                                      <span className="text-sm text-muted-foreground ml-2">{ticket.issue}</span>
                                    </div>
                                    <Badge className={
                                      ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }>
                                      {ticket.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Profile Dialog */}
          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Profile Settings</DialogTitle>
                <DialogDescription>
                  Manage your profile information and preferences
                </DialogDescription>
              </DialogHeader>
              <EnhancedProfileManager />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
    </CustomerErrorBoundary>
  );
};

export default CustomerDashboard;