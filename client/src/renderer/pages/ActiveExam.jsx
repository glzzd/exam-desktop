import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Clock, Signal, AlertCircle, Edit2, User, Search, Building, PlayCircle, CheckCircle, CheckSquare } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EmployeeAssignmentDropdown = ({ student, socket, isOpen, onOpenChange, onAssign, disabled }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && socket) {
      const timer = setTimeout(() => socket.emit('admin-search-employees', search), 300);
      return () => clearTimeout(timer);
    }
  }, [search, isOpen, socket]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && socket) {
      const onResults = (data) => setResults(data);
      socket.on('admin-employees-result', onResults);
      return () => socket.off('admin-employees-result', onResults);
    }
  }, [isOpen, socket]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} variant="outline" className="w-full justify-start text-left h-auto py-2 px-3 border-dashed border-slate-300 hover:border-slate-400">
           <User className="w-4 h-4 mr-2 text-slate-500" />
           <div className="truncate font-medium text-sm">
              {student.assignedEmployee ? 
                 ` ${student.assignedEmployee.personalData.lastName} ${student.assignedEmployee.personalData.firstName} ${student.assignedEmployee.personalData.fatherName} ${student.assignedEmployee.personalData.gender==='male'?'oğlu':'qızı'}` 
                 : 'Seçilməyib'}
           </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
           <div className="p-2">
              <div className="relative">
                 <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                    ref={inputRef}
                    placeholder="Axtar..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                 />
              </div>
           </div>
           <div className="h-[1px] bg-slate-100" />
           <div className="max-h-[200px] overflow-y-auto p-1">
               {results.map(emp => (
                  <div 
                    key={emp._id} 
                    onClick={() => onAssign(emp._id)} 
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer"
                  >
                     <div className="flex flex-col">
                        <span className="font-medium text-sm"> {emp.personalData.lastName} {emp.personalData.firstName} {emp.personalData.fatherName} {emp.personalData.gender === 'male' ? 'oğlu':'qızı'}</span>
                        <span className="text-xs text-muted-foreground">{emp.timsUserName}</span>
                     </div>
                  </div>
               ))}
               {results.length === 0 && (
                   <div className="p-2 text-xs text-center text-muted-foreground">Tapılmadı</div>
               )}
           </div>
      </PopoverContent>
    </Popover>
  );
};

const StructureAssignmentDropdown = ({ student, socket, isOpen, onOpenChange, onAssign, disabled }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  
  useEffect(() => {
    if (isOpen && socket) {
      const timer = setTimeout(() => socket.emit('admin-search-structures', search), 300);
      return () => clearTimeout(timer);
    }
  }, [search, isOpen, socket]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && socket) {
      const onResults = (data) => setResults(data);
      socket.on('admin-structures-result', onResults);
      return () => socket.off('admin-structures-result', onResults);
    }
  }, [isOpen, socket]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button disabled={disabled} variant="outline" className="w-full justify-start text-left h-auto py-2 px-3 border-dashed border-slate-300 hover:border-slate-400">
           <Building className="w-4 h-4 mr-2 text-slate-500" />
           <div className="truncate font-medium text-sm">
              {student.assignedStructure ? 
                 student.assignedStructure.name
                 : 'Seçilməyib'}
           </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
           <div className="p-2">
              <div className="relative">
                 <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                    ref={inputRef}
                    placeholder="Axtar..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                 />
              </div>
           </div>
           <div className="h-[1px] bg-slate-100" />
           <div className="max-h-[200px] overflow-y-auto p-1">
               {results.map(struct => (
                  <div 
                    key={struct._id} 
                    onClick={() => onAssign(struct._id)} 
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer"
                  >
                     <div className="flex flex-col">
                        <span className="font-medium text-sm">{struct.name}</span>
                        <span className="text-xs text-muted-foreground">{struct.code}</span>
                     </div>
                  </div>
               ))}
               {results.length === 0 && (
                   <div className="p-2 text-xs text-center text-muted-foreground">Tapılmadı</div>
               )}
           </div>
      </PopoverContent>
    </Popover>
  );
};

const ActiveExam = () => {
  const { socket } = useSocket();
  const [students, setStudents] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Employee search state
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Structure search state
  const [openStructureDropdownId, setOpenStructureDropdownId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Request initial list
    socket.emit('admin-get-students');

    // Listen for updates
    const onStudentListUpdate = (list) => {
      console.log('Received student list:', list);
      // Sort by deskNumber
      const sortedList = [...list].sort((a, b) => {
        return (a.deskNumber || 9999) - (b.deskNumber || 9999);
      });
      setStudents(sortedList);
    };

    socket.on('student-list-updated', onStudentListUpdate);

    const onSaveSuccess = (data) => {
      toast.success(data.message || 'Məlumatlar bazaya uğurla yazıldı!');
    };

    const onResetSuccess = (data) => {
      toast.success(data.message || 'Masa məlumatları sıfırlandı.');
    };
    
    const onForceFinishSuccess = (data) => {
      toast.success(data.message || 'İmtahan bitirildi.');
    };

    const onError = (data) => {
        toast.error(data.message || 'Xəta baş verdi');
    };

    socket.on('admin-save-success', onSaveSuccess);
    socket.on('admin-reset-success', onResetSuccess);
    socket.on('admin-force-finish-success', onForceFinishSuccess);
    socket.on('error', onError);

    return () => {
      socket.off('student-list-updated', onStudentListUpdate);
      socket.off('admin-save-success', onSaveSuccess);
      socket.off('admin-reset-success', onResetSuccess);
      socket.off('admin-force-finish-success', onForceFinishSuccess);
      socket.off('error', onError);
    };
  }, [socket]);

  const handleSaveExam = (uuid) => {
    if (socket) {
        if (confirm('Nəticələri bazaya yazmaq istədiyinizə əminsiniz?')) {
            socket.emit('admin-save-exam-result', { uuid });
            toast.info('Sorğu göndərildi...');
        }
    }
  };

  const handleResetDesk = (uuid) => {
      if (socket) {
          if (confirm('Masa məlumatlarını tamamilə sıfırlamaq istədiyinizə əminsiniz?')) {
              socket.emit('admin-reset-desk', { uuid });
          }
      }
  };

  const handleForceFinish = (uuid) => {
    if (socket) {
      if (confirm('İmtahanı bitirmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.')) {
        socket.emit('admin-force-finish-exam', { uuid });
      }
    }
  };

  const handleEditClick = (student) => {
    setEditingId(student.uuid);
    setEditValue(student.deskNumber === '---' ? '' : student.deskNumber || '');
  };

  const handleSaveDeskNumber = (uuid) => {
    if (socket && editValue) {
      socket.emit('admin-update-desk-number', { uuid, deskNumber: editValue });
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleAssignEmployee = (uuid, employeeId) => {
    if (socket) {
      socket.emit('admin-assign-employee', { uuid, employeeId });
      setOpenDropdownId(null);
    }
  };

  const handleAssignStructure = (uuid, structureId) => {
    if (socket) {
      socket.emit('admin-assign-structure', { uuid, structureId });
      setOpenStructureDropdownId(null);
    }
  };

  const handleConfirmDeskInfo = (targetUuid = null) => {
    if (!socket) return;

    let targetUuids = [];
    
    if (targetUuid) {
      // Single confirmation
      targetUuids = [targetUuid];
    } else {
      // Bulk confirmation - all connected students with assigned employee and structure AND NOT CONFIRMED
      targetUuids = students
        .filter(s => s.status === 'connected' && s.assignedEmployee && s.assignedStructure && !s.isConfirmed)
        .map(s => s.uuid);
    }

    if (targetUuids.length > 0) {
      socket.emit('admin-confirm-desk-info', { targetUuids });
      toast.success(`${targetUuids.length} masa üçün məlumat təsdiqləndi`);
    } else {
      toast.error('Təsdiqləmək üçün uyğun masa tapılmadı');
    }
  };

  const eligibleForConfirmationCount = students.filter(s => s.status === 'connected' && s.assignedEmployee && s.assignedStructure && !s.isConfirmed).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cari imtahan</h2>
          <p className="text-muted-foreground">
            Aktiv qoşulan kompüterlər və onların statusu
          </p>
        </div>
        <div className="flex items-center space-x-4">
           {eligibleForConfirmationCount > 0 && (
              <Button 
                onClick={() => handleConfirmDeskInfo()} 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Seçilənləri Təsdiqlə ({eligibleForConfirmationCount})
              </Button>
           )}
           <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
             <Signal className="text-green-500 w-4 h-4" />
             <span className="font-medium text-sm">Onlayn: {students.filter(s => s.status === 'connected').length}</span>
           </div>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Monitor className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Hələ heç kim qoşulmayıb</p>
            <p className="text-sm">Tələbələr imtahan terminalına daxil olduqda burada görünəcək.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((student) => (
            <Card key={(student.uuid && student.uuid !== 'unknown') ? student.uuid : student.socketId} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-2 w-full ${
                student.status === 'disconnected' ? 'bg-orange-500' : 
                student.status === 'exited' ? 'bg-red-500' : 
                student.status === 'started' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      student.status === 'disconnected' ? 'bg-orange-50' : 
                      student.status === 'exited' ? 'bg-red-50' : 
                      student.status === 'started' ? 'bg-yellow-50' : 'bg-blue-50'
                    }`}>
                      <Monitor className={`h-5 w-5 ${
                        student.status === 'disconnected' ? 'text-orange-600' : 
                        student.status === 'exited' ? 'text-red-600' : 
                        student.status === 'started' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      {editingId === student.uuid ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 w-20 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveDeskNumber(student.uuid);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-600" onClick={() => handleSaveDeskNumber(student.uuid)}>✓</Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={handleCancelEdit}>✕</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => handleEditClick(student)}>
                          <h3 className="font-bold text-lg text-slate-900 leading-none">
                            {student.label || `Masa ${student.deskNumber || '?'}`}
                          </h3>
                          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`
                    ${student.status === 'disconnected' ? 'text-orange-600 bg-orange-50 border-orange-200' : ''}
                    ${student.status === 'exited' ? 'text-red-600 bg-red-50 border-red-200' : ''}
                    ${student.status === 'started' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : ''}
                    ${student.status === 'connected' ? 'text-green-600 bg-green-50 border-green-200' : ''}
                  `}>
                    {student.status === 'disconnected' ? 'Bağlantı kəsildi' : 
                     student.status === 'exited' ? 'Proqramdan çıxış edildi' : 
                     student.status === 'started' ? 'İmtahan başladı' : 'Aktiv'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Əməkdaş</p>
                    <EmployeeAssignmentDropdown 
                      student={student}
                      socket={socket}
                      isOpen={openDropdownId === student.uuid}
                      disabled={student.isConfirmed}
                      onOpenChange={(open) => {
                          if (open) {
                              setOpenDropdownId(student.uuid);
                          } else {
                              setOpenDropdownId(null);
                          }
                      }}
                      onAssign={(id) => handleAssignEmployee(student.uuid, id)}
                    />
                  </div>

                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Struktur</p>
                    <StructureAssignmentDropdown 
                      student={student}
                      socket={socket}
                      isOpen={openStructureDropdownId === student.uuid}
                      disabled={student.isConfirmed}
                      onOpenChange={(open) => {
                          if (open) {
                              setOpenStructureDropdownId(student.uuid);
                          } else {
                              setOpenStructureDropdownId(null);
                          }
                      }}
                      onAssign={(id) => handleAssignStructure(student.uuid, id)}
                    />
                  </div>

                  {student.assignedEmployee && student.assignedStructure && student.status === 'connected' && !student.isConfirmed && (
                    <Button 
                      className="w-full mb-4 bg-green-600 hover:bg-green-700 text-white h-auto py-2 text-xs whitespace-normal"
                      onClick={() => handleConfirmDeskInfo(student.uuid)}
                    >
                      <CheckCircle className="w-3 h-3 mr-2 flex-shrink-0" />
                      Masa məlumatının doğruluğu təstiq edildi
                    </Button>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Kompüter Adı</p>
                    <p className="font-bold text-slate-800 truncate" title={student.hostname}>
                      {student.hostname || 'Naməlum'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">IP Ünvan</p>
                      <p className="text-sm font-medium">{student.ip || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Platforma</p>
                      <p className="text-sm font-medium capitalize truncate">{student.platform || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t mt-2">
                    <div>
                       <p className="text-xs text-muted-foreground">MAC</p>
                       <p className="text-[10px] font-mono text-slate-600 truncate" title={student.mac}>{student.mac || '-'}</p>
                    </div>
                    <div>
                       <p className="text-xs text-muted-foreground">UUID</p>
                       <p className="text-[10px] font-mono text-slate-600 truncate" title={student.uuid}>
                         {student.uuid ? (student.uuid.length > 8 ? student.uuid.substring(0, 8) + '...' : student.uuid) : '-'}
                       </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {student.status === 'disconnected' && student.disconnectedAt ? 
                        <span className="text-orange-600 font-medium">Kəsilib: {new Date(student.disconnectedAt).toLocaleTimeString()}</span> : 
                        student.status === 'exited' && student.disconnectedAt ?
                        <span className="text-red-600 font-medium">Çıxış: {new Date(student.disconnectedAt).toLocaleTimeString()}</span> :
                        new Date(student.connectedAt).toLocaleTimeString()
                      }
                    </div>
                    <span>{student.username}</span>
                  </div>

                  {!student.isConfirmed && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full mt-4 h-8 text-xs" 
                      onClick={() => handleAssignEmployee(student.uuid, null)}
                    >
                      Masa məlumatlarını sıfırla
                    </Button>
                  )}

                  {student.isConfirmed && student.status === 'completed' && !student.isSaved && (
                    <Button 
                      className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-auto py-2 whitespace-normal"
                      onClick={() => handleSaveExam(student.uuid)}
                    >
                      Məlumatları Bazaya Yaz
                    </Button>
                  )}

                  {student.isConfirmed && student.status === 'completed' && student.isSaved && (
                    <Button 
                      variant="destructive"
                      className="w-full mt-4 h-auto py-2 whitespace-normal"
                      onClick={() => handleResetDesk(student.uuid)}
                    >
                      Masa Məlumatlarını Sıfırla
                    </Button>
                  )}

                  {student.results && student.results.length > 0 && (
                    <div className="mt-4 border-t pt-4 animate-in fade-in zoom-in duration-300">
                        <h4 className="text-sm font-semibold mb-2 text-slate-800 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" />
                            Nəticələr
                        </h4>
                        <div className="space-y-2">
                        {student.results.map((result, idx) => (
                            <div key={idx} className={`p-2 rounded-md border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-medium text-sm truncate max-w-[120px]" title={result.examTypeName}>{result.examTypeName}</span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${result.passed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    {result.passed ? 'KEÇDİ' : 'KƏSİLDİ'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                                    <div className="bg-white/60 rounded px-1 py-0.5 border border-slate-100">
                                        <span className="text-green-600 font-bold block">{result.correctCount}</span> 
                                        <span className="text-slate-500">Doğru</span>
                                    </div>
                                    <div className="bg-white/60 rounded px-1 py-0.5 border border-slate-100">
                                        <span className="text-red-600 font-bold block">{result.wrongCount}</span> 
                                        <span className="text-slate-500">Səhv</span>
                                    </div>
                                    <div className="bg-white/60 rounded px-1 py-0.5 border border-slate-100">
                                        <span className="text-slate-600 font-bold block">{result.emptyCount}</span> 
                                        <span className="text-slate-500">Boş</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveExam;
