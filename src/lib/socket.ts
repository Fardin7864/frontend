import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

  if (!socket) {
    socket = io(baseUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      query: { userId },
    });
  } else {
    // update userId on reconnect if needed
    socket.io.opts.query = { userId };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
}
