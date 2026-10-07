import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreVertical,
  X,
  Check,
  Ban,
  Download,
  Search,
  Settings,
  Image as ImageIcon,
  Info,
  MinusCircle,
  Boxes,
  Layers,
  IndianRupee,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Layers3,
  SlidersHorizontal,
  Filter,
  Play,
  RotateCcw,
  Save,
  ArrowLeft,
  Printer,
  Forward,
  FileSpreadsheet,
} from 'lucide-react';
import { SearchBar } from '../../../components/common/SearchBar';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { Button } from '../../../components/common/Button';
import { Pagination } from '../../../components/common/Pagination';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

export interface ProductItem {
  id: string;
  sNo: number;
  itemType: 'Product' | 'Service';
  productCode: string;
  productName: string;
  hsnCode: string;
  unit: string;
  category: string;
  subcategory?: string;
  itemImage?: string;
  
  // Pricing
  salePrice: number;
  salePriceTaxType: 'Excluded' | 'Included';
  discountValue: number;
  discountType: 'Percentage' | 'Amount';
  
  // Wholesale
  hasWholesale: boolean;
  wholesalePrice: number;
  wholesaleTaxType: 'Excluded' | 'Included';
  minWholesaleQty: number;
  
  // Purchase & Tax
  purchasePrice: number;
  purchasePriceTaxType: 'Excluded' | 'Included';
  taxRate: string;
  
  // Stock
  openingStock: number;
  atPrice: number;
  asOfDate: string;
  minStockAlert: number;
  location?: string;
  
  status: 'Active' | 'Inactive';
}

const INITIAL_CATEGORIES = [
  'Grains & Flours',
  'Pulses & Dals',
  'Edible Oils & Ghee',
  'Spices, Salt & Sugar',
  'Beverages & Tea',
  'Packaged Food & Snacks',
  'Dairy & Bakery',
  'Cleaning & Household',
  'Personal Care',
];

const TAX_RATE_OPTIONS = [
  { label: 'None', value: 'None' },
  { label: 'GST @ 0%', value: 'GST @ 0%' },
  { label: 'GST @ 0.25%', value: 'GST @ 0.25%' },
  { label: 'GST @ 3%', value: 'GST @ 3%' },
  { label: 'GST @ 5%', value: 'GST @ 5%' },
  { label: 'GST @ 12%', value: 'GST @ 12%' },
  { label: 'GST @ 18%', value: 'GST @ 18%' },
  { label: 'GST @ 28%', value: 'GST @ 28%' },
  { label: 'Exempted', value: 'Exempted' },
];

const POPULAR_UNITS = [
  { code: 'KGS', name: 'Kilograms' },
  { code: 'GMS', name: 'Grams' },
  { code: 'LTR', name: 'Litres' },
  { code: 'MLT', name: 'Millilitres' },
  { code: 'PAC', name: 'Packs' },
  { code: 'BAG', name: 'Bags' },
  { code: 'BTL', name: 'Bottles' },
  { code: 'CAN', name: 'Cans' },
  { code: 'PCS', name: 'Pieces' },
  { code: 'BOX', name: 'Box' },
  { code: 'NOS', name: 'Numbers' },
  { code: 'DOZ', name: 'Dozens' },
  { code: 'UNT', name: 'Units' },
  { code: 'SET', name: 'Sets' },
  { code: 'TON', name: 'Tonnes' },
];

export const STANDARD_UNITS_LIST = [
  'None',
  'BAGS (Bag)',
  'BOTTLES (Btl)',
  'BOX (Box)',
  'BUNDLES (Bdl)',
  'CANS (Can)',
  'CARTONS (Ctn)',
  'CUBIC METER (Mtq)',
  'DAY (Day)',
  'DOZENS (Dzn)',
  'GRAMMES (Gm)',
  'HOUR (Hur)',
  'KILOGRAMS (Kg)',
  'KILOMETER (Kmt)',
  'LITRE (Ltr)',
  'METERS (Mtr)',
  'MILILITRE (Ml)',
  'NUMBERS (Nos)',
  'PACKS (Pac)',
  'PAIRS (Prs)',
  'PIECES (Pcs)',
  'QUINTAL (Qtl)',
  'ROLLS (Rol)',
  'SETS (Set)',
  'SQ. FEET (Sqf)',
  'SQ. METERS (Sqm)',
  'TABLETS (Tbs)',
  'TONNES (Ton)',
  'TUBES (Tub)',
  'UNITS (Unt)',
];

const COMMON_HSN_CODES = [
  { code: '1006', desc: 'Rice & Basmati Grain' },
  { code: '1101', desc: 'Wheat Flour & Atta / Maida' },
  { code: '0713', desc: 'Dried Legumes, Toor Dal, Moong Dal' },
  { code: '1512', desc: 'Sunflower & Edible Refined Oils' },
  { code: '0405', desc: 'Butter, Pure Cow Ghee & Dairy Spreads' },
  { code: '0902', desc: 'Tea, Black Tea & Green Tea' },
  { code: '0901', desc: 'Coffee, Roasted Coffee Beans' },
  { code: '1902', desc: 'Instant Noodles, Pasta & Macaroni' },
  { code: '1701', desc: 'Cane Sugar & Refined White Sugar' },
  { code: '2501', desc: 'Iodized Cooking Salt & Rock Salt' },
  { code: '3402', desc: 'Washing Powder, Liquid Detergent & Soaps' },
];

// =========================================================================
// CUSTOM CATEGORY SELECT COMPONENT
// =========================================================================
interface CategorySelectProps {
  value: string;
  onChange: (val: string) => void;
  categories: string[];
  onAddCategory: (newCategory: string) => void;
}

const CategorySelectField: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  categories,
  onAddCategory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const filteredCategories = categories.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleAddNewCategorySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      onChange(trimmed);
      setNewCatName('');
      setIsAddingNew(false);
      setIsOpen(false);
      toast.info(`Category "${trimmed}" selected.`);
      return;
    }
    onAddCategory(trimmed);
    onChange(trimmed);
    setNewCatName('');
    setIsAddingNew(false);
    setIsOpen(false);
    toast.success(`Category "${trimmed}" created and selected!`);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Floating Notch Select Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full h-11 px-3.5 bg-white rounded-xl border flex items-center justify-between cursor-pointer transition-all shadow-2xs ${
          isOpen
            ? 'border-[#33077C] ring-2 ring-[#33077C]/15'
            : value
            ? 'border-[#33077C]/60 hover:border-[#33077C]'
            : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {/* Floating notch label */}
        <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight">
          Category
        </span>

        {/* Selected value or placeholder */}
        <span className={`text-xs sm:text-sm font-medium truncate ${value ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
          {value || 'Select Category'}
        </span>

        {/* Arrow (Triangle Up / Down) */}
        <span className="text-[10px] text-slate-500 font-black ml-2 transition-transform select-none">
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[260px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* 1. Search Pill Input */}
          <div className="relative mb-2">
            <div className="flex items-center w-full h-9 px-3 bg-white border border-slate-200 rounded-full focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/10 transition-all shadow-2xs">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Add New Category Action */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full px-3 py-2 text-left text-xs font-bold text-[#33077C] hover:bg-[#33077C]/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer mb-1"
            >
              <Plus className="w-4 h-4 text-[#33077C] stroke-[2.5]" />
              <span>Add New Category</span>
            </button>
          ) : (
            <div className="p-2 mb-2 bg-purple-50/50 rounded-xl border border-[#33077C]/20 space-y-2">
              <input
                type="text"
                autoFocus
                placeholder="Enter new category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNewCategorySubmit();
                  if (e.key === 'Escape') setIsAddingNew(false);
                }}
                className="w-full h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:border-[#33077C]"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleAddNewCategorySubmit()}
                  className="px-3 py-1 text-[11px] font-bold text-white bg-[#33077C] hover:bg-[#4309A2] rounded-md shadow-2xs"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* 3. Category Checkbox List */}
          <div className="max-h-48 overflow-y-auto space-y-1 p-0.5">
            {filteredCategories.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 font-medium">
                No categories found
              </div>
            ) : (
              filteredCategories.map((cat) => {
                const isSelected = value === cat;
                return (
                  <div
                    key={cat}
                    onClick={() => {
                      onChange(isSelected ? '' : cat);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#33077C]/10 text-[#33077C] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {/* Checkbox Box */}
                    <div
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'border-[#33077C] bg-[#33077C] text-white'
                          : 'border-slate-400 bg-white hover:border-[#33077C]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <span className="truncate">{cat}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const InventoryProductsView: React.FC = () => {
  // Categories List State
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);

  // Initial Sample Records
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 'prod-1',
      sNo: 1,
      itemType: 'Product',
      productCode: 'PRD-1001',
      productName: 'Aashirvaad Superior MP Sharbati Atta (10 Kg)',
      hsnCode: '1101',
      unit: 'BAG',
      category: 'Grains & Flours',
      subcategory: 'Flours',
      salePrice: 495,
      salePriceTaxType: 'Included',
      discountValue: 15,
      discountType: 'Amount',
      hasWholesale: true,
      wholesalePrice: 450,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 10,
      purchasePrice: 420,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 5%',
      openingStock: 85,
      atPrice: 420,
      asOfDate: '2026-09-25',
      minStockAlert: 15,
      location: 'Aisle 1 - Grains',
      status: 'Active',
    },
    {
      id: 'prod-2',
      sNo: 2,
      itemType: 'Product',
      productCode: 'PRD-1002',
      productName: 'India Gate Super Premium Basmati Rice (5 Kg)',
      hsnCode: '1006',
      unit: 'BAG',
      category: 'Grains & Flours',
      subcategory: 'Rice',
      salePrice: 699,
      salePriceTaxType: 'Included',
      discountValue: 5,
      discountType: 'Percentage',
      hasWholesale: true,
      wholesalePrice: 620,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 5,
      purchasePrice: 580,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 5%',
      openingStock: 120,
      atPrice: 580,
      asOfDate: '2026-09-26',
      minStockAlert: 20,
      location: 'Aisle 1 - Grains',
      status: 'Active',
    },
    {
      id: 'prod-3',
      sNo: 3,
      itemType: 'Product',
      productCode: 'PRD-1003',
      productName: 'Fortune Sunlite Refined Sunflower Oil (1 Ltr Pouch)',
      hsnCode: '1512',
      unit: 'PAC',
      category: 'Edible Oils & Ghee',
      subcategory: 'Cooking Oils',
      salePrice: 165,
      salePriceTaxType: 'Included',
      discountValue: 0,
      discountType: 'Percentage',
      hasWholesale: true,
      wholesalePrice: 145,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 15,
      purchasePrice: 138,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 5%',
      openingStock: 240,
      atPrice: 138,
      asOfDate: '2026-09-27',
      minStockAlert: 40,
      location: 'Aisle 2 - Oils',
      status: 'Active',
    },
    {
      id: 'prod-4',
      sNo: 4,
      itemType: 'Product',
      productCode: 'PRD-1004',
      productName: 'Tata Salt Vacuum Evaporated Iodized (1 Kg)',
      hsnCode: '2501',
      unit: 'PAC',
      category: 'Spices, Salt & Sugar',
      subcategory: 'Salt',
      salePrice: 28,
      salePriceTaxType: 'Included',
      discountValue: 0,
      discountType: 'Percentage',
      hasWholesale: true,
      wholesalePrice: 24,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 25,
      purchasePrice: 22,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 0%',
      openingStock: 350,
      atPrice: 22,
      asOfDate: '2026-09-28',
      minStockAlert: 50,
      location: 'Aisle 3 - Spices',
      status: 'Active',
    },
    {
      id: 'prod-5',
      sNo: 5,
      itemType: 'Product',
      productCode: 'PRD-1005',
      productName: 'Brooke Bond Red Label Strong Tea (500g)',
      hsnCode: '0902',
      unit: 'PAC',
      category: 'Beverages & Tea',
      subcategory: 'Tea',
      salePrice: 275,
      salePriceTaxType: 'Included',
      discountValue: 10,
      discountType: 'Amount',
      hasWholesale: true,
      wholesalePrice: 245,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 10,
      purchasePrice: 230,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 5%',
      openingStock: 75,
      atPrice: 230,
      asOfDate: '2026-09-28',
      minStockAlert: 15,
      location: 'Aisle 4 - Beverages',
      status: 'Active',
    },
    {
      id: 'prod-6',
      sNo: 6,
      itemType: 'Product',
      productCode: 'PRD-1006',
      productName: 'Surf Excel Easy Wash Detergent Powder (1 Kg)',
      hsnCode: '3402',
      unit: 'PAC',
      category: 'Cleaning & Household',
      subcategory: 'Detergents',
      salePrice: 148,
      salePriceTaxType: 'Included',
      discountValue: 0,
      discountType: 'Percentage',
      hasWholesale: true,
      wholesalePrice: 135,
      wholesaleTaxType: 'Included',
      minWholesaleQty: 12,
      purchasePrice: 125,
      purchasePriceTaxType: 'Excluded',
      taxRate: 'GST @ 18%',
      openingStock: 65,
      atPrice: 125,
      asOfDate: '2026-09-28',
      minStockAlert: 10,
      location: 'Aisle 5 - Cleaning',
      status: 'Active',
    },
  ]);

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Split Button Dropdown Menu State
  const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Quick Unit Modal
  const [isBulkUnitModalOpen, setIsBulkUnitModalOpen] = useState(false);
  const [selectedBulkUnit, setSelectedBulkUnit] = useState('PCS');

  // =========================================================================
  // FULL "BULK UPDATE ITEMS" SCREEN/MODAL STATE (MATCHING SCREENSHOT)
  // =========================================================================
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<'Pricing' | 'Stock' | 'Item Information'>('Pricing');
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkItems, setBulkItems] = useState<ProductItem[]>([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [batchTaxSlab, setBatchTaxSlab] = useState('GST @ 18%');
  const [batchTaxDropdownOpen, setBatchTaxDropdownOpen] = useState(false);

  // Search & Filter State
  const [pendingSearch, setPendingSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [pendingCategory, setPendingCategory] = useState('ALL');
  const [appliedCategory, setAppliedCategory] = useState('ALL');
  const [pendingType, setPendingType] = useState('ALL');
  const [appliedType, setAppliedType] = useState('ALL');
  const [pendingStatus, setPendingStatus] = useState('ALL');
  const [appliedStatus, setAppliedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 3-Dots Action Dropdown State & Share Popover
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [sharePos, setSharePos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [activeTab, setActiveTab] = useState<'Pricing' | 'Stock'>('Pricing');

  // Secondary sub-modals for Unit & HSN search
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('PIECES (Pcs)');
  const [selectedSecondaryUnit, setSelectedSecondaryUnit] = useState('None');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [customUnitCode, setCustomUnitCode] = useState('');
  const [isHsnModalOpen, setIsHsnModalOpen] = useState(false);
  const [hsnSearchQuery, setHsnSearchQuery] = useState('');

  // Custom units list with localStorage persistence
  const [customUnits, setCustomUnits] = useState<Array<{ name: string; shortName: string }>>(() => {
    try {
      const saved = localStorage.getItem('yaa_crm_units');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // State for creating a new custom unit inside the Unit dialog
  const [newUnitFullName, setNewUnitFullName] = useState('');
  const [newUnitShortName, setNewUnitShortName] = useState('');
  const [showAddUnitForm, setShowAddUnitForm] = useState(true);

  // Combined Units list (Standard + Custom)
  const allUnitsList = useMemo(() => {
    const list = [...STANDARD_UNITS_LIST];
    customUnits.forEach((u) => {
      const formatted = `${u.name.toUpperCase()} (${u.shortName})`;
      if (!list.includes(formatted)) {
        list.push(formatted);
      }
    });
    return list;
  }, [customUnits]);

  // Handler to add a new custom unit
  const handleAddNewCustomUnit = () => {
    const fullName = newUnitFullName.trim();
    const shortName = newUnitShortName.trim();
    if (!fullName) {
      toast.error('Please enter a unit name (e.g. Dozen, Pack, Drum)');
      return;
    }
    const short = shortName ? shortName : fullName.slice(0, 3).toUpperCase();
    const formatted = `${fullName.toUpperCase()} (${short})`;

    const exists = allUnitsList.some(
      (u) =>
        u.toLowerCase() === formatted.toLowerCase() ||
        u.toLowerCase() === fullName.toLowerCase() ||
        (u.includes('(') && u.match(/\((.*?)\)/)?.[1]?.toLowerCase() === short.toLowerCase())
    );

    if (exists) {
      const matched = allUnitsList.find(
        (u) =>
          u.toLowerCase() === formatted.toLowerCase() ||
          u.toLowerCase() === fullName.toLowerCase() ||
          (u.includes('(') && u.match(/\((.*?)\)/)?.[1]?.toLowerCase() === short.toLowerCase())
      );
      if (matched) setSelectedBaseUnit(matched);
      toast.info(`Unit "${formatted}" already exists and has been selected!`);
      setNewUnitFullName('');
      setNewUnitShortName('');
      return;
    }

    const updated = [...customUnits, { name: fullName, shortName: short }];
    setCustomUnits(updated);
    try {
      localStorage.setItem('yaa_crm_units', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save custom unit', e);
    }

    setSelectedBaseUnit(formatted);
    setNewUnitFullName('');
    setNewUnitShortName('');
    toast.success(`Unit "${formatted}" added and selected!`);
  };

  // Handler to delete custom unit
  const handleDeleteCustomUnit = (unitToRemove: { name: string; shortName: string }) => {
    const formatted = `${unitToRemove.name.toUpperCase()} (${unitToRemove.shortName})`;
    const updated = customUnits.filter(
      (u) => !(u.name.toLowerCase() === unitToRemove.name.toLowerCase() && u.shortName.toLowerCase() === unitToRemove.shortName.toLowerCase())
    );
    setCustomUnits(updated);
    try {
      localStorage.setItem('yaa_crm_units', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (selectedBaseUnit === formatted) {
      setSelectedBaseUnit('PIECES (Pcs)');
    }
    if (selectedSecondaryUnit === formatted) {
      setSelectedSecondaryUnit('None');
    }
    toast.success(`Custom unit "${unitToRemove.name}" removed`);
  };

  // Image Upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Data State
  const [formData, setFormData] = useState({
    itemType: 'Product' as 'Product' | 'Service',
    productCode: '',
    productName: '',
    hsnCode: '',
    unit: 'PCS',
    category: 'food',
    itemImage: '',
    
    // Pricing
    salePrice: '' as string | number,
    salePriceTaxType: 'Excluded' as 'Excluded' | 'Included',
    discountValue: '' as string | number,
    discountType: 'Percentage' as 'Percentage' | 'Amount',
    
    // Wholesale
    hasWholesale: false,
    wholesalePrice: '' as string | number,
    wholesaleTaxType: 'Excluded' as 'Excluded' | 'Included',
    minWholesaleQty: '' as string | number,
    
    // Purchase & Taxes
    purchasePrice: '' as string | number,
    purchasePriceTaxType: 'Excluded' as 'Excluded' | 'Included',
    taxRate: 'None',
    
    // Stock
    openingStock: '' as string | number,
    atPrice: '' as string | number,
    asOfDate: new Date().toISOString().split('T')[0],
    minStockAlert: '' as string | number,
    location: '',
  });

  // Close dropdowns on outside click or scroll
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.product-action-dropdown-container') && !target.closest('.product-action-dropdown-menu')) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (!target.closest('.share-popover-container') && !target.closest('.share-popover-menu')) {
        setActiveShareId(null);
        setSharePos(null);
      }
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(target)) {
        setIsBulkMenuOpen(false);
      }
    };
    const handleScroll = () => {
      if (activeDropdownId) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
      if (activeShareId) {
        setActiveShareId(null);
        setSharePos(null);
      }
      if (isBulkMenuOpen) {
        setIsBulkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeDropdownId, activeShareId, isBulkMenuOpen]);

  // Generate Unique Code
  const generateNewCode = (type: 'Product' | 'Service') => {
    const prefix = type === 'Product' ? 'PRD' : 'SRV';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randNum}`;
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setActiveTab('Pricing');
    setFormData({
      itemType: 'Product',
      productCode: generateNewCode('Product'),
      productName: '',
      hsnCode: '',
      unit: 'PCS',
      category: '',
      itemImage: '',
      salePrice: '',
      salePriceTaxType: 'Excluded',
      discountValue: '',
      discountType: 'Percentage',
      hasWholesale: false,
      wholesalePrice: '',
      wholesaleTaxType: 'Excluded',
      minWholesaleQty: '',
      purchasePrice: '',
      purchasePriceTaxType: 'Excluded',
      taxRate: 'None',
      openingStock: '',
      atPrice: '',
      asOfDate: new Date().toISOString().split('T')[0],
      minStockAlert: '',
      location: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod: ProductItem) => {
    setEditingProduct(prod);
    setActiveTab('Pricing');
    setFormData({
      itemType: prod.itemType,
      productCode: prod.productCode,
      productName: prod.productName,
      hsnCode: prod.hsnCode || '',
      unit: prod.unit || 'PCS',
      category: prod.category || '',
      itemImage: prod.itemImage || '',
      salePrice: prod.salePrice || '',
      salePriceTaxType: prod.salePriceTaxType || 'Excluded',
      discountValue: prod.discountValue || '',
      discountType: prod.discountType || 'Percentage',
      hasWholesale: prod.hasWholesale || false,
      wholesalePrice: prod.wholesalePrice || '',
      wholesaleTaxType: prod.wholesaleTaxType || 'Excluded',
      minWholesaleQty: prod.minWholesaleQty || '',
      purchasePrice: prod.purchasePrice || '',
      purchasePriceTaxType: prod.purchasePriceTaxType || 'Excluded',
      taxRate: prod.taxRate || 'None',
      openingStock: prod.openingStock || '',
      atPrice: prod.atPrice || '',
      asOfDate: prod.asOfDate || new Date().toISOString().split('T')[0],
      minStockAlert: prod.minStockAlert || '',
      location: prod.location || '',
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, itemImage: reader.result as string }));
        toast.success('Image attached successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) {
      setCategories((prev) => [...prev, newCat]);
    }
  };

  const handleSaveItem = (keepOpenAfterSave = false) => {
    if (!formData.productName.trim()) {
      toast.error('Item Name is required');
      return;
    }

    const finalCode = formData.productCode.trim() || generateNewCode(formData.itemType);
    const salePriceNum = Number(formData.salePrice) || 0;
    const purchasePriceNum = Number(formData.purchasePrice) || 0;
    const discountValNum = Number(formData.discountValue) || 0;
    const wholesalePriceNum = Number(formData.wholesalePrice) || 0;
    const minWholesaleQtyNum = Number(formData.minWholesaleQty) || 0;
    const openingStockNum = Number(formData.openingStock) || 0;
    const atPriceNum = Number(formData.atPrice) || purchasePriceNum;
    const minStockAlertNum = Number(formData.minStockAlert) || 0;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                itemType: formData.itemType,
                productCode: finalCode,
                productName: formData.productName.trim(),
                hsnCode: formData.hsnCode.trim(),
                unit: formData.unit,
                category: formData.category || 'General',
                itemImage: formData.itemImage,
                salePrice: salePriceNum,
                salePriceTaxType: formData.salePriceTaxType,
                discountValue: discountValNum,
                discountType: formData.discountType,
                hasWholesale: formData.hasWholesale,
                wholesalePrice: wholesalePriceNum,
                wholesaleTaxType: formData.wholesaleTaxType,
                minWholesaleQty: minWholesaleQtyNum,
                purchasePrice: purchasePriceNum,
                purchasePriceTaxType: formData.purchasePriceTaxType,
                taxRate: formData.taxRate,
                openingStock: openingStockNum,
                atPrice: atPriceNum,
                asOfDate: formData.asOfDate,
                minStockAlert: minStockAlertNum,
                location: formData.location,
              }
            : p
        )
      );
      toast.success(`Item "${formData.productName}" updated successfully!`);
    } else {
      const newItem: ProductItem = {
        id: `prod-${Date.now()}`,
        sNo: products.length + 1,
        itemType: formData.itemType,
        productCode: finalCode,
        productName: formData.productName.trim(),
        hsnCode: formData.hsnCode.trim(),
        unit: formData.unit,
        category: formData.category || 'General',
        itemImage: formData.itemImage,
        salePrice: salePriceNum,
        salePriceTaxType: formData.salePriceTaxType,
        discountValue: discountValNum,
        discountType: formData.discountType,
        hasWholesale: formData.hasWholesale,
        wholesalePrice: wholesalePriceNum,
        wholesaleTaxType: formData.wholesaleTaxType,
        minWholesaleQty: minWholesaleQtyNum,
        purchasePrice: purchasePriceNum,
        purchasePriceTaxType: formData.purchasePriceTaxType,
        taxRate: formData.taxRate,
        openingStock: openingStockNum,
        atPrice: atPriceNum,
        asOfDate: formData.asOfDate,
        minStockAlert: minStockAlertNum,
        location: formData.location,
        status: 'Active',
      };
      setProducts((prev) => [newItem, ...prev]);
      toast.success(`Item "${formData.productName}" added successfully!`);
    }

    if (keepOpenAfterSave) {
      setEditingProduct(null);
      setFormData({
        itemType: formData.itemType,
        productCode: generateNewCode(formData.itemType),
        productName: '',
        hsnCode: '',
        unit: formData.unit || 'PCS',
        category: formData.category || '',
        itemImage: '',
        salePrice: '',
        salePriceTaxType: 'Excluded',
        discountValue: '',
        discountType: 'Percentage',
        hasWholesale: false,
        wholesalePrice: '',
        wholesaleTaxType: 'Excluded',
        minWholesaleQty: '',
        purchasePrice: '',
        purchasePriceTaxType: 'Excluded',
        taxRate: formData.taxRate || 'None',
        openingStock: '',
        atPrice: '',
        asOfDate: new Date().toISOString().split('T')[0],
        minStockAlert: '',
        location: '',
      });
      setActiveTab('Pricing');
    } else {
      setIsModalOpen(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setActiveDropdownId(null);
    toast.success('Item deleted successfully.');
  };

  // =========================================================================
  // BULK ACTIONS HANDLERS
  // =========================================================================
  const handleBulkInactive = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) => (targetIds.includes(p.id) ? { ...p, status: 'Inactive' } : p))
    );
    setIsBulkMenuOpen(false);
    toast.success(`${targetIds.length} item(s) marked as Inactive.`);
  };

  const handleBulkActive = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) => (targetIds.includes(p.id) ? { ...p, status: 'Active' } : p))
    );
    setIsBulkMenuOpen(false);
    toast.success(`${targetIds.length} item(s) marked as Active.`);
  };

  const handleBulkAssignCode = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) => {
        if (targetIds.includes(p.id)) {
          const prefix = p.itemType === 'Product' ? 'PRD' : 'SRV';
          const randNum = Math.floor(1000 + Math.random() * 9000);
          return { ...p, productCode: `${prefix}-${randNum}` };
        }
        return p;
      })
    );
    setIsBulkMenuOpen(false);
    toast.success(`Generated unique codes for ${targetIds.length} item(s).`);
  };

  const handleBulkAssignUnitsSubmit = () => {
    const targetIds = selectedIds.length > 0 ? selectedIds : products.map((p) => p.id);
    setProducts((prev) =>
      prev.map((p) => (targetIds.includes(p.id) ? { ...p, unit: selectedBulkUnit } : p))
    );
    setIsBulkUnitModalOpen(false);
    toast.success(`Assigned unit "${selectedBulkUnit}" to ${targetIds.length} item(s).`);
  };

  // Open Full "Bulk Update Items" screen
  const handleOpenBulkUpdateModal = () => {
    setIsBulkMenuOpen(false);
    setBulkItems(JSON.parse(JSON.stringify(products)));
    setBulkSelectedIds([]);
    setBulkSearch('');
    setBulkTab('Pricing');
    setIsBulkUpdateModalOpen(true);
  };

  // Update specific field in bulkItems
  const handleBulkItemChange = (id: string, field: keyof ProductItem, value: any) => {
    setBulkItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Batch update tax slab for selected items
  const handleApplyBatchTaxSlab = (tax: string) => {
    const targetIds = bulkSelectedIds.length > 0 ? bulkSelectedIds : bulkItems.map((p) => p.id);
    setBulkItems((prev) =>
      prev.map((item) => (targetIds.includes(item.id) ? { ...item, taxRate: tax } : item))
    );
    setBatchTaxDropdownOpen(false);
    toast.success(`Applied "${tax}" to ${targetIds.length} item(s).`);
  };

  // Calculate modifications count
  const updatesSummary = useMemo(() => {
    let pricingUpdates = 0;
    let stockUpdates = 0;
    let infoUpdates = 0;

    bulkItems.forEach((item) => {
      const original = products.find((p) => p.id === item.id);
      if (!original) return;

      if (
        item.purchasePrice !== original.purchasePrice ||
        item.purchasePriceTaxType !== original.purchasePriceTaxType ||
        item.salePrice !== original.salePrice ||
        item.salePriceTaxType !== original.salePriceTaxType ||
        item.discountValue !== original.discountValue ||
        item.discountType !== original.discountType ||
        item.taxRate !== original.taxRate
      ) {
        pricingUpdates++;
      }

      if (
        item.openingStock !== original.openingStock ||
        item.atPrice !== original.atPrice ||
        item.asOfDate !== original.asOfDate ||
        item.minStockAlert !== original.minStockAlert ||
        item.location !== original.location
      ) {
        stockUpdates++;
      }

      if (
        item.productName !== original.productName ||
        item.productCode !== original.productCode ||
        item.category !== original.category ||
        item.hsnCode !== original.hsnCode ||
        item.unit !== original.unit ||
        item.status !== original.status
      ) {
        infoUpdates++;
      }
    });

    return { pricingUpdates, stockUpdates, infoUpdates };
  }, [bulkItems, products]);

  // Save Bulk Updates
  const handleSaveBulkUpdate = () => {
    setProducts(bulkItems);
    setIsBulkUpdateModalOpen(false);
    toast.success('All item updates saved successfully!');
  };

  // Filtered bulk items based on bulkSearch
  const filteredBulkItems = useMemo(() => {
    const q = bulkSearch.toLowerCase().trim();
    if (!q) return bulkItems;
    return bulkItems.filter(
      (item) =>
        item.productName.toLowerCase().includes(q) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q)) ||
        item.productCode.toLowerCase().includes(q)
    );
  }, [bulkItems, bulkSearch]);

  const isAllBulkSelected =
    filteredBulkItems.length > 0 &&
    filteredBulkItems.every((item) => bulkSelectedIds.includes(item.id));

  const handleToggleBulkSelectAll = () => {
    if (isAllBulkSelected) {
      setBulkSelectedIds([]);
    } else {
      setBulkSelectedIds(filteredBulkItems.map((item) => item.id));
    }
  };

  const handleToggleBulkSelectRow = (id: string) => {
    setBulkSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter products for main table
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const q = appliedSearch.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        item.productCode.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.hsnCode && item.hsnCode.toLowerCase().includes(q));

      const matchesCategory =
        appliedCategory === 'ALL' || item.category === appliedCategory;

      const matchesType =
        appliedType === 'ALL' || item.itemType === appliedType;

      const matchesStatus =
        appliedStatus === 'ALL' || item.status === appliedStatus;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [products, appliedSearch, appliedCategory, appliedType, appliedStatus]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalItems = products.length;
    const totalProducts = products.filter((p) => p.itemType === 'Product').length;
    const totalServices = products.filter((p) => p.itemType === 'Service').length;
    const lowStockCount = products.filter(
      (p) => p.itemType === 'Product' && p.openingStock <= (p.minStockAlert || 5)
    ).length;
    const totalStockVal = products.reduce((sum, p) => sum + (p.openingStock * (p.purchasePrice || p.salePrice || 0)), 0);

    return { totalItems, totalProducts, totalServices, lowStockCount, totalStockVal };
  }, [products]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = useMemo(() => {
    return filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredProducts, safePage, pageSize]);

  // Handle select all toggle
  const isAllPageSelected =
    pagedProducts.length > 0 &&
    pagedProducts.every((p) => selectedIds.includes(p.id));

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedProducts.some((p) => p.id === id)));
    } else {
      const pageIds = pagedProducts.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (filteredProducts.length === 0) {
      toast.error('No products available to export.');
      return;
    }

    const excelRows = filteredProducts.map((p, index) => ({
      sNo: index + 1,
      itemType: p.itemType,
      productCode: p.productCode,
      productName: p.productName,
      hsnCode: p.hsnCode || '-',
      unit: p.unit,
      category: p.category,
      salePrice: Number(p.salePrice || 0),
      salePriceTaxType: p.salePriceTaxType,
      purchasePrice: Number(p.purchasePrice || 0),
      taxRate: Number(p.taxRate || 0),
      openingStock: Number(p.openingStock || 0),
      status: p.status,
    }));

    const totalStock = excelRows.reduce((acc, row) => acc + row.openingStock, 0);

    exportTableToExcel({
      filename: `Inventory_Products_Report_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Products & Services',
      title: 'YAA CREATIONS CRM - PRODUCTS & SERVICES INVENTORY',
      subtitle: `Total Items: ${filteredProducts.length} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      columns: [
        { header: '#', key: 'sNo', align: 'center', width: 8 },
        { header: 'Type', key: 'itemType', align: 'center', width: 12 },
        { header: 'Item Code', key: 'productCode', align: 'center', width: 14 },
        { header: 'Item Name', key: 'productName', align: 'left', width: 26 },
        { header: 'HSN/SAC', key: 'hsnCode', align: 'center', width: 12 },
        { header: 'Unit', key: 'unit', align: 'center', width: 12 },
        { header: 'Category', key: 'category', align: 'left', width: 20 },
        { header: 'Sale Price (₹)', key: 'salePrice', align: 'right', type: 'currency', width: 16 },
        { header: 'Tax Type', key: 'salePriceTaxType', align: 'center', width: 12 },
        { header: 'Purchase Price (₹)', key: 'purchasePrice', align: 'right', type: 'currency', width: 16 },
        { header: 'GST %', key: 'taxRate', align: 'center', width: 10 },
        { header: 'Stock Qty', key: 'openingStock', align: 'right', width: 12 },
        { header: 'Status', key: 'status', align: 'center', width: 12 },
      ],
      data: excelRows,
      summaryRow: {
        sNo: 'TOTAL',
        productName: `${filteredProducts.length} Items`,
        openingStock: totalStock,
      },
    });

    toast.success(`Inventory items Excel report downloaded (${filteredProducts.length} records)!`);
  };

  const filteredUnits = POPULAR_UNITS.filter(
    (u) =>
      u.name.toLowerCase().includes(unitSearchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(unitSearchQuery.toLowerCase())
  );

  const filteredHsn = COMMON_HSN_CODES.filter(
    (h) =>
      h.code.includes(hsnSearchQuery) ||
      h.desc.toLowerCase().includes(hsnSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Items</p>
            <p className="text-lg font-black text-slate-800">{metrics.totalItems}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Products</p>
            <p className="text-lg font-black text-slate-800">{metrics.totalProducts}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Services</p>
            <p className="text-lg font-black text-slate-800">{metrics.totalServices}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Low Stock</p>
            <p className="text-lg font-black text-slate-800">{metrics.lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stock Value</p>
            <p className="text-lg font-black text-slate-800">₹{metrics.totalStockVal.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* 2. Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold shrink-0">
              <Package className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Products & Services
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage inventory products, service items, pricing, tax rates, stock alerts, and wholesale rates.
          </p>
        </div>

        {/* Top Right Action Buttons: Excel Report & Split Button "+ Add Item v" */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto justify-center"
            onClick={handleExport}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Excel Report
          </Button>

          {/* SPLIT BUTTON WITH BULK ACTIONS DROPDOWN (BRAND THEME #33077C) */}
          <div ref={bulkMenuRef} className="relative inline-flex">
            <div className="inline-flex rounded-[4px] shadow-md hover:shadow-lg shadow-[#33077C]/20 bg-[#33077C] hover:bg-[#432eb5] text-white transition-all active:scale-[0.98]">
              {/* Left Button: + Add Item */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="h-11 px-5 flex items-center gap-2 text-sm font-bold text-white transition-colors cursor-pointer select-none rounded-l-[4px]"
              >
                <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                <span>Add Item</span>
              </button>

              {/* Vertical Divider */}
              <div className="w-[1px] bg-white/20 my-2.5" />

              {/* Right Button: Chevron Arrow */}
              <button
                type="button"
                onClick={() => setIsBulkMenuOpen(!isBulkMenuOpen)}
                className="h-11 px-3 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-white rounded-r-[4px]"
                title="Bulk Operations"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isBulkMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Bulk Actions Dropdown Menu */}
            {isBulkMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-[4px] shadow-2xl border border-slate-100 py-1.5 px-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* 1. Bulk Inactive */}
                <button
                  type="button"
                  onClick={handleBulkInactive}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Ban className="w-4 h-4 text-slate-500" />
                  <span>Bulk Inactive</span>
                </button>

                {/* 2. Bulk Active */}
                <button
                  type="button"
                  onClick={handleBulkActive}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Bulk Active</span>
                </button>

                {/* 3. Bulk Assign Code */}
                <button
                  type="button"
                  onClick={handleBulkAssignCode}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-[#33077C]" />
                  <span>Bulk Assign Code</span>
                </button>

                {/* 4. Assign Units */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkMenuOpen(false);
                    setIsBulkUnitModalOpen(true);
                  }}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Layers3 className="w-4 h-4 text-[#33077C]" />
                  <span>Assign Units</span>
                </button>

                {/* 5. Bulk Update Items (Opens full screen) */}
                <button
                  type="button"
                  onClick={handleOpenBulkUpdateModal}
                  className="w-full px-3 py-2.5 text-left text-xs sm:text-[13px] font-semibold text-slate-700 hover:bg-purple-50/60 hover:text-[#33077C] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#33077C]" />
                  <span>Bulk Update Items</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Search Bar & Dropdown Filter Row */}
      <SearchBar
        value={pendingSearch}
        onChange={(val) => setPendingSearch(val)}
        placeholder="Search by item code, name, category, HSN..."
        onSubmit={() => {
          setAppliedSearch(pendingSearch);
          setAppliedCategory(pendingCategory);
          setAppliedType(pendingType);
          setAppliedStatus(pendingStatus);
          setPage(1);
        }}
        onReset={() => {
          setPendingSearch('');
          setAppliedSearch('');
          setPendingCategory('ALL');
          setAppliedCategory('ALL');
          setPendingType('ALL');
          setAppliedType('ALL');
          setPendingStatus('ALL');
          setAppliedStatus('ALL');
          setPage(1);
        }}
        filterSlot={
          <div className="flex flex-wrap items-center gap-2.5">
            <FilterDropdown
              options={[
                { label: 'Type : All', value: 'ALL' },
                { label: 'Products', value: 'Product' },
                { label: 'Services', value: 'Service' },
              ]}
              value={pendingType}
              onChange={(val) => setPendingType(val)}
              placeholder="Type : All"
            />
            <FilterDropdown
              options={[
                { label: 'Category : All', value: 'ALL' },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
              value={pendingCategory}
              onChange={(val) => setPendingCategory(val)}
              placeholder="Category : All"
            />
            <FilterDropdown
              options={[
                { label: 'Status : All', value: 'ALL' },
                { label: 'Active', value: 'Active', dotColor: '#10b981' },
                { label: 'Inactive', value: 'Inactive', dotColor: '#64748b' },
              ]}
              value={pendingStatus}
              onChange={(val) => setPendingStatus(val)}
              placeholder="Status : All"
            />
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3 pr-1">
            {selectedIds.length > 0 && (
              <span className="text-xs bg-[#33077C]/10 text-[#33077C] font-bold px-2.5 py-1 rounded-lg border border-[#33077C]/20">
                {selectedIds.length} Selected
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500">
              Total Items :{' '}
              <span className="text-[#33077C] font-bold">{filteredProducts.length}</span>
            </span>
          </div>
        }
      />

      {/* 4. Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-200 min-w-[980px]">
            <thead>
              <tr className="bg-[#33077C] text-[11px] sm:text-[12px] font-bold text-white tracking-wider uppercase">
                {/* Checkbox */}
                <th className="py-4 px-3 border border-[#33077C]/30 bg-[#33077C] text-white w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                  />
                </th>
                <th className="py-4 px-3 border border-[#33077C]/30 bg-[#33077C] text-white w-12 text-center whitespace-nowrap">
                  S.NO
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                  ITEM CODE
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                  ITEM NAME
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap">
                  CATEGORY
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap text-right">
                  SALE PRICE
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap text-right">
                  PURCHASE PRICE
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white whitespace-nowrap text-center">
                  STOCK / UNIT
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-32 whitespace-nowrap">
                  STATUS
                </th>
                <th className="py-4 px-5 border border-[#33077C]/30 bg-[#33077C] text-white text-center w-24 whitespace-nowrap">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px] text-slate-700">
              {pagedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    No items found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedProducts.map((item, index) => {
                  const sNo = (safePage - 1) * pageSize + index + 1;
                  const isDropdownOpen = activeDropdownId === item.id;
                  const isLowStock = item.itemType === 'Product' && item.openingStock <= (item.minStockAlert || 5);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-purple-50/30 transition-colors border-b border-slate-200 ${
                        isSelected ? 'bg-purple-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-3 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(item.id)}
                          className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                        />
                      </td>

                      {/* S.NO */}
                      <td className="py-4 px-3 font-semibold text-slate-600 text-center border-r border-slate-200">
                        {sNo}
                      </td>

                      {/* ITEM CODE */}
                      <td className="py-4 px-5 font-semibold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#33077C]">{item.productCode}</span>
                          {item.hsnCode && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-normal px-1.5 py-0.5 rounded">
                              HSN: {item.hsnCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ITEM NAME */}
                      <td className="py-4 px-5 font-semibold text-slate-800 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          {item.itemImage ? (
                            <img
                              src={item.itemImage}
                              alt={item.productName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 flex items-center justify-center text-[#33077C] shrink-0 font-bold">
                              {item.itemType === 'Product' ? (
                                <Package className="w-4 h-4 text-[#33077C]" />
                              ) : (
                                <Layers className="w-4 h-4 text-[#4309A2]" />
                              )}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 leading-snug">{item.productName}</div>
                            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  item.itemType === 'Product'
                                    ? 'bg-[#33077C]/10 text-[#33077C]'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {item.itemType}
                              </span>
                              {item.unit && <span>Unit: {item.unit}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-4 px-5 font-medium text-slate-700 border-r border-slate-200">
                        {item.category || '-'}
                      </td>

                      {/* SALE PRICE */}
                      <td className="py-4 px-5 font-bold text-slate-800 border-r border-slate-200 text-right whitespace-nowrap">
                        <div className="text-[#33077C] font-black">₹{Number(item.salePrice).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {item.salePriceTaxType}
                        </div>
                      </td>

                      {/* PURCHASE PRICE */}
                      <td className="py-4 px-5 font-medium text-slate-600 border-r border-slate-200 text-right whitespace-nowrap">
                        {item.purchasePrice ? (
                          <>
                            <div>₹{Number(item.purchasePrice).toLocaleString('en-IN')}</div>
                            <div className="text-[10px] font-normal text-slate-400">
                              {item.purchasePriceTaxType}
                            </div>
                          </>
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* STOCK / UNIT */}
                      <td className="py-4 px-5 text-center border-r border-slate-200">
                        {item.itemType === 'Product' ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                                isLowStock
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'text-slate-800'
                              }`}
                            >
                              {item.openingStock} {item.unit}
                            </span>
                            {isLowStock && (
                              <span className="text-[10px] font-bold text-rose-500">Low Stock</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">N/A (Service)</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-5 text-center border-r border-slate-200">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold ${
                            item.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {item.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Icon Button */}
                          <button
                            type="button"
                            title="Print"
                            onClick={() => {
                              toast.info(`Preparing print for ${item.productName}...`);
                              window.print();
                            }}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Share Popover Button */}
                          <div className="relative inline-block text-left share-popover-container">
                            <button
                              type="button"
                              title="Share"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeShareId === item.id) {
                                  setActiveShareId(null);
                                  setSharePos(null);
                                } else {
                                  setActiveDropdownId(null);
                                  const btnRect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - btnRect.bottom;
                                  const popoverHeight = 130;

                                  if (spaceBelow < popoverHeight && btnRect.top > popoverHeight) {
                                    setSharePos({
                                      bottom: window.innerHeight - btnRect.top + 6,
                                      right: window.innerWidth - btnRect.right - 20,
                                    });
                                  } else {
                                    setSharePos({
                                      top: btnRect.bottom + 6,
                                      right: window.innerWidth - btnRect.right - 20,
                                    });
                                  }
                                  setActiveShareId(item.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <Forward className="w-4 h-4" />
                            </button>

                            {activeShareId === item.id && sharePos && (
                              <div
                                className="share-popover-menu fixed z-[9999] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left min-w-[190px]"
                                style={{
                                  top: sharePos.top !== undefined ? `${sharePos.top}px` : 'auto',
                                  bottom: sharePos.bottom !== undefined ? `${sharePos.bottom}px` : 'auto',
                                  right: `${Math.max(12, sharePos.right)}px`,
                                }}
                              >
                                <div className="text-xs font-bold text-slate-800 mb-3 px-0.5">
                                  Share
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  {/* Email Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveShareId(null);
                                      const subject = encodeURIComponent(`Product: ${item.productName}`);
                                      const body = encodeURIComponent(
                                        `Product Name: ${item.productName}\nProduct Code: ${item.productCode}\nCategory: ${item.category}\nSale Price: ₹${item.salePrice}\nOpening Stock: ${item.openingStock} ${item.unit}\nStatus: ${item.status}`
                                      );
                                      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                                        <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335" fillOpacity="0.1"/>
                                        <path d="M20 4H4C2.9 4 2 4.9 2 6V6.5L12 13L22 6.5V6C22 4.9 21.1 4 20 4Z" fill="#EA4335"/>
                                        <path d="M2 6.5V18C2 19.1 2.9 20 4 20H5V8.5L2 6.5Z" fill="#4285F4"/>
                                        <path d="M22 6.5V18C22 19.1 21.1 20 20 20H19V8.5L22 6.5Z" fill="#34A853"/>
                                        <path d="M19 20H5V8.5L12 13L19 8.5V20Z" fill="#FBBC04" fillOpacity="0.2"/>
                                        <path d="M20 6L12 11.5L4 6H20Z" fill="#C5221F"/>
                                      </svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">Email</span>
                                  </button>

                                  {/* WhatsApp Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveShareId(null);
                                      const text = encodeURIComponent(
                                        `*Product:* ${item.productName}\n*Product Code:* ${item.productCode}\n*Category:* ${item.category}\n*Sale Price:* ₹${item.salePrice}\n*Opening Stock:* ${item.openingStock} ${item.unit}\n*Status:* ${item.status}`
                                      );
                                      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-[#25D366] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                      </svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">WhatsApp</span>
                                  </button>

                                  {/* SMS Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveShareId(null);
                                      const text = encodeURIComponent(
                                        `Product: ${item.productName}, Code: ${item.productCode}, Price: ₹${item.salePrice}, Stock: ${item.openingStock} ${item.unit}, Status: ${item.status}`
                                      );
                                      window.open(`sms:?body=${text}`, '_blank');
                                    }}
                                    className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer group flex-1"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-[#FF9800] shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <svg className="w-5 h-5 fill-white text-white" viewBox="0 0 24 24">
                                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 10H6v-2h12v2zm0-3H6V7h12v2z"/>
                                        <circle cx="8" cy="11" r="1.2" fill="white"/>
                                        <circle cx="12" cy="11" r="1.2" fill="white"/>
                                        <circle cx="16" cy="11" r="1.2" fill="white"/>
                                      </svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900">SMS</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 3-dots Actions Dropdown */}
                          <div className="relative inline-block text-left product-action-dropdown-container">
                            <button
                              type="button"
                              title="More Options"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdownId === item.id) {
                                  setActiveDropdownId(null);
                                  setDropdownPos(null);
                                } else {
                                  setActiveShareId(null);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const dropdownHeight = 160;
                                  const rightPos = window.innerWidth - rect.right;

                                  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                    setDropdownPos({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: rightPos,
                                    });
                                  } else {
                                    setDropdownPos({
                                      top: rect.bottom + 4,
                                      right: rightPos,
                                    });
                                  }
                                  setActiveDropdownId(item.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-transparent hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && dropdownPos && (
                              <div
                                className="product-action-dropdown-menu fixed z-[9999] w-48 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans text-left"
                                style={{
                                  top: dropdownPos.top !== undefined ? `${dropdownPos.top}px` : 'auto',
                                  bottom: dropdownPos.bottom !== undefined ? `${dropdownPos.bottom}px` : 'auto',
                                  right: `${dropdownPos.right}px`,
                                }}
                              >
                                {/* 1. Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditModal(item);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Edit
                                </button>

                                {/* 2. Inactive / Active */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
                                    setProducts((prev) =>
                                      prev.map((p) =>
                                        p.id === item.id
                                          ? { ...p, status: nextStatus }
                                          : p
                                      )
                                    );
                                    toast.success(`Product ${item.productName} set to ${nextStatus}.`);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  {item.status === 'Active' ? 'Inactive' : 'Active'}
                                </button>

                                {/* 3. Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteProduct(item.id);
                                    setActiveDropdownId(null);
                                    setDropdownPos(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer block"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pagination */}
      <Pagination
        total={filteredProducts.length}
        currentPage={safePage}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />

      {/* ========================================================================= */}
      {/* 6. ADD / EDIT ITEM MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] my-auto">
            {/* Modal Header - Matches CRM Standard */}
            <div
              className="flex items-center justify-between px-6 py-4.5 text-white"
              style={{ background: '#33077C' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    {editingProduct ? 'Edit Item' : 'Add Item'}
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Configure product details, pricing, inventory stock, and tax rules
                  </p>
                </div>
              </div>

              {/* Right Action Icons: Settings & Close */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Item Settings"
                  onClick={() => toast.info('Configure item preferences, wholesale pricing, and barcode settings')}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1 bg-[#fafbfc]">
              {/* Row 1: Item Name, Item HSN, Select Unit, Add Item Image */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* Item Name */}
                <div className="md:col-span-4">
                  <input
                    type="text"
                    required
                    placeholder="Item Name *"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                </div>

                {/* Item HSN */}
                <div className="md:col-span-3 relative">
                  <input
                    type="text"
                    placeholder="Item HSN"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full h-11 pl-4 pr-10 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setIsHsnModalOpen(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#33077C] transition-colors"
                    title="Search HSN / SAC Codes"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {/* Select Unit Button */}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Pre-select matching base unit from allUnitsList
                      if (formData.unit) {
                        const matched = allUnitsList.find(
                          (u) =>
                            u.toUpperCase() === formData.unit.toUpperCase() ||
                            u.toUpperCase().includes(`(${formData.unit.toUpperCase()})`) ||
                            (u.includes('(') && u.match(/\((.*?)\)/)?.[1]?.toUpperCase() === formData.unit.toUpperCase())
                        );
                        if (matched) setSelectedBaseUnit(matched);
                      } else {
                        setSelectedBaseUnit('None');
                      }
                      setIsUnitModalOpen(true);
                    }}
                    className="w-full h-11 px-3 bg-[#33077C]/10 hover:bg-[#33077C]/15 text-[#33077C] border border-[#33077C]/25 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 truncate"
                  >
                    <span>{formData.unit && formData.unit !== 'None' ? `Unit: ${formData.unit}` : 'Select Unit'}</span>
                  </button>
                </div>

                {/* Add Item Image */}
                <div className="md:col-span-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {formData.itemImage ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={formData.itemImage}
                        alt="Preview"
                        className="w-11 h-11 rounded-xl object-cover border border-slate-300"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-[#33077C] hover:underline font-bold"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, itemImage: '' })}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-11 px-3 bg-white hover:bg-[#33077C]/5 border border-slate-300 hover:border-[#33077C]/40 text-[#33077C] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4 text-[#33077C]" />
                      <span>Add Item Image</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Category & Item Code with Assign Code */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* 2.1 Category Select Component */}
                <div className="md:col-span-4">
                  <CategorySelectField
                    value={formData.category}
                    onChange={(val) => setFormData({ ...formData, category: val })}
                    categories={categories}
                    onAddCategory={handleAddCategory}
                  />
                </div>

                {/* 2.2 Item Code with Assign Code button */}
                <div className="md:col-span-5">
                  <div className="flex items-center w-full h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 transition-all shadow-2xs">
                    <input
                      type="text"
                      placeholder="Item Code"
                      value={formData.productCode}
                      onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                      className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newCode = generateNewCode(formData.itemType);
                        setFormData({ ...formData, productCode: newCode });
                        toast.success(`Assigned code: ${newCode}`);
                      }}
                      className="h-8 mr-1.5 px-3 bg-[#33077C]/10 hover:bg-[#33077C]/20 text-[#33077C] font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Assign Code
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs: Pricing | Stock */}
              <div className="border-b border-slate-200 flex items-center gap-8 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('Pricing')}
                  className={`pb-3 text-sm font-bold tracking-tight transition-all relative cursor-pointer ${
                    activeTab === 'Pricing'
                      ? 'text-[#33077C] border-b-2 border-[#33077C] font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Pricing
                </button>

                {formData.itemType === 'Product' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('Stock')}
                    className={`pb-3 text-sm font-bold tracking-tight transition-all relative cursor-pointer ${
                      activeTab === 'Stock'
                        ? 'text-[#33077C] border-b-2 border-[#33077C] font-black'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Stock
                  </button>
                )}
              </div>

              {/* TAB 1: PRICING TAB CONTENT */}
              {activeTab === 'Pricing' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Card 1: Sale Price & Wholesale Price */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                    {/* 1.1 Sale Price Row */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Sale Price
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Sale Price + Tax Type */}
                        <div className="flex items-center h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Sale Price"
                            value={formData.salePrice}
                            onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                            className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          <select
                            value={formData.salePriceTaxType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                salePriceTaxType: e.target.value as any,
                              })
                            }
                            className="h-full px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
                          >
                            <option value="Excluded">Excluded</option>
                            <option value="Included">Included</option>
                          </select>
                        </div>

                        {/* Disc. On Sale Price + Disc Type */}
                        <div className="flex items-center h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 shadow-2xs">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Disc. On Sale Price"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                          />
                          <select
                            value={formData.discountType}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                discountType: e.target.value as 'Percentage' | 'Amount',
                              })
                            }
                            className="h-full px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
                          >
                            <option value="Percentage">Percentage</option>
                            <option value="Amount">Amount (₹)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 1.2 Wholesale Price Section */}
                    {formData.itemType === 'Product' && (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-bold text-slate-700">Wholesale Price</span>
                          {formData.hasWholesale ? (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, hasWholesale: false, wholesalePrice: '', minWholesaleQty: '' })}
                              className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, hasWholesale: true })}
                              className="text-xs font-bold text-[#33077C] hover:text-[#4309A2] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#33077C]" />
                              <span>Add Wholesale Price</span>
                            </button>
                          )}
                        </div>

                        {formData.hasWholesale && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 animate-in fade-in duration-100">
                            {/* Wholesale Price + Tax Type */}
                            <div className="flex items-center h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 shadow-2xs">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="Wholesale Price"
                                value={formData.wholesalePrice}
                                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                                className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                              />
                              <select
                                value={formData.wholesaleTaxType}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    wholesaleTaxType: e.target.value as 'Excluded' | 'Included',
                                  })
                                }
                                className="h-full px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
                              >
                                <option value="Excluded">Excluded</option>
                                <option value="Included">Included</option>
                              </select>
                            </div>

                            {/* Minimum Wholesale Qty with Info Tooltip */}
                            <div className="flex items-center h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 shadow-2xs pr-3">
                              <input
                                type="number"
                                min="1"
                                placeholder="Minimum Wholesale Qty"
                                value={formData.minWholesaleQty}
                                onChange={(e) => setFormData({ ...formData, minWholesaleQty: e.target.value })}
                                className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                              />
                              <div
                                title="Minimum order quantity for wholesale pricing to apply"
                                className="text-slate-400 hover:text-[#33077C] cursor-help"
                              >
                                <Info className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card 2 & 3: Purchase Price & Taxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Purchase Price Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Purchase Price
                      </label>
                      <div className="flex items-center h-11 bg-white border border-slate-300 hover:border-slate-400 rounded-xl overflow-hidden focus-within:border-[#4309A2] focus-within:ring-2 focus-within:ring-[#33077C]/15 shadow-2xs">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Purchase Price"
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                          className="flex-1 h-full px-4 bg-transparent text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
                        />
                        <select
                          value={formData.purchasePriceTaxType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchasePriceTaxType: e.target.value as any,
                            })
                          }
                          className="h-full px-3 bg-slate-50 border-l border-slate-200 text-xs font-medium text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
                        >
                          <option value="Excluded">Excluded</option>
                          <option value="Included">Included</option>
                        </select>
                      </div>
                    </div>

                    {/* Taxes Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                      <label className="text-xs font-bold text-slate-700 block">
                        Taxes
                      </label>
                      <div className="relative">
                        <select
                          value={formData.taxRate}
                          onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                          className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-[#4309A2] focus:ring-2 focus:ring-[#33077C]/15 shadow-2xs cursor-pointer"
                        >
                          {TAX_RATE_OPTIONS.map((tax) => (
                            <option key={tax.value} value={tax.value}>
                              {tax.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STOCK TAB CONTENT */}
              {activeTab === 'Stock' && (
                <div className="space-y-4 pt-1 animate-in fade-in duration-100">
                  {/* Row 1: Opening Quantity | At Price | As Of Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1. Opening Quantity */}
                    <div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Opening Quantity"
                        value={formData.openingStock}
                        onChange={(e) => setFormData({ ...formData, openingStock: e.target.value })}
                        className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                      />
                    </div>

                    {/* 2. At Price */}
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="At Price"
                        value={formData.atPrice}
                        onChange={(e) => setFormData({ ...formData, atPrice: e.target.value })}
                        className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                      />
                    </div>

                    {/* 3. As Of Date with Floating Notch Label */}
                    <div className="relative">
                      <div className="relative w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#33077C] focus-within:ring-2 focus-within:ring-[#33077C]/15 rounded-xl flex items-center justify-between transition-all shadow-2xs">
                        <span className="absolute -top-2.5 left-3 px-1.5 bg-white text-[11px] font-bold text-[#33077C] rounded-sm pointer-events-none tracking-tight">
                          As Of Date
                        </span>
                        <input
                          type="date"
                          value={formData.asOfDate}
                          onChange={(e) => setFormData({ ...formData, asOfDate: e.target.value })}
                          className="w-full h-full bg-transparent text-xs sm:text-sm font-medium text-slate-800 outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Min Stock To Maintain | Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1. Min Stock To Maintain */}
                    <div>
                      <input
                        type="number"
                        min="0"
                        placeholder="Min Stock To Maintain"
                        value={formData.minStockAlert}
                        onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                        className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                      />
                    </div>

                    {/* 2. Location */}
                    <div>
                      <input
                        type="text"
                        placeholder="Location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:ring-2 focus:ring-[#33077C]/15 transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Bar - Matches CRM Standard */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveItem(true)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-slate-500 stroke-[2.5]" />
                <span>Save &amp; New</span>
              </button>
              <button
                type="button"
                onClick={() => handleSaveItem(false)}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>{editingProduct ? 'Update' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SELECT UNIT MODAL (CRM Standard Theme)                                  */}
      {/* ========================================================================= */}
      {isUnitModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsUnitModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-100 my-auto">
            {/* Modal Header - Matches CRM Standard */}
            <div
              className="flex items-center justify-between px-6 py-4.5 text-white"
              style={{ background: '#33077C' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
                    Select Unit
                  </h3>
                  <p className="text-xs text-white/80 font-medium truncate mt-0.5">
                    Configure base and secondary units or add custom units manually
                  </p>
                </div>
              </div>

              {/* Right Action Icons */}
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - CRM Card Layout */}
            <div className="p-6 space-y-5 bg-[#fafbfc] max-h-[80vh] overflow-y-auto">
              {/* Card 1: Unit Selection */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Unit Configuration
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BASE UNIT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Base Unit <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBaseUnit}
                        onChange={(e) => setSelectedBaseUnit(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
                      >
                        {allUnitsList.map((u) => {
                          const isCustom = customUnits.some(
                            (c) => `${c.name.toUpperCase()} (${c.shortName})` === u
                          );
                          return (
                            <option key={u} value={u}>
                              {u} {isCustom ? '★ (Custom)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* SECONDARY UNIT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Secondary Unit
                    </label>
                    <div className="relative">
                      <select
                        value={selectedSecondaryUnit}
                        onChange={(e) => setSelectedSecondaryUnit(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
                      >
                        {allUnitsList.map((u) => {
                          const isCustom = customUnits.some(
                            (c) => `${c.name.toUpperCase()} (${c.shortName})` === u
                          );
                          return (
                            <option key={u} value={u}>
                              {u} {isCustom ? '★ (Custom)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Add Custom Unit Manually */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#33077C]" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Add Custom Unit Manually
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Reflects in dropdown</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      placeholder="Unit Full Name (e.g. Dozen, Pack, Drum)"
                      value={newUnitFullName}
                      onChange={(e) => setNewUnitFullName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCustomUnit();
                        }
                      }}
                      className="w-full h-11 px-4 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Short (e.g. Dzn)"
                      value={newUnitShortName}
                      onChange={(e) => setNewUnitShortName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCustomUnit();
                        }
                      }}
                      className="w-full h-11 px-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#4309A2] focus:ring-4 focus:ring-[#4309A2]/10 transition-all shadow-2xs uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center">
                    <button
                      type="button"
                      onClick={handleAddNewCustomUnit}
                      className="w-full h-11 px-3 bg-[#33077C] hover:bg-[#4309A2] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Add Unit"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* List of Custom Added Units */}
                {customUnits.length > 0 && (
                  <div className="pt-2.5 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      Custom Units Created ({customUnits.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-0.5">
                      {customUnits.map((cu) => {
                        const formatted = `${cu.name.toUpperCase()} (${cu.shortName})`;
                        const isCurrentBase = selectedBaseUnit === formatted;
                        return (
                          <div
                            key={formatted}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                              isCurrentBase
                                ? 'bg-purple-100 text-[#33077C] border-purple-300 ring-2 ring-[#33077C]/20 font-bold'
                                : 'bg-slate-100/80 text-slate-700 border-slate-200 hover:bg-slate-200 cursor-pointer'
                            }`}
                          >
                            <span
                              onClick={() => setSelectedBaseUnit(formatted)}
                              className="cursor-pointer hover:underline"
                              title="Click to select as Base Unit"
                            >
                              {formatted}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustomUnit(cu);
                              }}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                              title="Delete this custom unit"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer - Matches CRM Standard */}
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs sm:text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs flex items-center gap-2"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const chosen = selectedBaseUnit !== 'None' ? selectedBaseUnit : '';
                  let unitCode = chosen;
                  if (chosen.includes('(')) {
                    const match = chosen.match(/\((.*?)\)/);
                    unitCode = match ? match[1].toUpperCase() : chosen.split(' ')[0];
                  }
                  setFormData({ ...formData, unit: unitCode });
                  setIsUnitModalOpen(false);
                  toast.success(`Unit set to ${unitCode || 'None'}`);
                }}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-[13px] font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. HSN / SAC SEARCH MODAL */}
      {/* ========================================================================= */}
      {isHsnModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHsnModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#33077C] text-white">
              <h3 className="text-base font-bold text-white">Search HSN / SAC Code</h3>
              <button
                type="button"
                onClick={() => setIsHsnModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by HSN code or description..."
                  value={hsnSearchQuery}
                  onChange={(e) => setHsnSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#4309A2] focus:bg-white"
                />
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto p-1">
                {filteredHsn.map((h) => (
                  <div
                    key={h.code}
                    onClick={() => {
                      setFormData({ ...formData, hsnCode: h.code });
                      setIsHsnModalOpen(false);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-[#33077C] hover:bg-purple-50/40 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">HSN: {h.code}</div>
                      <div className="text-[11px] text-slate-500">{h.desc}</div>
                    </div>
                    <span className="text-xs font-bold text-[#33077C]">Select</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. BULK ASSIGN UNITS QUICK MODAL */}
      {/* ========================================================================= */}
      {isBulkUnitModalOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-100"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkUnitModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#33077C] text-white">
              <h3 className="text-base font-bold text-white">Assign Units in Bulk</h3>
              <button
                type="button"
                onClick={() => setIsBulkUnitModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500">
                Select the unit of measurement to apply to{' '}
                <strong className="text-slate-800">
                  {selectedIds.length > 0 ? `${selectedIds.length} selected item(s)` : 'all items'}
                </strong>
                .
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Unit</label>
                <select
                  value={selectedBulkUnit}
                  onChange={(e) => setSelectedBulkUnit(e.target.value)}
                  className="w-full h-11 px-4 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-[#33077C]"
                >
                  {POPULAR_UNITS.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code} - {u.name}
                    </option>
                  ))}
                  {customUnits.map((cu) => (
                    <option key={cu.shortName} value={cu.shortName.toUpperCase()}>
                      {cu.shortName.toUpperCase()} - {cu.name} (Custom)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUnitModalOpen(false)}
                  className="h-9 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAssignUnitsSubmit}
                  className="h-9 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-xs"
                >
                  Apply Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. FULL "BULK UPDATE ITEMS" SCREEN (MATCHING USER SCREENSHOT EXACTLY) */}
      {/* ========================================================================= */}
      {isBulkUpdateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBulkUpdateModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-7xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* 10.1 Top Header Bar */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#33077C]/10 text-[#33077C] flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4.5 h-4.5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Bulk Update Items</h2>
              </div>

              {/* Top Right: Search & Radio Tabs */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by item name / HSN Code"
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    className="w-64 h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-full text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#33077C] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* Radio Tabs */}
                <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
                  {/* Pricing Tab */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="bulkTab"
                      checked={bulkTab === 'Pricing'}
                      onChange={() => setBulkTab('Pricing')}
                      className="w-4 h-4 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                    />
                    <span className={bulkTab === 'Pricing' ? 'font-bold text-[#33077C]' : 'text-slate-600'}>
                      Pricing
                    </span>
                  </label>

                  {/* Stock Tab */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="bulkTab"
                      checked={bulkTab === 'Stock'}
                      onChange={() => setBulkTab('Stock')}
                      className="w-4 h-4 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                    />
                    <span className={bulkTab === 'Stock' ? 'font-bold text-[#33077C]' : 'text-slate-600'}>
                      Stock
                    </span>
                  </label>

                  {/* Item Information Tab */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="bulkTab"
                      checked={bulkTab === 'Item Information'}
                      onChange={() => setBulkTab('Item Information')}
                      className="w-4 h-4 text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                    />
                    <span className={bulkTab === 'Item Information' ? 'font-bold text-[#33077C]' : 'text-slate-600'}>
                      Item Information
                    </span>
                  </label>
                </div>

                {/* Modal Close Button */}
                <button
                  type="button"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 10.2 Sub-Header Banner Row */}
            <div className="bg-[#33077C]/5 px-6 py-2.5 border-b border-[#33077C]/15 flex items-center justify-between text-xs shrink-0">
              <div className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#33077C]"></span>
                <span>
                  <strong className="text-[#33077C]">{bulkSelectedIds.length}</strong> items selected
                </span>
              </div>

              {/* Batch Action: Update Tax Slab */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBatchTaxDropdownOpen(!batchTaxDropdownOpen)}
                  className="h-8 px-4 rounded-xl bg-white hover:bg-purple-50 border border-[#33077C]/30 text-[#33077C] font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Update Tax Slab</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#33077C]" />
                </button>

                {batchTaxDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Apply to Selected Items</div>
                    {TAX_RATE_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => handleApplyBatchTaxSlab(t.value)}
                        className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-purple-50 hover:text-[#33077C] transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 10.3 Editable Data Grid */}
            <div className="flex-1 overflow-auto bg-white">
              <table className="w-full text-left border-collapse border-b border-slate-200 min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {/* Checkbox */}
                    <th className="py-3 px-3 w-10 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={isAllBulkSelected}
                        onChange={handleToggleBulkSelectAll}
                        className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                      />
                    </th>

                    {/* # Index */}
                    <th className="py-3 px-3 w-10 text-center border-r border-slate-200">#</th>

                    {/* Common Header 1: ITEM NAME */}
                    <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>ITEM NAME*</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    {/* Common Header 2: CATEGORY */}
                    <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>CATEGORY</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    {/* Common Header 3: ITEM HSN */}
                    <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                      <div className="flex items-center justify-between gap-1">
                        <span>ITEM HSN</span>
                        <Filter className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>

                    {/* ================= PRICING TAB COLUMNS ================= */}
                    {bulkTab === 'Pricing' && (
                      <>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>PURCHASE PRICE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX TYPE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>SALE PRICE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX TYPE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>DISCOUNT ON SALE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>DISCOUNT TYPE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TAX RATE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      </>
                    )}

                    {/* ================= STOCK TAB COLUMNS ================= */}
                    {bulkTab === 'Stock' && (
                      <>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>OPENING QUANTITY</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>AT PRICE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>AS OF DATE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>MIN STOCK TO MAINTAIN</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>LOCATION</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      </>
                    )}

                    {/* ================= ITEM INFO TAB COLUMNS ================= */}
                    {bulkTab === 'Item Information' && (
                      <>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>ITEM CODE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>UNIT</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>STATUS</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                        <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                          <div className="flex items-center justify-between gap-1">
                            <span>TYPE</span>
                            <Filter className="w-3 h-3 text-slate-400" />
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredBulkItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-16 text-center text-slate-400 font-medium">
                        No items found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBulkItems.map((item, index) => {
                      const isSelected = bulkSelectedIds.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-purple-50/20 transition-colors ${
                            isSelected ? 'bg-purple-50/40' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleBulkSelectRow(item.id)}
                              className="w-4 h-4 rounded text-[#33077C] focus:ring-[#33077C] cursor-pointer"
                            />
                          </td>

                          {/* # Index */}
                          <td className="py-3 px-3 text-center font-medium text-slate-500 border-r border-slate-200">
                            {index + 1}
                          </td>

                          {/* ITEM NAME */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleBulkItemChange(item.id, 'productName', e.target.value)}
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md font-semibold text-slate-800 outline-none"
                            />
                          </td>

                          {/* CATEGORY */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <select
                              value={item.category}
                              onChange={(e) => handleBulkItemChange(item.id, 'category', e.target.value)}
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="---">---</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* ITEM HSN */}
                          <td className="py-2.5 px-3 border-r border-slate-200">
                            <input
                              type="text"
                              value={item.hsnCode || '---'}
                              onChange={(e) => handleBulkItemChange(item.id, 'hsnCode', e.target.value)}
                              className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none"
                            />
                          </td>

                          {/* ================= PRICING TAB ROW FIELDS ================= */}
                          {bulkTab === 'Pricing' && (
                            <>
                              {/* PURCHASE PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.purchasePrice || ''}
                                    onChange={(e) =>
                                      handleBulkItemChange(item.id, 'purchasePrice', Number(e.target.value))
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md font-medium text-slate-800 outline-none"
                                  />
                                </div>
                              </td>

                              {/* PURCHASE TAX TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.purchasePriceTaxType || 'Excluded'}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'purchasePriceTaxType', e.target.value)
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="Excluded">Excluded</option>
                                  <option value="Included">Included</option>
                                </select>
                              </td>

                              {/* SALE PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.salePrice || ''}
                                    onChange={(e) =>
                                      handleBulkItemChange(item.id, 'salePrice', Number(e.target.value))
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md font-bold text-slate-800 outline-none"
                                  />
                                </div>
                              </td>

                              {/* SALE TAX TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.salePriceTaxType || 'Excluded'}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'salePriceTaxType', e.target.value)
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="Excluded">Excluded</option>
                                  <option value="Included">Included</option>
                                </select>
                              </td>

                              {/* DISCOUNT ON SALE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.discountValue || ''}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'discountValue', Number(e.target.value))
                                  }
                                  className="w-20 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-800 outline-none"
                                />
                              </td>

                              {/* DISCOUNT TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.discountType || 'Percentage'}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'discountType', e.target.value)
                                  }
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="Percentage">Percentage</option>
                                  <option value="Amount">Amount</option>
                                </select>
                              </td>

                              {/* TAX RATE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.taxRate || 'None'}
                                  onChange={(e) => handleBulkItemChange(item.id, 'taxRate', e.target.value)}
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  {TAX_RATE_OPTIONS.map((t) => (
                                    <option key={t.value} value={t.value}>
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </>
                          )}

                          {/* ================= STOCK TAB ROW FIELDS ================= */}
                          {bulkTab === 'Stock' && (
                            <>
                              {/* OPENING QUANTITY */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.openingStock}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'openingStock', Number(e.target.value))
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md font-bold text-slate-800 outline-none"
                                />
                              </td>

                              {/* AT PRICE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <div className="flex items-center">
                                  <span className="text-slate-400 mr-1">₹</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.atPrice || ''}
                                    onChange={(e) =>
                                      handleBulkItemChange(item.id, 'atPrice', Number(e.target.value))
                                    }
                                    className="w-24 h-8 px-1.5 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-800 outline-none"
                                  />
                                </div>
                              </td>

                              {/* AS OF DATE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="date"
                                  value={item.asOfDate || ''}
                                  onChange={(e) => handleBulkItemChange(item.id, 'asOfDate', e.target.value)}
                                  className="h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                />
                              </td>

                              {/* MIN STOCK TO MAINTAIN */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.minStockAlert || ''}
                                  onChange={(e) =>
                                    handleBulkItemChange(item.id, 'minStockAlert', Number(e.target.value))
                                  }
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-800 outline-none"
                                />
                              </td>

                              {/* LOCATION */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="text"
                                  value={item.location || ''}
                                  onChange={(e) => handleBulkItemChange(item.id, 'location', e.target.value)}
                                  placeholder="e.g. Rack A"
                                  className="w-full h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none"
                                />
                              </td>
                            </>
                          )}

                          {/* ================= ITEM INFO TAB ROW FIELDS ================= */}
                          {bulkTab === 'Item Information' && (
                            <>
                              {/* ITEM CODE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <input
                                  type="text"
                                  value={item.productCode}
                                  onChange={(e) => handleBulkItemChange(item.id, 'productCode', e.target.value)}
                                  className="w-28 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md font-mono text-slate-800 outline-none"
                                />
                              </td>

                              {/* UNIT */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.unit}
                                  onChange={(e) => handleBulkItemChange(item.id, 'unit', e.target.value)}
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  {POPULAR_UNITS.map((u) => (
                                    <option key={u.code} value={u.code}>
                                      {u.code}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              {/* STATUS */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <select
                                  value={item.status}
                                  onChange={(e) => handleBulkItemChange(item.id, 'status', e.target.value as any)}
                                  className="w-24 h-8 px-2 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-[#33077C] rounded-md text-slate-700 outline-none cursor-pointer"
                                >
                                  <option value="Active">Active</option>
                                  <option value="Inactive">Inactive</option>
                                </select>
                              </td>

                              {/* TYPE */}
                              <td className="py-2.5 px-3 border-r border-slate-200">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                    item.itemType === 'Product'
                                      ? 'bg-[#33077C]/10 text-[#33077C]'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {item.itemType}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 10.4 Bottom Action Footer Bar */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {/* Left: Dynamic Updates Summary Badge (Themed) */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="px-4 py-2 bg-purple-50 border border-[#33077C]/20 text-[11px] text-slate-700 rounded-xl font-medium shadow-2xs flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
                    <strong className="text-slate-800">Pricing:</strong>{' '}
                    <span className="font-bold text-[#33077C]">{updatesSummary.pricingUpdates} Updates</span>
                  </span>
                  <span className="text-purple-200">|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
                    <strong className="text-slate-800">Stock:</strong>{' '}
                    <span className="font-bold text-[#33077C]">{updatesSummary.stockUpdates} Updates</span>
                  </span>
                  <span className="text-purple-200">|</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#33077C]"></span>
                    <strong className="text-slate-800">Item Information:</strong>{' '}
                    <span className="font-bold text-[#33077C]">{updatesSummary.infoUpdates} Updates</span>
                  </span>
                </div>
              </div>

              {/* Right: Cancel & Update Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="h-10 px-5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulkUpdate}
                  className="h-10 px-7 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#33077C]/20 hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
