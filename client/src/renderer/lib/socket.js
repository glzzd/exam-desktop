import { io } from 'socket.io-client';

// Get backend URL from env
const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const SOCKET_URL = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity, // Keep trying to reconnect
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
});

export default socket;
