import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  console.log('🔌 Socket.io initialized');

  io.on('connection', (socket: Socket) => {
    console.log(`👤 User connected: ${socket.id}`);

    // Join a specific trip room
    socket.on('join_trip', (tripId: string) => {
      socket.join(tripId);
      console.log(`📍 Socket ${socket.id} joined trip: ${tripId}`);
    });

    // Handle driver location updates
    socket.on('update_location', (data: { tripId: string; coords: { latitude: number; longitude: number; heading?: number } }) => {
      const { tripId, coords } = data;
      // Broadcast to everyone in the trip room (especially the rider)
      socket.to(tripId).emit('location_changed', coords);
      
      // Optioanlly: Throttled database update would go here
      // console.log(`🚀 Location update for ${tripId}:`, coords);
    });

    socket.on('disconnect', () => {
      console.log(`👤 User disconnected: ${socket.id}`);
    });
  });

  return io;
};
