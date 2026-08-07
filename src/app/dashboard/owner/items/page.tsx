'use client';

import { useState, useEffect } from 'react';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { FileUpload } from '@/components/ui/FileUpload';
import { BarcodeRenderer } from '@/components/ui/BarcodeRenderer';
import { CategoryTree } from '@/components/ui/CategoryTree';
import { CategoryItem } from '@/lib/categories';
import { UnitOfMeasureItem } from '@/lib/uom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Barcode as BarcodeIcon,
  Upload,
  FolderTree,
  Ruler,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface ItemMaster {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  categoryId?: string;
  categoryName?: string;
  uomId?: string;
  uomCode?: string;
  uomName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MasterDataItemsPage() {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasureItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uomFilter, setUomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Active Tab: 'ITEMS' | 'CATEGORIES' | 'UOM'
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'CATEGORIES' | 'UOM'>('ITEMS');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);

  // Selected item for detail view / editing
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);

  // Form State - Item
  const [formId, setFormId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'DISCONTINUED'>('ACTIVE');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State - New Category
  const [catName, setCatName] = useState('');
  const [catParentId, setCatParentId] = useState('');

  // Form State - New UOM
  const [uomCode, setUomCode] = useState('');
  const [uomName, setUomName] = useState('');
  const [uomDesc, setUomDesc] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes, uomRes] = await Promise.all([
        fetch('/api/mdm/items'),
        fetch('/api/mdm/categories'),
        fetch('/api/mdm/uom'),
      ]);
      const itemsData = await itemsRes.json();
      const catData = await catRes.json();
      const uomData = await uomRes.json();

      setItems(itemsData.items || []);
      setCategories(catData.categories || []);
      setUoms(uomData.uoms || []);
    } catch (e) {
      setToast({ message: 'Failed to load Master Data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenItemModal = (item?: ItemMaster) => {
    if (item) {
      setFormId(item.id);
      setItemName(item.itemName);
      setSku(item.sku);
      setBarcode(item.barcode);
      setCostPrice(item.costPrice.toString());
      setSellingPrice(item.sellingPrice.toString());
      setStatus(item.status);
      setDescription(item.description || '');
      setCategoryId(item.categoryId || '');
      setUomId(item.uomId || '');
    } else {
      setFormId(null);
      setItemName('');
      setSku('');
      setBarcode('');
      setCostPrice('');
      setSellingPrice('');
      setStatus('ACTIVE');
      setDescription('');
      setCategoryId('');
      setUomId('');
    }
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = formId ? 'PUT' : 'POST';
      const res = await fetch('/api/mdm/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formId,
          itemName,
          sku,
          barcode,
          costPrice,
          sellingPrice,
          status,
          description,
          categoryId,
          uomId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setToast({ message: `Item master ${formId ? 'updated' : 'created'} successfully!`, type: 'success' });
        setIsItemModalOpen(false);
        fetchInitialData();
      } else {
        setToast({ message: data.error || 'Failed to save item master.', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Network error while saving item.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item master record?')) return;
    try {
      const res = await fetch(`/api/mdm/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Item deleted from Master Data repository.', type: 'success' });
        fetchInitialData();
      }
    } catch (e) {
      setToast({ message: 'Failed to delete item.', type: 'error' });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mdm/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, parentId: catParentId }),
      });
      if (res.ok) {
        setToast({ message: `Category "${catName}" added to taxonomy!`, type: 'success' });
        setCatName('');
        setIsCatModalOpen(false);
        fetchInitialData();
      }
    } catch (e) {
      setToast({ message: 'Failed to add category.', type: 'error' });
    }
  };

  const handleCreateUOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mdm/uom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: uomCode, name: uomName, description: uomDesc }),
      });
      if (res.ok) {
        setToast({ message: `UOM "${uomCode.toUpperCase()}" registered!`, type: 'success' });
        setUomCode('');
        setUomName('');
        setIsUomModalOpen(false);
        fetchInitialData();
      }
    } catch (e) {
      setToast({ message: 'Failed to add UOM.', type: 'error' });
    }
  };

  const handleCsvSelect = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        setToast({ message: 'CSV file is empty or missing headers.', type: 'error' });
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const parsedItems = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim());
        if (parts.length >= 1 && parts[0]) {
          parsedItems.push({
            itemName: parts[0] || `CSV Item ${i}`,
            sku: parts[1] || '',
            barcode: parts[2] || '',
            costPrice: parts[3] || '0',
            sellingPrice: parts[4] || '0',
            category: parts[5] || '',
            uom: parts[6] || '',
          });
        }
      }

      try {
        const res = await fetch('/api/mdm/items/bulk-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: parsedItems }),
        });
        const data = await res.json();
        if (res.ok) {
          setToast({ message: data.message, type: 'success' });
          setIsCsvModalOpen(false);
          fetchInitialData();
        } else {
          setToast({ message: data.error || 'CSV import failed.', type: 'error' });
        }
      } catch (err) {
        setToast({ message: 'Network error during CSV upload.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || item.categoryId === categoryFilter;
    const matchesUom = !uomFilter || item.uomId === uomFilter || item.uomCode === uomFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesUom && matchesStatus;
  });

  const columns: Column<ItemMaster>[] = [
    {
      header: 'SKU & Barcode',
      cell: (row) => (
        <div>
          <div className="text-xs font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
            {row.sku}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1 font-semibold">
            <BarcodeIcon className="w-3 h-3 text-slate-400" /> {row.barcode}
          </div>
        </div>
      ),
    },
    {
      header: 'Item Master Name',
      cell: (row) => (
        <div>
          <div className="text-xs font-bold text-slate-900 leading-snug">{row.itemName}</div>
          {row.description && <div className="text-[11px] text-slate-500 truncate max-w-xs">{row.description}</div>}
        </div>
      ),
    },
    {
      header: 'Taxonomy Category',
      cell: (row) => (
        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          {row.categoryName || 'General Hardware'}
        </span>
      ),
    },
    {
      header: 'UOM Unit',
      cell: (row) => (
        <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">
          {row.uomCode || 'PCS'}
        </span>
      ),
    },
    {
      header: 'Cost / Selling Price',
      cell: (row) => (
        <div>
          <div className="text-xs font-extrabold text-slate-900">${Number(row.sellingPrice).toFixed(2)}</div>
          <div className="text-[10px] font-mono text-slate-400">Cost: ${Number(row.costPrice).toFixed(2)}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => {
        let variant: 'success' | 'amber' | 'slate' = 'success';
        if (row.status === 'DRAFT') variant = 'amber';
        if (row.status === 'DISCONTINUED') variant = 'slate';
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedItem(row);
              setIsDetailModalOpen(true);
            }}
            title="View Barcode & Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handleOpenItemModal(row)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteItem(row.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header Banner matching Platform Owner Design */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-200">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-widest font-mono mb-1">
              Pillar 03 • Master Data MDM Engine
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Item Master Data &amp; Barcode Repository</h1>
            <p className="text-xs text-slate-500 font-mono">
              Single Source of Truth: {items.length} Master Items • Category Hierarchy Tree • GS1 Barcodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="secondary" onClick={() => setIsCsvModalOpen(true)} className="whitespace-nowrap shrink-0">
            <Upload className="w-4 h-4" /> Bulk CSV Import
          </Button>
          <Button onClick={() => handleOpenItemModal()} className="whitespace-nowrap shrink-0">
            <Plus className="w-4 h-4" /> Create Item Master
          </Button>
        </div>
      </div>

      {/* Top Navigation Tabs: ITEMS | CATEGORIES | UOM */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'ITEMS'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package className="w-4 h-4 text-indigo-400" /> Item Master Catalog ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'CATEGORIES'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderTree className="w-4 h-4 text-purple-400" /> Category Taxonomy Tree ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('UOM')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'UOM'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Ruler className="w-4 h-4 text-emerald-400" /> Unit of Measure (UOM) ({uoms.length})
        </button>
      </div>

      {/* TAB 1: ITEM MASTER CATALOG TABLE */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search by Name, SKU or Barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="w-44">
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Categories' },
                    ...categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              <div className="w-36">
                <Select
                  value={uomFilter}
                  onChange={(e) => setUomFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All UOMs' },
                    ...uoms.map((u) => ({ value: u.code, label: `${u.code} (${u.name})` })),
                  ]}
                />
              </div>

              <div className="w-36">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'DISCONTINUED', label: 'Discontinued' },
                  ]}
                />
              </div>

              <Button variant="secondary" onClick={fetchInitialData} isLoading={loading}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredItems}
              isLoading={loading}
              emptyMessage="No matching item master records found."
            />
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY TAXONOMY TREE */}
      {activeTab === 'CATEGORIES' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Category &amp; Subcategory Hierarchy Taxonomy</h2>
              <p className="text-xs text-slate-500 font-mono">Manage Parent-Child Category Relationship Structures</p>
            </div>
            <Button onClick={() => setIsCatModalOpen(true)} className="whitespace-nowrap shrink-0">
              <Plus className="w-4 h-4" /> Add New Category
            </Button>
          </div>

          <div className="max-w-2xl">
            <CategoryTree categories={categories} />
          </div>
        </div>
      )}

      {/* TAB 3: UNIT OF MEASURE (UOM) SETUP */}
      {activeTab === 'UOM' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">System Units of Measure (UOM) Setup</h2>
              <p className="text-xs text-slate-500 font-mono">Standard 3PL Logistics Inventory Units</p>
            </div>
            <Button onClick={() => setIsUomModalOpen(true)} className="whitespace-nowrap shrink-0">
              <Plus className="w-4 h-4" /> Register New UOM
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uoms.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded border border-indigo-200">
                    {u.code}
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">{u.name}</div>
                {u.description && <div className="text-xs text-slate-500">{u.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT ITEM MASTER */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={formId ? 'Edit Item Master Record' : 'Create New Item Master Record'}
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Item Master Name"
            required
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Industrial Barcode Scanner 2D"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU (Leave blank to auto-generate)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. LQ-SCN-00101"
            />
            <Input
              label="Barcode EAN-13 (Leave blank to auto-generate)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 9312345678901"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Taxonomy Category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              label="Unit of Measure (UOM)"
              value={uomId}
              onChange={(e) => setUomId(e.target.value)}
              options={[
                { value: '', label: 'Select UOM' },
                ...uoms.map((u) => ({ value: u.id, label: `${u.code} - ${u.name}` })),
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Cost Price ($ AUD)"
              type="number"
              step="0.01"
              required
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="120.00"
            />
            <Input
              label="Selling Price ($ AUD)"
              type="number"
              step="0.01"
              required
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="249.99"
            />
            <Select
              label="Item Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'DISCONTINUED', label: 'Discontinued' },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Item Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
              placeholder="Technical specifications, dimensions, rating..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {formId ? 'Update Item Master' : 'Save & Register Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ITEM DETAIL & VISUAL BARCODE RENDERER */}
      {selectedItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Item Detail & Visual Barcode Label: ${selectedItem.sku}`}
        >
          <div className="space-y-6">
            {/* Visual Barcode Renderer Box */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 text-center uppercase tracking-widest font-mono">
                Scannable GS1 Barcode Label
              </div>
              <BarcodeRenderer value={selectedItem.barcode} height={80} />
            </div>

            {/* Detailed Attributes */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-base font-extrabold text-slate-900">{selectedItem.itemName}</div>
              {selectedItem.description && (
                <div className="text-xs text-slate-600 leading-relaxed">{selectedItem.description}</div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-200">
                <div>
                  <span className="text-slate-400 font-mono block">SKU Code:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">Barcode Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedItem.barcode}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">Category:</span>
                  <span className="font-bold text-slate-800">{selectedItem.categoryName || 'General Hardware'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">UOM Unit:</span>
                  <span className="font-mono font-bold text-emerald-800">{selectedItem.uomCode || 'PCS'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">Selling Price:</span>
                  <span className="font-bold text-slate-900">${Number(selectedItem.sellingPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-mono block">Cost Price:</span>
                  <span className="font-bold text-slate-700">${Number(selectedItem.costPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close Window
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CSV BULK IMPORT */}
      <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="CSV Bulk Import Item Masters">
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload a <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">.csv</span> file containing headers:
            <span className="font-mono text-indigo-600 block mt-1">
              itemName, sku, barcode, costPrice, sellingPrice, category, uom
            </span>
          </p>

          <FileUpload accept=".csv" onFileSelect={handleCsvSelect} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsCsvModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: ADD CATEGORY */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Register New Category">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Wireless Scanners"
          />
          <Select
            label="Parent Category (Optional for Subcategory)"
            value={catParentId}
            onChange={(e) => setCatParentId(e.target.value)}
            options={[
              { value: '', label: 'None (Top Level Category)' },
              ...categories.filter((c) => !c.parentId).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Category</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: ADD UOM */}
      <Modal isOpen={isUomModalOpen} onClose={() => setIsUomModalOpen(false)} title="Register New Unit of Measure (UOM)">
        <form onSubmit={handleCreateUOM} className="space-y-4">
          <Input
            label="UOM Code (e.g. PCS, BOX, PLT)"
            required
            value={uomCode}
            onChange={(e) => setUomCode(e.target.value)}
            placeholder="e.g. BAG"
          />
          <Input
            label="UOM Name"
            required
            value={uomName}
            onChange={(e) => setUomName(e.target.value)}
            placeholder="e.g. Bag of 20"
          />
          <Input
            label="Description (Optional)"
            value={uomDesc}
            onChange={(e) => setUomDesc(e.target.value)}
            placeholder="e.g. Sealed poly bag"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsUomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Register UOM</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
