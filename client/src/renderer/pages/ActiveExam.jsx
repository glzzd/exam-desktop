import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Clock, Signal, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const ActiveExam = () => {
  const { socket } = useSocket();
  const [students, setStudents] = useState([]);

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

    return () => {
      socket.off('student-list-updated', onStudentListUpdate);
    };
  }, [socket]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cari İmtahan</h2>
          <p className="text-muted-foreground">
            Aktiv qoşulan kompüterlər və onların statusu
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border shadow-sm">
          <Signal className="text-green-500 w-4 h-4" />
          <span className="font-medium text-sm">Onlayn: {students.length}</span>
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
            <Card key={student.socketId} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-2 bg-blue-500 w-full" />
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <Monitor className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 leading-none">
                        {student.label || `Masa ${student.deskNumber || '?'}`}
                      </h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                    Aktiv
                  </Badge>
                </div>
                
                <div className="space-y-2">
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
                      {new Date(student.connectedAt).toLocaleTimeString()}
                    </div>
                    <span>{student.username}</span>
                  </div>
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
