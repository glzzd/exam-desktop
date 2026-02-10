import { io } from 'socket.io-client';

// Get backend URL from env or localStorage
const savedUrl = localStorage.getItem('server_url');
const defaultUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

// If saved URL exists, use it. Otherwise use default.
// Ensure we strip api/v1 part if present to get base URL for socket
const getBaseUrl = (url) => {
  if (!url) return 'http://localhost:5001';
  // Remove /api/v1 suffix if present
  return url.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
};

const SOCKET_URL = getBaseUrl(savedUrl || defaultUrl);

console.log('Connecting to socket at:', SOCKET_URL);

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
