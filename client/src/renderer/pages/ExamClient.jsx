import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent } from "@/components/ui/card";
import { Monitor, Cpu, User, Clock, FileQuestion, CheckSquare, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

const ExamClient = () => {
  const { socket, isConnected } = useSocket();
  const [systemInfo, setSystemInfo] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting, registered, disconnected
  const [isExamReady, setIsExamReady] = useState(false);
  const [examTypes, setExamTypes] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('server_url') || '');

  // Exam Taking State
  const [examStatus, setExamStatus] = useState('selection'); // selection, taking, results
  const [activeExamTypeId, setActiveExamTypeId] = useState(null);
  const [examResults, setExamResults] = useState(null);
  const [resultsShown, setResultsShown] = useState(false);
  
  // Progress State for each Exam Type
  // { [examTypeId]: { status: 'pending'|'in_progress'|'completed', answeredCount: 0, totalQuestions: 0, currentQuestionIndex: 0, answers: {}, questions: [] } }
  const [examProgress, setExamProgress] = useState({});

  const [globalStartTime, setGlobalStartTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [accordionValue, setAccordionValue] = useState([]); // For results view

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return examTypes.reduce((total, type) => total + (type.duration || 0), 0);
  };

  // Check if ALL exams are completed
  const areAllExamsCompleted = examTypes.length > 0 && examTypes.every(type => {
      const prog = examProgress[type._id];
      return prog && prog.status === 'completed';
  });

  // Retry fetching stats if missing for completed exams
  useEffect(() => {
    if (examTypes.length > 0 && socket) {
        const stuckExams = examTypes.some(type => {
            const prog = examProgress[type._id];
            return prog && prog.status === 'completed' && !prog.result;
        });

        if (stuckExams) {
            const timer = setTimeout(() => {
                 console.log('Retrying fetch for stuck stats...');
                 socket.emit('get-active-exam-types');
            }, 2000); 
            return () => clearTimeout(timer);
        }
    }
  }, [examProgress, examTypes, socket]);

  // Global Timer Effect
  useEffect(() => {
    let timer;
    // Only run if we have start time and exams are loaded (to know duration)
     // This prevents premature "0:00" state when examTypes are not yet fetched but startTime is present
     if (globalStartTime && examTypes.length > 0 && examStatus !== 'results' && !areAllExamsCompleted) {
       const totalDurationSec = getTotalDuration() * 60;
       
       const updateTimer = () => {
        const now = new Date();
        const startTime = new Date(globalStartTime);
        const elapsedSec = Math.floor((now - startTime) / 1000);
        const remaining = totalDurationSec - elapsedSec;
        
        // console.log('Timer Tick:', { start: globalStartTime, total: totalDurationSec, elapsed: elapsedSec, remaining });

        if (remaining <= 0) {
           setTimeLeft(0);
           if (timer) clearInterval(timer);
        } else {
           setTimeLeft(remaining);
        }
      };

      // Update immediately to avoid 1s delay
      updateTimer();

      timer = setInterval(updateTimer, 1000);
    }
    return () => {
        if (timer) clearInterval(timer);
    };
   }, [globalStartTime, examTypes, examStatus, areAllExamsCompleted]);



  const handleStartExam = (examTypeId) => {
     // Check if already started locally
     if (examProgress[examTypeId]?.questions?.length > 0) {
        // Resume
        setActiveExamTypeId(examTypeId);
        setExamStatus('taking');
        return;
     }

     if (socket) {
        socket.emit('student-start-exam', { examTypeId });
        toast.success('İmtahan sorğusu göndərildi...');
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
    if (window.api && window.api.on) {
      window.api.on('open-settings', () => {
        setShowSettings(true);
      });
    }
  }, []);

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

      // Handle desk reset
      socket.on('desk-reset', () => {
          console.log('Desk reset command received');
          
          // Reset all state
          setExamTypes([]);
          setIsExamReady(false);
          setExamStatus('selection');
          setActiveExamTypeId(null);
          setExamResults(null);
          setResultsShown(false);
          setExamProgress({});
          setGlobalStartTime(null);
          setTimeLeft(0);
          setAccordionValue([]);
          
          // Reset System Info (keep uuid/mac/hostname/deskNumber/label but clear assignment)
          setSystemInfo(prev => ({
              ...prev,
              assignedEmployee: null,
              assignedStructure: null
          }));
          
          // Clear Local Storage (except critical config like server_url)
          const serverUrl = localStorage.getItem('server_url');
          localStorage.clear();
          if (serverUrl) localStorage.setItem('server_url', serverUrl);
          
          toast.info('Masa məlumatları sıfırlandı.');
      });

      // Handle exam activation
      socket.on('exam-activated', (data) => {
        console.log('Exam activated:', data);
        setIsExamReady(true);
        // Fetch active exam types immediately
        socket.emit('get-active-exam-types');
        if (data.status !== 'completed') {
            toast.success('Məlumatlar təsdiqləndi. İmtahan növünü seçin!');
        }
      });

      // Handle active exam types list
      socket.on('active-exam-types', (types) => {
        console.log('Active exam types:', types);
        setExamTypes(types);
      });

      // Handle initial/restored progress
      socket.on('student-exam-progress', (progressMap) => {
        console.log('Received student progress:', progressMap);
        setExamProgress(prev => ({
            ...prev,
            ...progressMap
        }));
      });

      // Handle exam type stats
      socket.on('exam-type-stats', ({ examTypeId, stats }) => {
        console.log(`Received stats for ${examTypeId}:`, stats);
        setExamProgress(prev => ({
            ...prev,
            [examTypeId]: {
                ...prev[examTypeId],
                result: stats
            }
        }));
      });

      // Handle Timer Sync
      socket.on('session-timer-sync', ({ startTime }) => {
          console.log('Timer Synced:', startTime);
          setGlobalStartTime(startTime);
      });

      socket.on('exam-start-success', ({ examTypeId }) => {
         // Logic after start (e.g. redirect to question page)
         // For now just keep card yellow or change UI state
         toast.success('İmtahan sorğusu göndərildi...');
      });

      socket.on('student-results', (results) => {
          console.log('Results received:', results);
          setExamResults(results);
          setExamStatus('results');
          // Open all accordions by default to show all questions
          if (results?.examTypes) {
             setAccordionValue(results.examTypes.map((_, idx) => `item-${idx}`));
          }
      });

      socket.on('error', (err) => {
          console.error('Socket error:', err);
          toast.error(err.message || 'Xəta baş verdi');
      });

      socket.on('exam-finished-all', () => {
         toast.success('İmtahan bitirildi! Nəticələr admin panelinə göndərildi.');
         socket.emit('student-get-results');
      });

      socket.on('exam-started', (data) => {
        // data: { examTypeId, questions, duration, startTime, previousAnswers }
        
        // 1. Initialize Global Timer if not already
        if (!globalStartTime) {
            setGlobalStartTime(data.startTime);
        }

        // Calculate resume index
        const questions = data.questions;
        const answers = data.previousAnswers || {};
        let resumeIndex = 0;
        if (Object.keys(answers).length > 0) {
            resumeIndex = questions.findIndex(q => !answers[q._id]);
            if (resumeIndex === -1) resumeIndex = questions.length - 1; // All answered, go to last
        }

        // 2. Initialize Progress for this Exam Type
        setExamProgress(prev => ({
            ...prev,
            [data.examTypeId]: {
                status: 'in_progress',
                questions: data.questions,
                totalQuestions: data.questions.length,
                currentQuestionIndex: resumeIndex,
                answeredCount: Object.keys(answers).length,
                answers: answers
            }
        }));

        // 3. Switch View
        setActiveExamTypeId(data.examTypeId);
        setExamStatus('taking');
        
        toast.success('İmtahan başladı! Uğurlar!');
      });

      socket.on('error', (err) => {
        toast.error(err.message || 'Xəta baş verdi');
      });
    }

    return () => {
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('desk-assigned');
        socket.off('desk-reset');
        socket.off('exam-activated');
        socket.off('active-exam-types');
        socket.off('exam-start-success');
        socket.off('exam-started');
        socket.off('exam-finished-all');
        socket.off('exam-type-stats');
        socket.off('error');
      }
    };
  }, [socket, isConnected]);

  // Time tracking ref
  const lastActionTimeRef = React.useRef(Date.now());
  const questionTimeAccumulatorRef = React.useRef({}); // Stores accumulated time per question locally before sync

  const updateTimeSpent = (questionId) => {
      const now = Date.now();
      const delta = (now - lastActionTimeRef.current) / 1000; // in seconds
      lastActionTimeRef.current = now;

      if (!questionId) return 0;

      const prevTime = questionTimeAccumulatorRef.current[questionId] || 0;
      const newTime = prevTime + delta;
      questionTimeAccumulatorRef.current[questionId] = newTime;
      return newTime;
  };

  const saveToLocalBackup = (currentProgress) => {
      if (!window.api?.saveLocalBackup) return;
      
      const student = systemInfo?.assignedEmployee?.personalData ? {
          firstName: systemInfo.assignedEmployee.personalData.firstName,
          lastName: systemInfo.assignedEmployee.personalData.lastName,
          fatherName: systemInfo.assignedEmployee.personalData.fatherName,
      } : {
          firstName: 'Unknown',
          lastName: 'Student', 
          fatherName: ''
      };

      const backupData = {
          timestamp: new Date().toISOString(),
          machineUuid: systemInfo?.uuid,
          macAddress: systemInfo?.mac,
          examTypes: Object.keys(currentProgress).map(typeId => {
              const prog = currentProgress[typeId];
              return {
                  examTypeId: typeId,
                  // Save minimal info needed for restore
                  answers: prog.answers,
                  // Also include question IDs to map back if needed
                  questions: prog.questions.map(q => ({
                      questionId: q._id,
                      selectedOptionId: prog.answers[q._id] || null
                  }))
              };
          })
      };
      
      window.api.saveLocalBackup({ student, backupData }).catch(err => console.error("Backup failed:", err));
  };

  const handleAnswerSelect = (questionId, optionId) => {
    if (!activeExamTypeId) return;

    // Update time spent for this question
    const timeSpent = updateTimeSpent(questionId);

    // Get current state
    const currentExam = examProgress[activeExamTypeId];
    if (!currentExam) return;

    const currentAnswer = currentExam.answers[questionId];
    let newAnswers;
    let newOptionId = optionId;

    // Toggle logic
    if (currentAnswer === optionId) {
        // Deselect
        newAnswers = { ...currentExam.answers };
        delete newAnswers[questionId];
        newOptionId = null; 
    } else {
        // Select new
        newAnswers = { ...currentExam.answers, [questionId]: optionId };
    }

    const count = Object.keys(newAnswers).length;

    // Update State
    const nextProgress = {
        ...examProgress,
        [activeExamTypeId]: {
            ...currentExam,
            answers: newAnswers,
            answeredCount: count
        }
    };
    
    setExamProgress(nextProgress);
    
    // Trigger Local Backup
    saveToLocalBackup(nextProgress);

    // Emit updated progress WITH DETAILS for persistence
    if (socket) {
      socket.emit('update-exam-progress', { 
          examTypeId: activeExamTypeId,
          questionId, 
          optionId: newOptionId,
          answeredCount: count,
          timeSpent: timeSpent
      });
    }
  };

  const handleNavigation = (direction) => {
      // Update time for current question before moving
      if (currentQuestion) {
          const timeSpent = updateTimeSpent(currentQuestion._id);
          // Sync time without answer change
          if (socket && activeExamTypeId) {
              socket.emit('update-exam-progress', {
                  examTypeId: activeExamTypeId,
                  questionId: currentQuestion._id,
                  // No option change
                  answeredCount: currentExamData.answeredCount,
                  timeSpent: timeSpent
              });
          }
      }

      setExamProgress(prev => {
          const currentExam = prev[activeExamTypeId];
          if (!currentExam) return prev;

          let newIndex = currentExam.currentQuestionIndex + direction;
          newIndex = Math.max(0, Math.min(newIndex, currentExam.questions.length - 1));

          return {
              ...prev,
              [activeExamTypeId]: {
                  ...currentExam,
                  currentQuestionIndex: newIndex
              }
          };
      });
  };
  
  const handleJumpToQuestion = (index) => {
      // Update time for current question before jumping
      if (currentQuestion) {
          const timeSpent = updateTimeSpent(currentQuestion._id);
          // Sync time without answer change
          if (socket && activeExamTypeId) {
              socket.emit('update-exam-progress', {
                  examTypeId: activeExamTypeId,
                  questionId: currentQuestion._id,
                  // No option change
                  answeredCount: currentExamData.answeredCount,
                  timeSpent: timeSpent
              });
          }
      }

      setExamProgress(prev => {
          const currentExam = prev[activeExamTypeId];
          if (!currentExam) return prev;

          return {
              ...prev,
              [activeExamTypeId]: {
                  ...currentExam,
                  currentQuestionIndex: index
              }
          };
      });
  };

  const handleFinishSection = () => {
      // Update time for current question before finishing
      if (currentQuestion) {
          const timeSpent = updateTimeSpent(currentQuestion._id);
          // Sync time
           if (socket && activeExamTypeId) {
              socket.emit('update-exam-progress', {
                  examTypeId: activeExamTypeId,
                  questionId: currentQuestion._id,
                  answeredCount: currentExamData.answeredCount,
                  timeSpent: timeSpent
              });
          }
      }

      // Notify backend that this exam type is finished
      if (socket && activeExamTypeId) {
          socket.emit('student-finish-exam-type', { examTypeId: activeExamTypeId });
      }

      setExamProgress(prev => ({
          ...prev,
          [activeExamTypeId]: {
              ...prev[activeExamTypeId],
              status: 'completed'
          }
      }));
      setExamStatus('selection');
      setActiveExamTypeId(null);
      toast.success('Bölmə tamamlandı!');
  };

  const registerClient = (info) => {
    console.log('Registering client:', info);
    if (socket) {
      socket.emit('student-join', info);
      setStatus('registered');
    }
  };

  // Derived state for rendering
  const currentExamData = activeExamTypeId ? examProgress[activeExamTypeId] : null;
  const currentQuestionIndex = currentExamData?.currentQuestionIndex || 0;
  const currentQuestion = currentExamData?.questions ? currentExamData.questions[currentQuestionIndex] : null;
  const currentAnswers = currentExamData?.answers || {};

  const handleShowResults = () => {
      if (socket) {
          socket.emit('student-get-results');
          setResultsShown(true);
      }
  };

  const handleFinishSession = () => {
      if (socket) {
          socket.emit('student-finish-session');
      }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col p-4 relative font-sans overflow-hidden">
      {/* Settings Dialog - Triggered via Application Menu */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parametlər</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Tənzimləmələri</label>
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-full overflow-hidden">
        {/* Left Column: Identity & Status */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
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
                           {systemInfo.assignedEmployee.personalData.lastName} {systemInfo.assignedEmployee.personalData.firstName} {systemInfo.assignedEmployee.personalData.fatherName} {systemInfo.assignedEmployee.personalData.gender==='male'?'oğlu':'qızı'}
                         </h2>
                       
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
                 {areAllExamsCompleted && examStatus !== 'results' && (
                    <div className="col-span-2 mb-2 space-y-2">
                        <Button 
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm"
                            onClick={handleFinishSession}
                        >
                            <CheckSquare className="w-4 h-4 mr-2" />
                            Nəticələrlə tanış ol və imtahanı bitir
                        </Button>
                    </div>
                )}
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
        <div className="lg:col-span-8 h-full flex flex-col min-h-0 overflow-hidden">
           {examStatus === 'taking' ? (
             <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-4 duration-500">
                {/* Top Bar: Timer & Progress */}
                <Card className="border-0 shadow-md ring-1 ring-slate-900/5 bg-white shrink-0">
                    <div className="p-4 flex items-center justify-between px-4 md:px-8">
                        <div className="flex items-center gap-4">
                            <div className="h-6 w-px bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Sual:</span>
                                <span className="text-xl font-black text-slate-800">
                                    {currentQuestionIndex + 1} <span className="text-slate-400 text-lg">/ {currentExamData?.totalQuestions}</span>
                                </span>
                            </div>
                        </div>
                        
                        <div className={`flex items-center gap-3 font-bold px-6 py-2 rounded-full border shadow-sm transition-colors ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            <Clock className="w-5 h-5" />
                            <span className="text-2xl font-mono">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </Card>

                {/* Question Content */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-4">
                    {/* Question Navigation Bar */}
                    <Card className="border-0 shadow-sm ring-1 ring-slate-900/5 bg-white shrink-0">
                       <CardContent className="p-4">
                          <div className="flex flex-wrap gap-2">
                             {currentExamData?.questions?.map((q, idx) => {
                                const isAnswered = currentAnswers[q._id];
                                const isCurrent = idx === currentQuestionIndex;
                                
                                return (
                                   <button
                                      key={q._id}
                                      onClick={() => handleJumpToQuestion(idx)}
                                      className={`
                                        w-10 h-10 rounded-lg text-sm font-bold transition-all flex items-center justify-center border-2
                                        ${isCurrent 
                                            ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-200 ring-offset-1 z-10 scale-110' 
                                            : isAnswered 
                                                ? 'border-transparent bg-green-500 text-white hover:bg-green-600'
                                                : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-300'
                                        }
                                      `}
                                   >
                                      {idx + 1}
                                   </button>
                                );
                             })}
                          </div>
                       </CardContent>
                    </Card>

                    <Card className="flex-1 border-0 shadow-sm ring-1 ring-slate-900/5 bg-white flex flex-col">
                        <CardContent className="p-8 flex-1 flex flex-col">
                            <div className="text-lg font-medium text-slate-900 mb-8 leading-relaxed">
                                {currentQuestion?.text}
                            </div>

                            <div className="space-y-4">
                                {currentQuestion?.options.map((option) => (
                                    <div 
                                        key={option._id}
                                        onClick={() => handleAnswerSelect(currentQuestion._id, option._id)}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 group ${
                                            currentAnswers[currentQuestion._id] === option._id 
                                            ? 'border-blue-500 bg-blue-50/50' 
                                            : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            currentAnswers[currentQuestion._id] === option._id
                                            ? 'border-blue-500 bg-blue-500'
                                            : 'border-slate-300 group-hover:border-blue-400'
                                        }`}>
                                            {currentAnswers[currentQuestion._id] === option._id && (
                                                <div className="w-2 h-2 bg-white rounded-full" />
                                            )}
                                        </div>
                                        <span className={`text-lg ${currentAnswers[currentQuestion._id] === option._id ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                                            {option.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        
                        {/* Navigation Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <Button 
                                variant="outline" 
                                onClick={() => handleNavigation(-1)}
                                disabled={currentQuestionIndex === 0}
                                className="px-8"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                            </Button>
                            
                            {currentQuestionIndex === (currentExamData?.totalQuestions || 0) - 1 ? (
                                <Button 
                                    className="bg-green-600 hover:bg-green-700 px-8"
                                    onClick={handleFinishSection}
                                >
                                    Bölməni Bitir <CheckSquare className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    className="px-8"
                                    onClick={() => handleNavigation(1)}
                                >
                                    Növbəti <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
             </div>
           ) : examStatus === 'results' ? (
                <div className="h-full flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500 overflow-hidden bg-slate-50/50">
                    {/* Header Bar */}
                    <div className="flex items-center justify-between px-2 py-2 shrink-0">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">İmtahan Nəticələri</h1>
                            <p className="text-slate-500 font-medium">Detallı analiz və statistika</p>
                        </div>
                     
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-8 space-y-8 custom-scrollbar">
                        {!examResults ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6">
                                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-bold text-slate-900">Nəticələr Hesablanır...</h3>
                                    <p className="text-slate-500">Zəhmət olmasa gözləyin, məlumatlar serverdən yüklənir.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                              
                                <Accordion 
                                    type="multiple" 
                                    value={accordionValue} 
                                    onValueChange={setAccordionValue}
                                    className="w-full space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-100"
                                >
                                {examResults.examTypes.map((typeResult, idx) => (
                                    <AccordionItem key={idx} value={`item-${idx}`} className="border-0">
                                        <AccordionTrigger className={`px-6 py-4 rounded-lg hover:no-underline [&[data-state=open]]:rounded-b-none transition-colors border shadow-sm ${
                                            typeResult.passed 
                                            ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-900' 
                                            : 'bg-red-50 border-red-200 hover:bg-red-100 text-red-900'
                                        }`}>
                                            <div className="flex items-center gap-4 w-full">
                                                <div className={`h-8 w-1 rounded-full ${typeResult.passed ? 'bg-green-600' : 'bg-red-600'}`} />
                                                <span className="text-xl font-black text-left">{typeResult.examTypeName}</span>
                                                <div className="ml-auto flex items-center gap-4 mr-4 shrink-0">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                                                        typeResult.passed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                                                    }`}>
                                                        {typeResult.passed ? 'Uğurlu' : 'Uğursuz'}
                                                    </span>
                                                    <span className="font-mono text-lg font-bold opacity-80">{Math.round(typeResult.score)}%</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 py-6 bg-white border-x border-b border-slate-200 rounded-b-lg shadow-sm">
                                            <div className="grid grid-cols-1 gap-4">
                                                {typeResult.questions && typeResult.questions.map((q, qIdx) => (
                                                    <Card key={q.questionId} className={`border-0 shadow-sm ring-1 ring-slate-900/5 overflow-hidden transition-all duration-200 hover:shadow-md ${
                                                        q.isCorrect ? 'bg-white' : 'bg-white'
                                                    }`}>
                                                        <div className={`h-1.5 w-full ${
                                                            q.isCorrect ? 'bg-green-500' : !q.selectedOptionId ? 'bg-amber-400' : 'bg-red-500'
                                                        }`} />
                                                        <CardContent className="p-6">
                                                            <div className="flex gap-4">
                                                                <div className="shrink-0">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                                        q.isCorrect ? 'bg-green-100 text-green-700' : !q.selectedOptionId ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        #{qIdx + 1}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex-1 space-y-4">
                                                                    <p className="font-bold text-lg text-slate-900 leading-relaxed">{q.text}</p>
                                                                    
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {q.options.map(opt => {
                                                                            const isSelected = q.selectedOptionId === opt._id;
                                                                            const isCorrectOption = opt.isCorrect;
                                                                            
                                                                            let cardClass = "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300";
                                                                            let icon = null;

                                                                            if (isCorrectOption) {
                                                                                cardClass = "bg-green-50 border-green-200 text-green-800 font-bold ring-1 ring-green-200";
                                                                                icon = <CheckSquare className="w-4 h-4 text-green-600" />;
                                                                            } else if (isSelected && !isCorrectOption) {
                                                                                cardClass = "bg-red-50 border-red-200 text-red-800 font-medium ring-1 ring-red-200";
                                                                                icon = <AlertTriangle className="w-4 h-4 text-red-600" />;
                                                                            }

                                                                            return (
                                                                                <div key={opt._id} className={`p-4 rounded-xl border flex items-center gap-3 transition-colors ${cardClass}`}>
                                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                                                        isCorrectOption ? 'border-green-500 bg-green-500 text-white' : 
                                                                                        isSelected ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300'
                                                                                    }`}>
                                                                                        {isCorrectOption && <CheckSquare className="w-3 h-3" />}
                                                                                        {isSelected && !isCorrectOption && <AlertTriangle className="w-3 h-3" />}
                                                                                    </div>
                                                                                    <span className="text-sm">{opt.text}</span>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0 flex flex-col items-end justify-between pl-4 border-l border-slate-100">
                                                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                                                                        q.isCorrect ? 'bg-green-100 text-green-700' : !q.selectedOptionId ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                    }`}>
                                                                        {q.isCorrect ? 'Doğru' : !q.selectedOptionId ? 'Boş' : 'Səhv'}
                                                                    </span>
                                                                    {q.timeSpentSeconds > 0 && (
                                                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-auto" title="Sərf olunan vaxt">
                                                                            <Clock className="w-3 h-3" /> {Math.round(q.timeSpentSeconds)}s
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                                </Accordion>
                            </>
                        )}
                    </div>
                </div>
           ) : isExamReady ? (
             <div className="flex flex-col h-full gap-4 animate-in slide-in-from-right-4 duration-500">
                {/* 1. Top Bar: Rules & Summary */}
                <Card className="border-0 shadow-md ring-1 ring-slate-900/5 bg-white shrink-0">
                   <div className="p-4 flex items-center justify-center gap-6">
                      <div className="flex items-center gap-3 text-amber-700 font-bold px-6 py-2 bg-amber-50 rounded-full border border-amber-100 shadow-sm animate-in fade-in zoom-in duration-500">
                         <Clock className="w-5 h-5" />
                         <span className="text-lg">Ümumi Vaxt: {getTotalDuration()} dəqiqə</span>
                      </div>
                      
                      {/* Global Countdown if started */}
                      {globalStartTime && (
                         <div className={`flex items-center gap-3 font-bold px-6 py-2 rounded-full border shadow-sm transition-colors ${timeLeft < 300 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                            <Clock className="w-5 h-5" />
                            <span className="text-2xl font-mono">{formatTime(timeLeft)}</span>
                         </div>
                      )}
                   </div>
                </Card>

                {/* 2. Main Content: Exam Selection */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                   {examTypes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {examTypes.map((type) => {
                          const progress = examProgress[type._id];
                          const isCompleted = progress?.status === 'completed';
                          const inProgress = progress?.status === 'in_progress';

                          return (
                          <Card key={type._id} className={`hover:shadow-xl transition-all border-slate-200 cursor-pointer group relative overflow-hidden flex flex-col h-full transform hover:-translate-y-1 duration-300 ${isCompleted ? 'opacity-70 bg-slate-50' : ''}`} onClick={() => !isCompleted && handleStartExam(type._id)}>
                             <div className={`absolute top-0 left-0 w-1.5 h-full ${isCompleted ? 'bg-green-500' : inProgress ? 'bg-amber-500' : 'bg-blue-500'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                             <CardContent className="p-6 flex flex-col h-full items-center text-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-sm group-hover:shadow-md ${isCompleted ? 'bg-green-100 text-green-600' : inProgress ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                  {isCompleted ? <CheckSquare className="w-8 h-8" /> : <Monitor className="w-8 h-8" />}
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

                                   {/* Progress Info */}
                                {progress && (
                                   <div className="w-full mb-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600 flex flex-col gap-2">
                                      <div className="flex justify-between items-center w-full">
                                          <span>Cavablanan: <b>{progress.answeredCount}/{progress.totalQuestions}</b></span>
                                          {inProgress && <span className="text-amber-600 font-bold text-xs uppercase">Davam Edir</span>}
                                          {isCompleted && <span className="text-green-600 font-bold text-xs uppercase">Bitib</span>}
                                      </div>
                                      
                                      {/* Show Result Stats if completed and available */}
                                      {isCompleted && (
                                          <div className="mt-1 w-full">
                                              {progress.result ? (
                                                  <div className="grid grid-cols-3 gap-2 w-full text-xs font-bold text-center animate-in fade-in zoom-in duration-300">
                                                      <div className="bg-green-100 text-green-700 border border-green-200 rounded-md px-1 py-1.5 flex flex-col items-center justify-center shadow-sm">
                                                          <span className="text-[10px] uppercase text-green-600/70 tracking-tighter">Doğru</span>
                                                          <span className="text-sm">{progress.result.correctCount ?? 0}</span>
                                                      </div>
                                                      <div className="bg-red-100 text-red-700 border border-red-200 rounded-md px-1 py-1.5 flex flex-col items-center justify-center shadow-sm">
                                                          <span className="text-[10px] uppercase text-red-600/70 tracking-tighter">Səhv</span>
                                                          <span className="text-sm">{progress.result.wrongCount ?? 0}</span>
                                                      </div>
                                                      <div className="bg-slate-200 text-slate-600 border border-slate-300 rounded-md px-1 py-1.5 flex flex-col items-center justify-center shadow-sm">
                                                          <span className="text-[10px] uppercase text-slate-500 tracking-tighter">Boş</span>
                                                          <span className="text-sm">{progress.result.emptyCount ?? 0}</span>
                                                      </div>
                                                  </div>
                                              ) : (
                                                  <div className="flex items-center justify-center py-2 gap-2 text-slate-500 animate-pulse">
                                                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                                                      <span className="text-xs font-medium">Hesablanır...</span>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                   </div>
                                )}
                                
                                <Button 
                                  className={`w-full mt-auto shadow-md hover:shadow-lg transition-all py-6 text-lg font-bold tracking-wide ${isCompleted ? 'bg-slate-400 hover:bg-slate-500 cursor-not-allowed' : inProgress ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isCompleted) handleStartExam(type._id);
                                  }}
                                  disabled={isCompleted}
                                >
                                  {isCompleted ? 'Tamamlandı' : inProgress ? 'Davam Et' : 'İmtahana Başla'}
                                </Button>
                             </CardContent>
                          </Card>
                        )})}
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

               
                </div>
              ) : (
                // Not Ready State Placeholder
              <div className="h-full flex flex-col items-center justify-center bg-white/50 rounded-xl border border-dashed border-slate-300/50 p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                    <Monitor className="w-8 h-8 text-slate-400" />
                 </div>
                 <div>
                    <h3 className="text-lg font-medium text-slate-900">Məlumatlarınız Sistemə Daxil Edilir...</h3>
                    <p className="text-slate-500">Zəhmət olmasa gözləyin</p>
                 </div>
              </div>
              )}
           </div>
        </div>
      </div>
  );
};

export default ExamClient;
