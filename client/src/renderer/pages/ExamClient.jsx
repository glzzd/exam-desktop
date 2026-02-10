import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Cpu, User, Settings, Clock, FileQuestion, CheckSquare, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ExamClient = () => {
  const { socket, isConnected } = useSocket();
  const [systemInfo, setSystemInfo] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting, registered, disconnected
  const [isExamReady, setIsExamReady] = useState(false);
  const [examTypes, setExamTypes] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('server_url') || '');

  const handleStartExam = (examTypeId) => {
     if (socket) {
        socket.emit('student-start-exam', { examTypeId });
        toast.success('İmtahan başlayır...');
     }
  };

  const handleSaveSettings = () => {
    if (serverUrl) {
      localStorage.setItem('server_url', serverUrl);
      toast.success('Server ünvanı yadda saxlanıldı. Səhifə yenilənir...');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

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

    // Socket listeners setup
    if (socket) {
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      
      // Handle desk assignment
      socket.on('desk-assigned', (data) => {
        setSystemInfo(prev => ({ 
          ...prev, 
          label: data.label, 
          deskNumber: data.deskNumber,
          assignedEmployee: data.assignedEmployee,
          assignedStructure: data.assignedStructure
        }));
      });

      // Handle exam activation
      socket.on('exam-activated', (data) => {
        console.log('Exam activated:', data);
        setIsExamReady(true);
        // Fetch active exam types immediately
        socket.emit('get-active-exam-types');
        toast.success('Məlumatlar təsdiqləndi. İmtahan növünü seçin!');
      });

      // Handle active exam types list
      socket.on('active-exam-types', (types) => {
        console.log('Active exam types:', types);
        setExamTypes(types);
      });

      socket.on('exam-start-success', ({ examTypeId }) => {
         // Logic after start (e.g. redirect to question page)
         // For now just keep card yellow or change UI state
         toast.success('İmtahan uğurla başladı!');
      });
    }

    return () => {
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('desk-assigned');
        socket.off('exam-activated');
        socket.off('active-exam-types');
        socket.off('exam-start-success');
      }
    };
  }, [socket, isConnected]);

  const registerClient = (info) => {
    console.log('Registering client:', info);
    if (socket) {
      socket.emit('student-join', info);
      setStatus('registered');
    }
  };

  const getTotalDuration = () => {
    return examTypes.reduce((total, type) => total + (type.duration || 0), 0);
  };

  const getQuestionCountDisplay = () => {
    if (examTypes.length === 0) return 0;
    const firstCount = examTypes[0].questionCount || 0;
    const allSame = examTypes.every(t => (t.questionCount || 0) === firstCount);
    return allSame ? firstCount : 'Müxtəlif';
  };

  const allQuestionsSame = examTypes.length > 0 && examTypes.every(t => (t.questionCount || 0) === (examTypes[0].questionCount || 0));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 relative font-sans overflow-hidden">
      {/* Settings Button */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-50">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Server Tənzimləmələri</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server URL</label>
              <Input 
                placeholder="http://192.168.1.35:3001" 
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Backend serverin tam ünvanını daxil edin. (Məsələn: http://192.168.1.100:3001)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSettings}>Yadda Saxla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full max-h-[calc(100vh-2rem)]">
        {/* Left Column: Identity & Status */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
           {/* Main Status Card */}
           <Card className="flex-1 border-0 shadow-lg ring-1 ring-slate-900/5 flex flex-col">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />
              <CardContent className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6">
                 
                 {/* Desk Badge */}
                 {systemInfo?.label ? (
                   <div className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                      <Monitor className="w-5 h-5 mr-2" />
                      <span className="text-2xl font-bold tracking-tight">{systemInfo.label}</span>
                   </div>
                 ) : (
                   <div className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-slate-100 text-slate-500">
                      <span className="text-base font-medium">Masa Təyin Edilməyib</span>
                   </div>
                 )}

                 {/* User Identity */}
                 <div className="space-y-2">
                   {systemInfo?.assignedEmployee ? (
                      <div className="animate-in fade-in zoom-in duration-500">
                         <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-4 text-blue-600">
                            <User className="w-10 h-10" />
                         </div>
                         <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                           {systemInfo.assignedEmployee.personalData.lastName} {systemInfo.assignedEmployee.personalData.firstName}
                         </h2>
                         <p className="text-lg text-slate-600">
                            {systemInfo.assignedEmployee.personalData.fatherName} {systemInfo.assignedEmployee.personalData.gender==='male'?'oğlu':'qızı'}
                         </p>
                         {systemInfo.assignedStructure && (
                           <div className="mt-3 px-3 py-1 bg-slate-50 rounded text-sm text-slate-500 font-medium border border-slate-100 inline-block max-w-full truncate">
                             {systemInfo.assignedStructure.name}
                           </div>
                         )}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center space-y-4 opacity-40 py-8">
                        <User className="w-16 h-16 text-slate-300" />
                        <h2 className="text-xl font-bold text-slate-300">
                          {systemInfo?.username || 'İstifadəçi Gözlənilir...'}
                        </h2>
                      </div>
                   )}
                 </div>
              </CardContent>
              
              {/* Footer Status Indicators */}
              <div className="p-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                 <div className="flex items-center gap-2 text-slate-600">
                    <div className={`w-2 h-2 rounded-full ${status === 'registered' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="font-medium">{status === 'registered' ? 'Onlayn' : 'Qoşulur...'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-slate-600 justify-end">
                    <Cpu className="w-3 h-3" />
                    <span className="font-mono opacity-70 truncate max-w-[100px]" title={systemInfo?.mac}>{systemInfo?.mac || 'MAC...'}</span>
                 </div>
              </div>
           </Card>
        </div>

        {/* Right Column: Exam Content */}
        <div className="lg:col-span-8 h-full flex flex-col">
           {isExamReady ? (
             <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-4 duration-500">
                {/* 1. Top Bar: Rules & Summary */}
                <Card className="border-0 shadow-md ring-1 ring-slate-900/5 bg-white shrink-0">
                   <div className="p-4 flex items-center justify-center">
                      <div className="flex items-center gap-3 text-amber-700 font-bold px-6 py-2 bg-amber-50 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in duration-500">
                         <Clock className="w-5 h-5" />
                         <span className="text-lg">Ümumi Vaxt: {getTotalDuration()} dəqiqə</span>
                      </div>
                   </div>
                </Card>

                {/* 2. Main Content: Exam Selection */}
                <div className="flex-1 overflow-y-auto pr-1">
                   {examTypes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {examTypes.map((type) => (
                          <Card key={type._id} className="hover:shadow-xl transition-all border-slate-200 cursor-pointer group relative overflow-hidden flex flex-col h-full transform hover:-translate-y-1 duration-300" onClick={() => handleStartExam(type._id)}>
                             <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                             <CardContent className="p-6 flex flex-col h-full items-center text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md">
                                  <Monitor className="w-8 h-8" />
                                </div>
                                
                                <h3 className="font-bold text-xl text-slate-900 mb-6 leading-tight min-h-[3.5rem] flex items-center justify-center">{type.name}</h3>
                                
                                <div className="w-full grid grid-cols-2 gap-3 mb-6">
                                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-100 transition-colors">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Sual Sayı</span>
                                      <span className="text-2xl font-black text-slate-700">{type.questionCount}</span>
                                   </div>
                                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center hover:bg-green-50 hover:border-green-100 transition-colors">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Min. Keçid</span>
                                      <span className="text-2xl font-black text-green-600">{type.minCorrectAnswers}</span>
                                   </div>
                                </div>
                                
                                <Button 
                                  className="w-full mt-auto bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg transition-all py-6 text-lg font-bold tracking-wide"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartExam(type._id);
                                  }}
                                >
                                  İmtahana Başla
                                </Button>
                             </CardContent>
                          </Card>
                        ))}
                      </div>
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-dashed border-slate-200 text-center">
                         <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <FileQuestion className="w-8 h-8 text-slate-300" />
                         </div>
                         <p className="text-slate-500 font-medium">Aktiv imtahan növü tapılmadı</p>
                         <Button variant="link" onClick={() => socket.emit('get-active-exam-types')}>Yenilə</Button>
                      </div>
                   )}
                </div>

                {/* 3. Bottom Hint */}
                <div className="text-center py-2">
                   <p className="text-xs text-slate-400 font-medium">
                     Zəhmət olmasa imtahan növünü seçərək "Başla" düyməsini sıxın.
                   </p>
                </div>
             </div>
           ) : (
             // Not Ready State Placeholder
             <div className="h-full flex flex-col items-center justify-center bg-white/50 rounded-xl border border-dashed border-slate-300/50 p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                   <Monitor className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                   <h3 className="text-lg font-medium text-slate-700">İmtahan Gözlənilir</h3>
                   <p className="text-slate-500 max-w-md mx-auto mt-2">
                     Admin tərəfindən imtahan aktivləşdirildikdən sonra burada imtahan növləri görünəcək.
                   </p>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ExamClient;
