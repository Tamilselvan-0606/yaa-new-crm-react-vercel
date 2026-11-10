import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Check, Download, FileSpreadsheet, FileUp, Loader2, RefreshCw, Upload } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { productApi } from '../../../api/commerce/productApi';
import type { ProductBulkUploadResult } from '../../../api/commerce/productTypes';
import { getApiErrorMessage } from '../../../utils/formValidation';
import { toast } from '../../../utils/toast';
import { downloadProductBulkTemplate } from '../../../utils/productBulkTemplate';

const MAX_BYTES = 5 * 1024 * 1024;
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called after an upload that created at least one product, so the list can be re-read from the server. */
  onUploaded: () => void | Promise<void>;
}

export const ProductBulkUploadModal: React.FC<Props> = ({ isOpen, onClose, onUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProductBulkUploadResult | null>(null);

  const reset = () => {
    setFile(null);
    setFileError('');
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const pick = (f: File | undefined | null) => {
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setFile(null);
      setFileError('Only Excel (.xlsx) files can be uploaded.');
      return;
    }
    if (f.size === 0) {
      setFile(null);
      setFileError('The selected file is empty.');
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setFileError('The file is larger than 5 MB. Split it into smaller files.');
      return;
    }
    setFileError('');
    setFile(f);
  };

  const upload = async () => {
    if (busy) return;
    if (!file) {
      setFileError('Please choose an Excel (.xlsx) file to upload.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await productApi.bulkUploadProducts(new File([file], file.name, { type: file.type || XLSX_MIME }));
      if (!res?.success || !res.data) {
        toast.error(res?.message || 'Product bulk upload failed.');
        return;
      }
      const r = res.data;
      setResult(r);
      const created = r.createdProducts ?? r.created ?? 0;
      const failed = r.failedRows ?? r.failed ?? 0;
      if (created > 0) await onUploaded();
      if (failed === 0) toast.success(`All ${created} product${created === 1 ? '' : 's'} were imported.`);
      else if (created > 0) toast.warning(`${created} imported, ${failed} failed. See the rows below.`);
      else toast.error(`All ${failed} rows failed. Please review the errors below.`);
    } catch (err: any) {
      // A 4xx can still carry per-row errors
      const apiErrors = err?.response?.data?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setResult({ totalRows: apiErrors.length, successfulRows: 0, failedRows: apiErrors.length, createdProducts: 0, errors: apiErrors });
      }
      toast.error(getApiErrorMessage(err, 'We could not upload the products file. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const created = result ? result.createdProducts ?? result.created ?? 0 : 0;
  const failed = result ? result.failedRows ?? result.failed ?? 0 : 0;
  const total = result ? result.totalRows ?? result.total ?? created + failed : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Bulk Upload Items"
      subtitle="Import multiple items at once via Excel (.xlsx) with automatic organization isolation & duplicate checks"
      maxWidth="3xl"
      headerGradient
      showBackIcon
      onBack={close}
    >
      <div className="space-y-4 p-1 text-xs">
        <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200/80 dark:border-purple-800/60">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-bold text-[#33077C] text-sm flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel file format</span>
            </h4>
            <button
              type="button"
              onClick={() => downloadProductBulkTemplate().then(() => toast.success('Template downloaded.')).catch(() => toast.error('The template could not be created.'))}
              className="px-3 py-1.5 rounded-xl bg-white border border-purple-300 hover:border-[#33077C] text-[#33077C] font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample Excel</span>
            </button>
          </div>
          <p className="text-slate-600 mt-1">
            The first row must hold the column names. Category, subcategory and unit are matched by name against your existing records.
          </p>
          <p className="text-slate-600 mt-1">
            <span className="font-bold">Product:</span>{' '}
            <code className="font-mono text-[11px] text-[#33077C]">itemType, productName, unit, baseUnitId, secondaryUnitId, category, subcategory, itemImage</code>
          </p>
          <p className="text-slate-600 mt-0.5">
            <span className="font-bold">Price and tax:</span>{' '}
            <code className="font-mono text-[11px] text-[#33077C]">salePrice, salePriceTaxType, discountValue, discountType, hasWholesale, wholesalePrice, wholesaleTaxType, minWholesaleQty, purchasePrice, purchasePriceTaxType, taxRate</code>
          </p>
          <p className="text-slate-600 mt-0.5">
            <span className="font-bold">Stock:</span>{' '}
            <code className="font-mono text-[11px] text-[#33077C]">atPrice, asOfDate, minStockAlert, location, status</code>
          </p>
          <p className="text-slate-600 mt-0.5">
            <span className="font-bold">Batch:</span>{' '}
            <code className="font-mono text-[11px] text-[#33077C]">isBatchTracking, batchNo, mfgDate, expDate</code>
          </p>
          <p className="text-slate-500 text-[11px] mt-1">Maximum file size 5 MB. Duplicate product codes / SKUs are reported per row.</p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                failed === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : created > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {failed === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-bold text-sm">
                  {failed === 0 ? 'Bulk upload completed' : created > 0 ? 'Bulk upload completed with errors' : 'Bulk upload failed'}
                </h4>
                <p className="mt-0.5 opacity-90">
                  {failed === 0 ? `All ${created} products were created.` : `${created} created, ${failed} failed. Fix the rows below in your file and upload again.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rows in file</div>
                <div className="text-xl font-black text-slate-800 mt-0.5">{total}</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Created</div>
                <div className="text-xl font-black text-emerald-600 mt-0.5">{created}</div>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Failed</div>
                <div className="text-xl font-black text-rose-600 mt-0.5">{failed}</div>
              </div>
            </div>

            {((result.createdCategories ?? 0) > 0 || (result.createdSubcategories ?? 0) > 0) && (
              <p className="text-slate-600">
                Also created: {result.createdCategories ?? 0} categor{(result.createdCategories ?? 0) === 1 ? 'y' : 'ies'} and {result.createdSubcategories ?? 0} subcategor
                {(result.createdSubcategories ?? 0) === 1 ? 'y' : 'ies'}.
              </p>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  Row errors ({result.errors.length})
                </span>
                <div className="max-h-56 overflow-auto rounded-xl border border-rose-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-rose-100/60 text-rose-800 sticky top-0 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3 text-center w-16">Row</th>
                        <th className="py-2 px-3 w-32">Column</th>
                        <th className="py-2 px-3">Problem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 text-center font-mono font-bold text-rose-600">#{e.row}</td>
                          <td className="py-2 px-3 text-slate-600">{e.field || '—'}</td>
                          <td className="py-2 px-3 text-rose-700 font-medium">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 flex flex-wrap justify-end items-center gap-2.5 border-t border-slate-100">
              <button type="button" onClick={reset} className="h-10 px-4 rounded-xl border border-purple-200 hover:border-purple-300 text-xs font-bold text-[#33077C] hover:bg-purple-50 transition-all cursor-pointer flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Another Excel
              </button>
              <button type="button" onClick={close} className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Done & View Items</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <div
              onClick={() => !busy && inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy) pick(e.dataTransfer.files?.[0]);
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                file
                  ? 'border-purple-300 bg-purple-50/30 dark:bg-purple-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-[#33077C] hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 text-[#33077C] dark:text-purple-300 flex items-center justify-center">
                  <FileUp className="w-6 h-6 stroke-[2]" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white break-all">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB • Click or drop another file to replace</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Click to browse or drag & drop Excel file</p>
                    <p className="text-xs text-slate-500 mt-0.5">Supports .xlsx files up to 5 MB with header row</p>
                  </div>
                )}
              </div>
            </div>
            {fileError && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </p>
            )}
            <div className="pt-3 flex justify-end items-center gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="h-10 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={upload}
                disabled={busy || !file}
                className="h-10 px-5 rounded-xl bg-[#33077C] hover:bg-[#4309A2] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Upload Items</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
