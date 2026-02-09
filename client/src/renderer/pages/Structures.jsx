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
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";

export default function Structures() {
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      setLoading(true);
      const response = await api.get('/structures');
      if (response.data && response.data.data) {
        setStructures(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching structures:', error);
      toast.error('Strukturlar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (checked) => {
    setFormData(prev => ({ ...prev, isActive: checked }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await api.post('/structures/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { added, updated, failed, errors } = response.data.data;
      
      let message = `Import tamamlandı: ${added} yeni, ${updated} yeniləndi.`;
      if (failed > 0) message += ` ${failed} xəta.`;
      
      if (failed > 0) {
        toast.warning(message);
        console.error('Import errors:', errors);
      } else {
        toast.success(message);
      }

      fetchStructures();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Fayl yüklənərkən xəta baş verdi');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = (structure) => {
    setEditingId(structure._id);
    setFormData({
      name: structure.name,
      code: structure.code,
      description: structure.description || '',
      isActive: structure.isActive
    });
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu strukturu silmək istədiyinizə əminsiniz?')) return;

    try {
      await api.delete(`/structures/${id}`);
      setStructures(prev => prev.filter(item => item._id !== id));
      toast.success('Struktur uğurla silindi');
    } catch (error) {
      console.error('Error deleting structure:', error);
      toast.error('Silinmə zamanı xəta baş verdi');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const response = await api.patch(`/structures/${id}/status`, { isActive: !currentStatus });
      setStructures(prev => prev.map(item => 
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
    
    if (!formData.name || !formData.code) {
      toast.error('Ad və Kod sahələri mütləqdir');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        const response = await api.put(`/structures/${editingId}`, formData);
        setStructures(prev => prev.map(item => 
          item._id === editingId ? response.data.data : item
        ));
        toast.success('Struktur uğurla yeniləndi');
      } else {
        const response = await api.post('/structures', formData);
        setStructures(prev => [response.data.data, ...prev]);
        toast.success('Struktur uğurla yaradıldı');
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
      code: '',
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
            <CardTitle className="text-2xl font-bold">Strukturlar</CardTitle>
            <CardDescription>
              Sistemdəki mövcud strukturları idarə edin
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".xlsx,.xls"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Excel Yüklə
            </Button>
            <Dialog open={isOpen} onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Struktur
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>{editingId ? 'Strukturu Redaktə Et' : 'Yeni Struktur Yarat'}</DialogTitle>
                </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Məs: İmtahan Mərkəzi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Kod</Label>
                  <Input
                    id="code"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Məs: 1140"
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Kod</TableHead>
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
                ) : structures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Məlumat tapılmadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  structures.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.code}</TableCell>
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
