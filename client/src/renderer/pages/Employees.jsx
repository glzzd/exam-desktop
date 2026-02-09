import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Search, Trash2, FileSpreadsheet } from "lucide-react";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Pagination and Search
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    timsUserName: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    gender: 'male',
    position: '',
    rank: '',
    note: '',
    isActive: true
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [page, search]);

  const fetchRoles = async () => {
    try {
      const response = await api.get('/rbac/roles');
      if (response.data && response.data.data) {
        setRoles(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Rollar yüklənərkən xəta baş verdi');
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/employees/get-all?page=${page}&limit=10&search=${search}`);
      if (response.data && response.data.data) {
        setEmployees(response.data.data.employees);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Əməkdaşlar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      timsUserName: '',
      firstName: '',
      lastName: '',
      fatherName: '',
      gender: 'male',
      position: '',
      rank: '',
      note: '',
      isActive: true
    });
  };

  const handleEdit = (employee) => {
    setEditingId(employee._id);
    setFormData({
      timsUserName: employee.timsUserName || '',
      firstName: employee.personalData?.firstName || '',
      lastName: employee.personalData?.lastName || '',
      fatherName: employee.personalData?.fatherName || '',
      gender: employee.personalData?.gender || 'male',
      position: employee.position || '',
      rank: employee.rank || '',
      note: employee.note || '',
      isActive: employee.isActive
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName) {
      toast.error('Zəhmət olmasa vacib sahələri doldurun');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        timsUserName: formData.timsUserName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        fatherName: formData.fatherName,
        gender: formData.gender,
        position: formData.position,
        rank: formData.rank,
        note: formData.note,
        isActive: formData.isActive
      };

      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
        toast.success('Əməkdaş məlumatları yeniləndi');
      } else {
        await api.post('/employees/add-new', payload);
        toast.success('Yeni əməkdaş yaradıldı');
      }
      
      setIsOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error(error.response?.data?.message || 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu əməkdaşı silmək istədiyinizə əminsiniz?')) {
      try {
        await api.delete(`/employees/${id}`);
        toast.success('Əməkdaş silindi');
        fetchEmployees();
      } catch (error) {
        console.error('Error deleting employee:', error);
        toast.error('Əməkdaş silinərkən xəta baş verdi');
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await api.post('/employees/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast.success(response.data.message || 'İmport uğurla tamamlandı');
      fetchEmployees();
    } catch (error) {
      console.error('Error importing employees:', error);
      toast.error(error.response?.data?.message || 'İmport zamanı xəta baş verdi');
    } finally {
      setLoading(false);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Əməkdaşlar</h2>
          <p className="text-muted-foreground">
            Sistem istifadəçilərinin idarə edilməsi
          </p>
        </div>
        <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
            <Button variant="outline" onClick={handleImportClick}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel-dən Yüklə
            </Button>
            <Dialog open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Əməkdaş
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Əməkdaş məlumatlarını redaktə et' : 'Yeni Əməkdaş'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ad</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Soyad</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Ata adı</Label>
                  <Input
                    id="fatherName"
                    name="fatherName"
                    value={formData.fatherName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Cins</Label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="male">Kişi</option>
                    <option value="female">Qadın</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position">Vəzifə</Label>
                  <Input
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rank">Rütbə</Label>
                  <Input
                    id="rank"
                    name="rank"
                    value={formData.rank}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timsUserName">TIMS İstifadəçi Adı</Label>
                <Input
                  id="timsUserName"
                  name="timsUserName"
                  value={formData.timsUserName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Qeyd (Note)</Label>
                <Input
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Status (Aktiv)</Label>
              </div>

                <Button type="submit" className="w-full">
                  {editingId ? 'Yadda saxla' : 'Əlavə et'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Axtarış..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.A.A.</TableHead>
                <TableHead>Rütbəsi</TableHead>
                <TableHead className="text-right">Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Məlumat tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee._id}>
                    <TableCell className="font-medium">
                      {employee.personalData?.lastName} {employee.personalData?.firstName} {employee.personalData?.fatherName}
                    </TableCell>
                    <TableCell>{employee.rank || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(employee._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Simple Pagination Controls (can be enhanced) */}
      <div className="flex justify-end gap-2">
         <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
         >
            Əvvəlki
         </Button>
         <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
         >
            Növbəti
         </Button>
      </div>
    </div>
  );
}
