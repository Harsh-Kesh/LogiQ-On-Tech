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
  AlertCircle,
  Clock,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
} from 'lucide-react';

interface StatusHistoryItem {
  from: string;
  to: string;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

interface ItemMaster {
  id: string;
  sku: string;
  barcode: string;
  itemName: string;
  description?: string;
  imageUrl?: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  marginPercent?: number;
  markupPercent?: number;
  moq?: number;
  status: 'ACTIVE' | 'DRAFT' | 'DISCONTINUED';
  vendorId?: string | null;
  vendorName?: string;
  categoryId?: string;
  categoryName?: string;
  uomId?: string;
  uomCode?: string;
  uomName?: string;
  attributes?: Record<string, string>;
  statusHistory?: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export default function MasterDataItemsPage() {
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasureItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [uomFilter, setUomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [attrFilterKey, setAttrFilterKey] = useState('');
  const [attrFilterVal, setAttrFilterVal] = useState('');

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
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT' | 'DISCONTINUED'>('ACTIVE');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [uomId, setUomId] = useState('');
  const [attrPairs, setAttrPairs] = useState<Array<{ key: string; value: string }>>([
    { key: 'IP Rating', value: 'IP65' },
  ]);
  const [governanceError, setGovernanceError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form State - New Category
  const [catName, setCatName] = useState('');
  const [catParentId, setCatParentId] = useState('');
  
  // Edit Category State
  const [isEditCatModalOpen, setIsEditCatModalOpen] = useState(false);
  const [editCatId, setEditCatId] = useState('');
  const [editCatName, setEditCatName] = useState('');

  // Form State - New UOM
  const [uomCode, setUomCode] = useState('');
  const [uomName, setUomName] = useState('');
  const [uomDesc, setUomDesc] = useState('');

  // Edit UOM State
  const [isEditUomModalOpen, setIsEditUomModalOpen] = useState(false);
  const [editUomId, setEditUomId] = useState('');
  const [editUomName, setEditUomName] = useState('');
  const [editUomDesc, setEditUomDesc] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes, uomRes, vndRes] = await Promise.all([
        fetch('/api/mdm/items'),
        fetch('/api/mdm/categories'),
        fetch('/api/mdm/uom'),
        fetch('/api/admin/vendors'),
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

  const openNewItemModal = () => {
    setFormId(null);
    setItemName('');
    setSku('');
    setBarcode('');
    setCostPrice('');
    setSellingPrice('');
    setWholesalePrice('');
    setMoq('1');
    setStatus('ACTIVE');
    setDescription('');
    setImageUrl('');
    setCategoryId('');
    setUomId('');
    setAttrPairs([{ key: 'IP Rating', value: 'IP65' }]);
    setGovernanceError('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: ItemMaster) => {
    setFormId(item.id);
    setItemName(item.itemName);
    setSku(item.sku);
    setBarcode(item.barcode);
    setCostPrice(item.costPrice.toString());
    setSellingPrice(item.sellingPrice.toString());
    setWholesalePrice((item.wholesalePrice !== null && item.wholesalePrice !== undefined) ? item.wholesalePrice.toString() : item.sellingPrice.toString());
    setMoq(item.moq ? item.moq.toString() : '1');
    setStatus(item.status);
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setCategoryId(item.categoryId || '');
    setUomId(item.uomId || '');

    if (item.attributes && typeof item.attributes === 'object' && Object.keys(item.attributes).length > 0) {
      setAttrPairs(Object.entries(item.attributes).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      setAttrPairs([{ key: 'IP Rating', value: 'IP65' }]);
    }

    setGovernanceError('');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setGovernanceError('');
    setSubmitting(true);

    const attributesObj: Record<string, string> = {};
    attrPairs.forEach((pair) => {
      if (pair.key.trim() && pair.value.trim()) {
        attributesObj[pair.key.trim()] = pair.value.trim();
      }
    });

    const payload = {
      id: formId,
      itemName,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      wholesalePrice: wholesalePrice || sellingPrice,
      moq: moq || '1',
      status,
      description,
      imageUrl,
      categoryId,
      uomId,
      attributes: attributesObj,
    };

    try {
      const res = await fetch('/api/mdm/items', {
        method: formId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setGovernanceError(data.error || 'Data Governance Violation.');
        return;
      }

      setToast({
        message: formId ? 'Item Master record updated successfully.' : 'New Item Master registered successfully.',
        type: 'success',
      });
      setIsItemModalOpen(false);
      fetchInitialData();
    } catch (e) {
      setGovernanceError('Data Governance error submitting request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Item Master record?')) return;
    try {
      const res = await fetch(`/api/mdm/items?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setToast({ message: 'Item Master record deleted.', type: 'info' });
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to delete Item Master.', type: 'error' });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mdm/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName, parentId: catParentId || null }),
      });
      if (!res.ok) throw new Error();
      setToast({ message: 'New Category created successfully.', type: 'success' });
      setIsCatModalOpen(false);
      setCatName('');
      setCatParentId('');
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to create Category.', type: 'error' });
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mdm/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editCatId, name: editCatName }),
      });
      if (!res.ok) throw new Error();
      setToast({ message: 'Category updated successfully.', type: 'success' });
      setIsEditCatModalOpen(false);
      setEditCatId('');
      setEditCatName('');
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to update Category.', type: 'error' });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Category?')) return;
    try {
      const res = await fetch(`/api/mdm/categories?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setToast({ message: 'Category deleted.', type: 'info' });
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to delete Category.', type: 'error' });
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
      if (!res.ok) throw new Error();
      setToast({ message: 'Unit of Measure registered successfully.', type: 'success' });
      setIsUomModalOpen(false);
      setUomCode('');
      setUomName('');
      setUomDesc('');
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to register UOM.', type: 'error' });
    }
  };

  const handleEditUOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/mdm/uom', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editUomId, name: editUomName, description: editUomDesc }),
      });
      if (!res.ok) throw new Error();
      setToast({ message: 'UOM updated successfully.', type: 'success' });
      setIsEditUomModalOpen(false);
      setEditUomId('');
      setEditUomName('');
      setEditUomDesc('');
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to update UOM.', type: 'error' });
    }
  };

  const handleDeleteUOM = async (id: string) => {
    if (!confirm('Are you sure you want to delete this UOM?')) return;
    try {
      const res = await fetch(`/api/mdm/uom?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setToast({ message: 'UOM deleted.', type: 'info' });
      fetchInitialData();
    } catch (e) {
      setToast({ message: 'Failed to delete UOM. System UOMs cannot be deleted.', type: 'error' });
    }
  };

  const handleCsvSelect = async (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/mdm/items/bulk-import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast({ message: `Bulk CSV Import complete! Processed ${data.count} items.`, type: 'success' });
      setIsCsvModalOpen(false);
      fetchInitialData();
    } catch (e: any) {
      setToast({ message: e.message || 'CSV Import failed.', type: 'error' });
    }
  };

  // Multi-Attribute & Flexible Spec Filtering Logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === '' ||
      item.categoryId === categoryFilter ||
      (item.categoryName && item.categoryName.toLowerCase() === categoryFilter.toLowerCase());

    const matchesUom =
      uomFilter === '' || item.uomId === uomFilter || (item.uomCode && item.uomCode.toUpperCase() === uomFilter.toUpperCase());

    const matchesStatus = statusFilter === '' || item.status === statusFilter;

    const minP = parseFloat(minPrice);
    const matchesMinPrice = isNaN(minP) || item.sellingPrice >= minP;

    const maxP = parseFloat(maxPrice);
    const matchesMaxPrice = isNaN(maxP) || item.sellingPrice <= maxP;

    let matchesAttr = true;
    if (attrFilterKey || attrFilterVal) {
      if (!item.attributes) {
        matchesAttr = false;
      } else if (attrFilterKey && attrFilterVal) {
        const val = item.attributes[attrFilterKey];
        matchesAttr = Boolean(val && val.toLowerCase().includes(attrFilterVal.toLowerCase().trim()));
      } else if (attrFilterKey && !attrFilterVal) {
        matchesAttr = Boolean(item.attributes[attrFilterKey]);
      } else if (!attrFilterKey && attrFilterVal) {
        const query = attrFilterVal.toLowerCase().trim();
        matchesAttr = Object.values(item.attributes).some((v) => v.toLowerCase().includes(query));
      }
    }

    return matchesSearch && matchesCategory && matchesUom && matchesStatus && matchesMinPrice && matchesMaxPrice && matchesAttr;
  });

  // Extract unique attribute keys present across all items for dropdown selector
  const allAttrKeys = Array.from(
    new Set(
      items.flatMap((item) => (item.attributes ? Object.keys(item.attributes) : []))
    )
  );

  // Clean, High-Readability Table Columns Setup
  const itemColumns: Column<ItemMaster>[] = [
    {
      header: 'Item Master Name & Ownership',
      accessorKey: 'itemName',
      cell: (item) => (
        <div className="space-y-1.5 py-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">{item.itemName}</span>
            {item.vendorId ? (
              <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                🏢 Vendor Partner
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-lg text-xs shrink-0">
                🛡️ LogiQ-On Internal
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-indigo-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              {item.sku}
            </span>
            <span className="font-mono text-[11px] text-slate-500">EAN: {item.barcode}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Category Taxonomy',
      accessorKey: 'categoryName',
      cell: (item) => (
        <span className="inline-block max-w-[180px] truncate align-middle whitespace-nowrap text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
          {item.categoryName || 'General Hardware'}
        </span>
      ),
    },
    {
      header: 'UOM',
      accessorKey: 'uomCode',
      cell: (item) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-1 rounded">
          {item.uomCode || 'PCS'}
        </span>
      ),
    },
    {
      header: 'Pricing & Margin',
      accessorKey: 'sellingPrice',
      cell: (item) => {
        const margin = item.sellingPrice > 0 ? (((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100).toFixed(1) : '0';
        return (
          <div className="space-y-0.5 text-xs font-mono">
            <div className="font-bold text-slate-900">${Number(item.sellingPrice).toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">Cost: ${Number(item.costPrice).toFixed(2)}</div>
            <div className="text-[10px] font-bold text-indigo-700">Margin: {margin}%</div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item) => (
        <Badge
          variant={
            item.status === 'ACTIVE'
              ? 'success'
              : item.status === 'DRAFT'
              ? 'warning'
              : 'neutral'
          }
        >
          {item.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedItem(item);
              setIsDetailModalOpen(true);
            }}
            leftIcon={<Eye className="w-3.5 h-3.5" />}
          >
            Barcode & Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEditItemModal(item)}
            leftIcon={<Edit2 className="w-3.5 h-3.5 text-indigo-600" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteItem(item.id)}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 md:p-10 space-y-8 font-sans max-w-[1600px] mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Light Header Banner (Matching Vendor & User Directory UI Style) */}
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold font-mono">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              MASTER DATA MANAGEMENT (MDM) HUB
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Item Master &amp; Product Governance Catalog
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Centralized SKU/Barcode Registry • Multi-Tier Pricing • Dynamic Technical Attributes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" onClick={() => setIsCsvModalOpen(true)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold" leftIcon={<Upload className="w-4 h-4 shrink-0 text-indigo-600" />}>
            Bulk CSV Import
          </Button>
          <Button onClick={openNewItemModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30" leftIcon={<Plus className="w-4 h-4 shrink-0 text-white" />}>
            Create Item Master
          </Button>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ITEMS')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'ITEMS'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          Item Master Catalog ({items.length})
        </button>

        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'CATEGORIES'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Category Taxonomy Tree ({categories.length})
        </button>

        <button
          onClick={() => setActiveTab('UOM')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'UOM'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Ruler className="w-4 h-4" />
          Unit of Measure (UOM) ({uoms.length})
        </button>
      </div>

      {/* TAB 1: ITEM MASTER CATALOG */}
      {activeTab === 'ITEMS' && (
        <div className="space-y-6">
          {/* USER-FRIENDLY INTUITIVE FILTER CARD */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 font-sans">
            {/* ROW 1: SEARCH BAR + CATEGORY + UOM + LIFECYCLE STATUS DROPDOWNS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search Name, SKU, Barcode..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                />
              </div>

              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />

              <Select
                value={uomFilter}
                onChange={(e) => setUomFilter(e.target.value)}
                options={[
                  { value: '', label: 'All UOMs' },
                  ...uoms.map((u) => ({ value: u.code, label: `${u.code} - ${u.name}` })),
                ]}
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Lifecycle Statuses' },
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'DRAFT', label: 'DRAFT' },
                  { value: 'DISCONTINUED', label: 'DISCONTINUED' },
                ]}
              />
            </div>

            {/* ROW 2: PRICE RANGE + TECHNICAL SPECIFICATION FILTER */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Price Range Filter */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" /> Price Range ($):
                  </span>
                  <input
                    type="number"
                    placeholder="Min $"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="hidden sm:block h-4 w-px bg-slate-200 mx-1" />

                {/* Technical Specification Filter */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Spec Filter:
                  </span>
                  <select
                    value={attrFilterKey}
                    onChange={(e) => setAttrFilterKey(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600 font-semibold"
                  >
                    <option value="">Select Spec Key</option>
                    {allAttrKeys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Spec Value (e.g. IP65)"
                    value={attrFilterVal}
                    onChange={(e) => setAttrFilterVal(e.target.value)}
                    className="w-36 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {(search || categoryFilter || uomFilter || statusFilter || minPrice || maxPrice || attrFilterKey || attrFilterVal) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('');
                    setUomFilter('');
                    setStatusFilter('');
                    setMinPrice('');
                    setMaxPrice('');
                    setAttrFilterKey('');
                    setAttrFilterVal('');
                  }}
                  className="text-xs text-rose-600 font-bold hover:underline ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 font-sans">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500">
                Showing {filteredItems.length} of {items.length} Master Item Records
              </span>
              <Button size="sm" variant="ghost" onClick={fetchInitialData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh Catalog
              </Button>
            </div>

            <DataTable
              data={filteredItems}
              columns={itemColumns}
              isLoading={loading}
              showSearch={false}
              emptyMessage="No Item Master records match your search filter criteria."
            />
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORY TAXONOMY TREE */}
      {activeTab === 'CATEGORIES' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Parent-Child Category Taxonomy Tree</h2>
              <p className="text-xs text-slate-500 font-mono">Hierarchical Category Management for MDM Catalog</p>
            </div>
            <Button onClick={() => setIsCatModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30" leftIcon={<Plus className="w-4 h-4 shrink-0 text-white" />}>
              Add New Category
            </Button>
          </div>

          <CategoryTree categories={categories} />

          {/* Category Management List */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Category Management</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditCatId(c.id);
                        setEditCatName(c.name);
                        setIsEditCatModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
            <Button onClick={() => setIsUomModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30" leftIcon={<Plus className="w-4 h-4 shrink-0 text-white" />}>
              Register New UOM
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uoms.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-extrabold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded border border-indigo-200">
                    {u.code}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto"
                      onClick={() => {
                        setEditUomId(u.id);
                        setEditUomName(u.name);
                        setEditUomDesc(u.description || '');
                        setIsEditUomModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1 h-auto"
                      onClick={() => handleDeleteUOM(u.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900">{u.name}</div>
                {u.description && <div className="text-xs text-slate-500">{u.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT ITEM MASTER (SPACIOUS & STRUCTURED IN 5 CARDS) */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={formId ? 'Edit Item Master Record' : 'Create New Item Master Record'}
        subtitle="Enforces Data Governance Rules, Price Sanity & Unique SKU/Barcode Locks"
        maxWidth="4xl"
      >
        <div className="space-y-6 text-xs font-sans max-w-4xl">
          {governanceError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{governanceError}</span>
            </div>
          )}

          <form onSubmit={handleSaveItem} className="space-y-6">
            {/* SECTION 1: ITEM IDENTIFICATION & NAME */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>1. Basic Identification & Codes</span>
              </div>

              <Input
                label="Item Master Name"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Industrial Barcode Scanner 2D"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="SKU Code (Leave blank to auto-generate)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. LQ-SCN-00101"
                  helperText="Must be unique across entire system"
                />
                <Input
                  label="Barcode EAN-13 (Leave blank to auto-generate)"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 9312345678901"
                  helperText="GS1 compliant 13-digit barcode"
                />
              </div>

              {/* Product Image URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider">Product Image URL (Optional)</label>
                <Input
                  placeholder="https://example.com/product-image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {imageUrl && (
                  <div className="mt-2 w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: SYSTEM TAXONOMY & UOM */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-indigo-600" />
                <span>2. System Taxonomy & Unit of Measure</span>
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
            </div>

            {/* SECTION 3: PRICING ENGINE & MARGIN METRICS */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                <span>3. Pricing Engine & Margin Calculations</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Retail Selling Price ($ AUD)"
                  type="number"
                  step="0.01"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="249.99"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Wholesale Tier Price ($)"
                  type="number"
                  step="0.01"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  placeholder="185.00"
                  helperText="Must be <= Retail Selling Price"
                />
                <Input
                  label="Minimum Order Qty (MOQ)"
                  type="number"
                  min="1"
                  value={moq}
                  onChange={(e) => setMoq(e.target.value)}
                  placeholder="1"
                  helperText="Default: 1 unit"
                />
                <Select
                  label="Item Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  options={[
                    { value: 'ACTIVE', label: 'ACTIVE' },
                    { value: 'DRAFT', label: 'DRAFT' },
                    { value: 'DISCONTINUED', label: 'DISCONTINUED' },
                  ]}
                />
              </div>

              {/* Live Margin & Markup Calculation Bar */}
              {parseFloat(sellingPrice || '0') > 0 && parseFloat(costPrice || '0') > 0 && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600 font-bold">Auto Margin & Markup Metrics:</span>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-violet-100 text-violet-800 font-bold">
                      Margin: {(((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice)) * 100).toFixed(1)}%
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 font-bold">
                      Markup: {(((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: TECHNICAL SPECIFICATIONS & DYNAMIC ATTRIBUTES */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <span>4. Technical Specifications & Dynamic Key-Value Attributes</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttrPairs([...attrPairs, { key: '', value: '' }])}
                  className="text-xs text-indigo-600 font-bold hover:underline"
                >
                  + Add Spec Pair
                </button>
              </div>

              {attrPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Spec Name (e.g. IP Rating)"
                    value={pair.key}
                    onChange={(e) => {
                      const updated = [...attrPairs];
                      updated[idx].key = e.target.value;
                      setAttrPairs(updated);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  <input
                    type="text"
                    placeholder="Spec Value (e.g. IP65)"
                    value={pair.value}
                    onChange={(e) => {
                      const updated = [...attrPairs];
                      updated[idx].value = e.target.value;
                      setAttrPairs(updated);
                    }}
                    className="w-1/2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
                  />
                  {attrPairs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setAttrPairs(attrPairs.filter((_, i) => i !== idx))}
                      className="p-2 text-rose-500 hover:text-rose-700 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* SECTION 5: DESCRIPTION */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                5. Product Description & Packaging Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                placeholder="Enter technical details, dimensions, weight, operating conditions..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30">
                {formId ? 'Update Item Master' : 'Save & Register Item'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* MODAL 2: ITEM DETAIL, SPECIFICATIONS & STATUS HISTORY */}
      {selectedItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Item Master Detail & GS1 Barcode: ${selectedItem.sku}`}
          maxWidth="3xl"
        >
          <div className="space-y-6 text-xs font-sans">
            {/* Visual Barcode Renderer Box */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 text-center uppercase tracking-widest font-mono">
                Scannable GS1 Barcode Label
              </div>
              <BarcodeRenderer value={selectedItem.barcode} height={80} />
            </div>

            {/* Item Attributes & Pricing Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              {selectedItem.imageUrl && (
                <div className="w-full h-48 rounded-xl overflow-hidden mb-4 border border-slate-200 bg-white flex items-center justify-center">
                  <img src={selectedItem.imageUrl} alt={selectedItem.itemName} className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="text-base font-extrabold text-slate-900">{selectedItem.itemName}</div>
                <Badge variant={selectedItem.status === 'ACTIVE' ? 'success' : selectedItem.status === 'DRAFT' ? 'warning' : 'neutral'}>
                  {selectedItem.status}
                </Badge>
              </div>

              {selectedItem.description && <div className="text-xs text-slate-600 leading-relaxed">{selectedItem.description}</div>}

              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-slate-200 pt-3">
                <div>
                  <span className="text-slate-400 block">SKU Code:</span>
                  <span className="font-bold text-indigo-700">{selectedItem.sku}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Barcode EAN:</span>
                  <span className="font-bold text-slate-900">{selectedItem.barcode}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Retail Selling Price:</span>
                  <span className="font-bold text-slate-900">${Number(selectedItem.sellingPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Wholesale Tier Price:</span>
                  <span className="font-bold text-indigo-700">${Number(selectedItem.wholesalePrice || selectedItem.sellingPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Cost Price:</span>
                  <span className="font-bold text-slate-700">${Number(selectedItem.costPrice).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-sans font-medium">Product Ownership:</span>
                  {selectedItem.vendorId ? (
                    <span className="font-bold text-indigo-700 inline-flex items-center gap-1">
                      🏢 {selectedItem.vendorName || 'Vendor Partner'}
                    </span>
                  ) : (
                    <span className="font-bold text-purple-700 inline-flex items-center gap-1">
                      🛡️ LogiQ-On Internal Stock
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block font-sans">Minimum Order Qty:</span>
                  <span className="font-bold text-slate-900">{selectedItem.moq || 1} units</span>
                </div>
              </div>

              {/* Technical Specifications Badges */}
              {selectedItem.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    Technical Specifications:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedItem.attributes).map(([k, v]) => (
                      <span key={k} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold text-xs">
                        <span className="font-bold text-indigo-900">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lifecycle Status History Timeline */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Lifecycle Status Change Audit History</span>
              </div>

              {selectedItem.statusHistory && selectedItem.statusHistory.length > 0 ? (
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                  {selectedItem.statusHistory.map((sh, idx) => (
                    <div key={idx} className="relative space-y-0.5">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {sh.from} ➔ {sh.to}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(sh.changedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono">
                        Changed by <span className="font-bold">{sh.changedBy}</span> {sh.reason ? `• "${sh.reason}"` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No lifecycle status transitions recorded yet.</div>
              )}
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
        <form onSubmit={handleCreateCategory} className="space-y-4 font-sans text-xs">
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30">Create Category</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4.5: EDIT CATEGORY */}
      <Modal isOpen={isEditCatModalOpen} onClose={() => setIsEditCatModalOpen(false)} title="Edit Category">
        <form onSubmit={handleEditCategory} className="space-y-4 font-sans text-xs">
          <Input
            label="Category Name"
            required
            value={editCatName}
            onChange={(e) => setEditCatName(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditCatModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30">Update Category</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: ADD UOM */}
      <Modal isOpen={isUomModalOpen} onClose={() => setIsUomModalOpen(false)} title="Register New Unit of Measure (UOM)">
        <form onSubmit={handleCreateUOM} className="space-y-4 font-sans text-xs">
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
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30">Register UOM</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 6: EDIT UOM */}
      <Modal isOpen={isEditUomModalOpen} onClose={() => setIsEditUomModalOpen(false)} title="Edit Unit of Measure (UOM)">
        <form onSubmit={handleEditUOM} className="space-y-4 font-sans text-xs">
          <Input
            label="UOM Name"
            required
            value={editUomName}
            onChange={(e) => setEditUomName(e.target.value)}
          />
          <Input
            label="Description (Optional)"
            value={editUomDesc}
            onChange={(e) => setEditUomDesc(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditUomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 border border-indigo-500/30">Update UOM</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
