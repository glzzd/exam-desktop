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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, CheckCircle2, XCircle, ChevronDown } from "lucide-react";

export default function Questions() {
  const [questions, setQuestions] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    text: '',
    examType: '',
    structureCodes: [],
    isActive: true,
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  useEffect(() => {
    fetchExamTypes();
    fetchStructures();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, search]);

  const fetchExamTypes = async () => {
    try {
      const response = await api.get('/exam-types');
      if (response.data && response.data.data) {
        setExamTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching exam types:', error);
      toast.error('İmtahan növləri yüklənərkən xəta baş verdi');
    }
  };

  const fetchStructures = async () => {
    try {
      const response = await api.get('/structures');
      if (response.data && response.data.data) {
        setStructures(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching structures:', error);
      toast.error('Strukturlar yüklənərkən xəta baş verdi');
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/questions?page=${page}&limit=10&search=${search}`);
      if (response.data && response.data.data) {
        setQuestions(response.data.data.questions);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Suallar yüklənərkən xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleStructure = (code) => {
    setFormData(prev => {
      const codes = prev.structureCodes || [];
      if (codes.includes(code)) {
        return { ...prev, structureCodes: codes.filter(c => c !== code) };
      } else {
        return { ...prev, structureCodes: [...codes, code] };
      }
    });
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index].text = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleCorrectOptionChange = (index) => {
    const newOptions = formData.options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index
    }));
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.text || !formData.examType) {
      toast.error('Sual mətni və İmtahan növü mütləqdir');
      return;
    }

    if (!formData.structureCodes || formData.structureCodes.length === 0) {
      toast.error('Ən azı bir struktur seçilməlidir');
      return;
    }

    const hasCorrectOption = formData.options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      toast.error('Ən azı bir düzgün cavab seçilməlidir');
      return;
    }

    const validOptions = formData.options.every(opt => opt.text.trim() !== '');
    if (!validOptions) {
      toast.error('Bütün variantlar doldurulmalıdır');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/questions/${editingId}`, formData);
        toast.success('Sual uğurla yeniləndi');
      } else {
        await api.post('/questions', formData);
        toast.success('Sual uğurla yaradıldı');
      }
      setIsOpen(false);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Error saving question:', error);
      toast.error(error.response?.data?.message || 'Xəta baş verdi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (question) => {
    setEditingId(question._id);
    setFormData({
      text: question.text,
      examType: question.examType._id,
      structureCodes: question.structureCodes || [],
      isActive: question.isActive,
      options: question.options.map(opt => ({
        text: opt.text,
        isCorrect: opt.isCorrect
      }))
    });
    setIsOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu sualı silmək istədiyinizə əminsiniz?')) return;

    try {
      await api.delete(`/questions/${id}`);
      toast.success('Sual silindi');
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Sual silinərkən xəta baş verdi');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      text: '',
      examType: '',
      structureCodes: [],
      isActive: true,
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suallar</h2>
          <p className="text-muted-foreground">
            İmtahan suallarının idarə edilməsi
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Yeni Sual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Sualı Redaktə Et' : 'Yeni Sual'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="text">Sual Mətni</Label>
                <Input
                  id="text"
                  name="text"
                  value={formData.text}
                  onChange={handleInputChange}
                  placeholder="Sualın mətnini daxil edin"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="examType">İmtahan Növü</Label>
                  <select
                    id="examType"
                    name="examType"
                    value={formData.examType}
                    onChange={handleInputChange}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Seçin</option>
                    {examTypes.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Strukturlar</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        {formData.structureCodes.length > 0 
                          ? `${formData.structureCodes.length} struktur seçilib` 
                          : "Struktur seçin"}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 h-64 overflow-y-auto">
                      {structures.map((structure) => (
                        <DropdownMenuCheckboxItem
                          key={structure._id}
                          checked={formData.structureCodes.includes(structure.code)}
                          onCheckedChange={() => toggleStructure(structure.code)}
                        >
                          {structure.name || structure.code}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Cavab Variantları</Label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className={`flex h-6 w-6 items-center justify-center rounded-full border cursor-pointer ${
                        option.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}
                      onClick={() => handleCorrectOptionChange(index)}
                    >
                      {option.isCorrect && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <Input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`${String.fromCharCode(65 + index)}) Variant`}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive">Status (Aktiv)</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Ləğv et
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? 'Yadda saxla' : 'Əlavə et'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Axtarış..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sual</TableHead>
                <TableHead>İmtahan Növü</TableHead>
                <TableHead>Strukturlar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Əməliyyatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : questions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Məlumat tapılmadı
                  </TableCell>
                </TableRow>
              ) : (
                questions.map((question) => (
                  <TableRow key={question._id}>
                    <TableCell className="font-medium max-w-md truncate">
                      {question.text}
                    </TableCell>
                    <TableCell>{question.examType?.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {question.structureCodes?.slice(0, 3).map((code) => (
                          <span key={code} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {code}
                          </span>
                        ))}
                        {question.structureCodes?.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{question.structureCodes.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {question.isActive ? (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-700 hover:bg-green-200">
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-red-100 text-red-700 hover:bg-red-200">
                          Deaktiv
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(question)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(question._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Əvvəlki
          </Button>
          <div className="text-sm text-muted-foreground">
            Səhifə {page} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Növbəti
          </Button>
        </div>
      )}
    </div>
  );
}
