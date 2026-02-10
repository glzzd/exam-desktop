import React, { createContext, useContext, useEffect, useState } from 'react';
import socket from '../lib/socket';
import { toast } from 'sonner';

const SocketContext = createContext({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      console.log('Socket connected:', socket.id);
      // Optional: toast.success('Serverlə əlaqə quruldu');
    }

    function onDisconnect(reason) {
      setIsConnected(false);
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
      }
      toast.error('Serverlə əlaqə kəsildi. Yenidən qoşulur...');
    }

    function onConnectError(error) {
        console.error('Socket connection error:', error);
        // toast.error('Serverə qoşulmaq mümkün olmadı');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Listen for app closing from Electron Main process
    if (window.api && window.api.on) {
      window.api.on('app-closing', () => {
        console.log('App is closing, sending exit signal...');
        socket.emit('student-exit');
      });
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
