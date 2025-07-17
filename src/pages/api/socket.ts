import { NextApiRequest } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import jwt from 'jsonwebtoken';

interface SocketServer extends NetServer {
  io?: SocketIOServer | undefined;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiRequest {
  socket: SocketWithIO;
}

interface AuthenticatedSocket {
  userId: string;
  userRole: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data: any) => void;
  broadcast: {
    to: (room: string) => {
      emit: (event: string, data: any) => void;
    };
  };
  on: (event: string, callback: Function) => void;
  disconnect: () => void;
}

const connectedUsers = new Map<string, AuthenticatedSocket>();

export default function handler(req: any, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    res.socket.server.io = io;

    io.on('connection', (socket: any) => {
      console.log('New socket connection:', socket.id);

      // Authenticate socket connection
      socket.on('authenticate', async (data: { token: string; userId: string; userRole: string }) => {
        try {
          const { token, userId, userRole } = data;
          
          if (!token) {
            socket.emit('auth_error', { message: 'No token provided' });
            return;
          }

          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          
          if (decoded.id !== userId) {
            socket.emit('auth_error', { message: 'Token mismatch' });
            return;
          }

          // Store authenticated socket
          socket.userId = userId;
          socket.userRole = userRole;
          connectedUsers.set(userId, socket);

          // Join user-specific room
          socket.join(`user_${userId}`);
          
          // Join role-specific room
          socket.join(`role_${userRole}`);

          // Join brand-specific room if applicable
          if (userRole === 'BRAND' || userRole === 'SERVICE_CENTER' || userRole === 'DISTRIBUTOR') {
            socket.join(`brand_${decoded.brandId || userId}`);
          }

          socket.emit('authenticated', { 
            message: 'Successfully authenticated',
            userId,
            userRole 
          });

          console.log(`User ${userId} (${userRole}) authenticated and joined rooms`);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Invalid token' });
        }
      });

      // Handle real-time notifications
      socket.on('notification', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Broadcast notification to specific users or rooms
        if (data.recipients && Array.isArray(data.recipients)) {
          data.recipients.forEach((recipientId: string) => {
            io.to(`user_${recipientId}`).emit('notification', {
              ...data,
              timestamp: new Date().toISOString()
            });
          });
        }
      });

      // Handle inventory updates
      socket.on('inventory_update', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Broadcast to all users in the same brand
        socket.broadcast.to(`brand_${data.brandId}`).emit('inventory_updated', {
          ...data,
          timestamp: new Date().toISOString(),
          updatedBy: socket.userId
        });
      });

      // Handle shipment updates
      socket.on('shipment_update', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Notify relevant parties about shipment updates
        const rooms = [`user_${data.brandId}`, `user_${data.serviceCenterId}`];
        
        rooms.forEach(room => {
          io.to(room).emit('shipment_updated', {
            ...data,
            timestamp: new Date().toISOString(),
            updatedBy: socket.userId
          });
        });
      });


      
      // Handle order updates
      socket.on('order_update', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Notify customer and relevant business users
        const rooms = [`user_${data.customerId}`];
        
        if (data.distributorId) {
          rooms.push(`user_${data.distributorId}`);
        }
        
        if (data.brandId) {
          rooms.push(`user_${data.brandId}`);
        }

        rooms.forEach(room => {
          io.to(room).emit('order_updated', {
            ...data,
            timestamp: new Date().toISOString(),
            updatedBy: socket.userId
          });
        });
      });

      // Handle tracking updates
      socket.on('tracking_update', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Broadcast tracking updates to relevant users
        io.to(`user_${data.brandId}`).emit('tracking_updated', {
          ...data,
          timestamp: new Date().toISOString()
        });

        if (data.serviceCenterId) {
          io.to(`user_${data.serviceCenterId}`).emit('tracking_updated', {
            ...data,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle wallet updates
      socket.on('wallet_update', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Notify the specific user about wallet changes
        io.to(`user_${data.userId}`).emit('wallet_updated', {
          ...data,
          timestamp: new Date().toISOString()
        });
      });

      // Handle system alerts
      socket.on('system_alert', (data: any) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Broadcast system alerts to all users or specific roles
        if (data.targetRole) {
          io.to(`role_${data.targetRole}`).emit('system_alert', {
            ...data,
            timestamp: new Date().toISOString()
          });
        } else {
          io.emit('system_alert', {
            ...data,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Socket ${socket.id} disconnected:`, reason);
        
        if (socket.userId) {
          connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });

      // Handle connection errors
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    });

    // Global broadcast function for server-side notifications
    (global as any).broadcastNotification = (data: any) => {
      if (data.recipients && Array.isArray(data.recipients)) {
        data.recipients.forEach((recipientId: string) => {
          io.to(`user_${recipientId}`).emit('notification', {
            ...data,
            timestamp: new Date().toISOString()
          });
        });
      }
    };

    // Global broadcast function for inventory updates
    (global as any).broadcastInventoryUpdate = (data: any) => {
      io.to(`brand_${data.brandId}`).emit('inventory_updated', {
        ...data,
        timestamp: new Date().toISOString()
      });
    };

    // Global broadcast function for shipment updates
    (global as any).broadcastShipmentUpdate = (data: any) => {
      const rooms = [`user_${data.brandId}`, `user_${data.serviceCenterId}`];
      
      rooms.forEach(room => {
        io.to(room).emit('shipment_updated', {
          ...data,
          timestamp: new Date().toISOString()
        });
      });
    };
  }
  
  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};