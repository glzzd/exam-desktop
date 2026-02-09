import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Cpu, User } from 'lucide-react';

const ExamClient = () => {
  const { socket, isConnected } = useSocket();
  const [systemInfo, setSystemInfo] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting, registered, disconnected

  useEffect(() => {
    const fetchInfo = async () => {
      // Get system info
      let info = {
        hostname: 'Unknown Host',
        platform: navigator.platform,
        username: 'Əməkdaş',
        isElectron: false,
        uuid: 'unknown',
        mac: 'unknown'
      };

      if (window.api) {
        try {
          if (window.api.getSystemInfo) {
            const electronInfo = window.api.getSystemInfo();
            info = { ...info, ...electronInfo, isElectron: true };
          }
          if (window.api.getMachineId) {
            const machineInfo = await window.api.getMachineId();
            info = { ...info, ...machineInfo };
          }
        } catch (e) {
          console.error('Failed to get Electron system info:', e);
        }
      }

      setSystemInfo(info);
      if (socket && isConnected) {
        registerClient(info);
      }
    };

    fetchInfo();

    // Listen for connection events
    const onConnect = () => {
      if (systemInfo) registerClient(systemInfo);
    };
    const onDisconnect = () => setStatus('disconnected');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, isConnected]);

  const registerClient = (info) => {
    console.log('Registering client:', info);
    socket.emit('student-join', info);
    setStatus('registered');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center border-b bg-white rounded-t-lg pb-6">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Monitor className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">İmtahan Terminalı</CardTitle>
          <p className="text-sm text-slate-500 mt-2">
            Bu kompüter imtahan sisteminə qoşulub
          </p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6 bg-white rounded-b-lg">
          
          {/* Status Indicator */}
          <div className="flex items-center justify-center space-x-2 bg-slate-100 py-3 rounded-md">
            <div className={`w-3 h-3 rounded-full ${status === 'registered' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="font-medium text-slate-700">
              {status === 'registered' ? 'Sistemə qoşulub' : 'Qoşulur...'}
            </span>
          </div>

          {/* System Details */}
          {systemInfo && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-500">
                  <Monitor className="w-4 h-4 mr-2" />
                  Kompüter adı
                </div>
                <span className="font-semibold text-slate-900">{systemInfo.hostname}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-500">
                  <Cpu className="w-4 h-4 mr-2" />
                  Platforma
                </div>
                <span className="font-semibold text-slate-900 capitalize">{systemInfo.platform}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-500">
                  <User className="w-4 h-4 mr-2" />
                  İstifadəçi
                </div>
                <span className="font-semibold text-slate-900">{systemInfo.username}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-500">
                  <Cpu className="w-4 h-4 mr-2" />
                  UUID
                </div>
                <span className="font-mono text-xs text-slate-600" title={systemInfo.uuid}>
                  {systemInfo.uuid && systemInfo.uuid.length > 20 ? systemInfo.uuid.substring(0, 20) + '...' : systemInfo.uuid}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-500">
                  <Monitor className="w-4 h-4 mr-2" />
                  MAC
                </div>
                <span className="font-mono text-xs text-slate-600">{systemInfo.mac}</span>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-slate-400 mt-8">
            İmtahan başladığında ekran avtomatik yenilənəcək.
            <br />
            Pəncərəni bağlamayın.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamClient;
