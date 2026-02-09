import React, { useState, useEffect } from 'react';
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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export default function ExamTypes() {
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchExamTypes();
  }, []);

  const fetchExamTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/exam-types');
      if (response.data && response.data.data) {
        setExamTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching exam types:', error);
      toast.error('İmtahan növləri yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const slugify = (text) => {
    const map = {
      'ə': 'e', 'Ə': 'e',
      'ü': 'u', 'Ü': 'u',
      'ş': 's', 'Ş': 's',
      'ı': 'i', 'I': 'i',
      'İ': 'i',
      'ğ': 'g', 'Ğ': 'g',
      'ö': 'o', 'Ö': 'o',
      'ç': 'c', 'Ç': 'c'
    };
    
    return text
      .split('')
      .map(char => map[char] || char)
      .join('')
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'name' && !editingId) {
        newData.slug = slugify(value);
      }
      return newData;
    });
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleEdit = (examType) => {
    setEditingId(examType._id);
    setFormData({
      name: examType.name,
      slug: examType.slug,
      description: examType.description || '',
      isActive: examType.isActive
    });
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu imtahan növünü silmək istədiyinizə əminsiniz?')) return;

    try {
      await api.delete(`/exam-types/${id}`);
      setExamTypes(prev => prev.filter(item => item._id !== id));
      toast.success('İmtahan növü uğurla silindi');
    } catch (error) {
      console.error('Error deleting exam type:', error);
      toast.error('Silinmə zamanı xəta baş verdi');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const response = await api.patch(`/exam-types/${id}/status`, { isActive: !currentStatus });
      setExamTypes(prev => prev.map(item => 
        item._id === id ? { ...item, isActive: !currentStatus } : item
      ));
      toast.success('Status uğurla yeniləndi');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Status yenilənərkən xəta baş verdi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.slug) {
      toast.error('Ad və Slug sahələri mütləqdir');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const response = await api.put(`/exam-types/${editingId}`, formData);
        setExamTypes(prev => prev.map(item => 
          item._id === editingId ? response.data.data : item
        ));
        toast.success('İmtahan növü uğurla yeniləndi');
      } else {
        const response = await api.post('/exam-types', formData);
        setExamTypes(prev => [response.data.data, ...prev]);
        toast.success('İmtahan növü uğurla yaradıldı');
      }
      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.message || 'Əməliyyat zamanı xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      isActive: true
    });
    setEditingId(null);
  };

  return (
    <div className="p-8 space-y-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">İmtahan Növləri</CardTitle>
            <CardDescription>
              Sistemdəki mövcud imtahan növlərini idarə edin
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Yeni İmtahan Növü
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>{editingId ? 'İmtahan Növünü Redaktə Et' : 'Yeni İmtahan Növü Yarat'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Məs: Buraxılış İmtahanı"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="mes-buraxilis-imtahani"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Təsvir</Label>
                  <Input
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Qısa təsvir..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={handleSwitchChange}
                  />
                  <Label htmlFor="isActive">Aktivdir</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? 'Yadda Saxla' : 'Yarat'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Təsvir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Əməliyyatlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : examTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Məlumat tapılmadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  examTypes.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.slug}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggleStatus(item._id, item.isActive)}
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(item._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
