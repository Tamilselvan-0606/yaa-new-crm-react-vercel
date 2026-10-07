import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  FileSpreadsheet,
  Download,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SaleTransaction } from '../../../store/useSalesManagementStore';
import { exportTableToExcel } from '../../../utils/excelExport';
import { toast } from 'sonner';

interface SalesGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: SaleTransaction[];
}

type IntervalType = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export const SalesGraphModal: React.FC<SalesGraphModalProps> = ({
  isOpen,
  onClose,
  sales,
}) => {
  // Default range: from Jan 1 of current year to today (matches screenshot)
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [interval, setInterval] = useState<IntervalType>('Daily');

  // Generate chart data based on date range and interval
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Filter sales in range
    const validSales = sales.filter((s) => {
      const d = new Date(s.saleDate);
      return d >= start && d <= end;
    });

    if (interval === 'Daily') {
      // Create continuous daily points from start to end
      const map: Record<string, { date: string; sales: number; count: number }> = {};
      const cur = new Date(start);
      while (cur <= end) {
        const iso = cur.toISOString().split('T')[0];
        map[iso] = { date: iso, sales: 0, count: 0 };
        cur.setDate(cur.getDate() + 1);
      }

      validSales.forEach((s) => {
        if (map[s.saleDate]) {
          map[s.saleDate].sales += Number(s.grandTotal || 0);
          map[s.saleDate].count += 1;
        } else {
          map[s.saleDate] = {
            date: s.saleDate,
            sales: Number(s.grandTotal || 0),
            count: 1,
          };
        }
      });

      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
    }

    if (interval === 'Weekly') {
      const weeksMap: Record<string, { date: string; sales: number; count: number }> = {};
      validSales.forEach((s) => {
        const d = new Date(s.saleDate);
        const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        const key = `W${weekNum} (${d.getFullYear()})`;
        if (!weeksMap[key]) {
          weeksMap[key] = { date: key, sales: 0, count: 0 };
        }
        weeksMap[key].sales += Number(s.grandTotal || 0);
        weeksMap[key].count += 1;
      });
      return Object.values(weeksMap);
    }

    if (interval === 'Monthly') {
      const monthsMap: Record<string, { date: string; sales: number; count: number }> = {};
      // Initialize months in range
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cur <= endMonth) {
        const monthKey = cur.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        monthsMap[monthKey] = { date: monthKey, sales: 0, count: 0 };
        cur.setMonth(cur.getMonth() + 1);
      }

      validSales.forEach((s) => {
        const d = new Date(s.saleDate);
        const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        if (!monthsMap[monthKey]) {
          monthsMap[monthKey] = { date: monthKey, sales: 0, count: 0 };
        }
        monthsMap[monthKey].sales += Number(s.grandTotal || 0);
        monthsMap[monthKey].count += 1;
      });
      return Object.values(monthsMap);
    }

    if (interval === 'Yearly') {
      const yearsMap: Record<string, { date: string; sales: number; count: number }> = {};
      validSales.forEach((s) => {
        const d = new Date(s.saleDate);
        const yearKey = `${d.getFullYear()}`;
        if (!yearsMap[yearKey]) {
          yearsMap[yearKey] = { date: yearKey, sales: 0, count: 0 };
        }
        yearsMap[yearKey].sales += Number(s.grandTotal || 0);
        yearsMap[yearKey].count += 1;
      });
      return Object.values(yearsMap);
    }

    return [];
  }, [sales, startDate, endDate, interval]);

  // Export chart data to Excel
  const handleExportExcel = () => {
    if (chartData.length === 0) {
      toast.info('No data available in this date range.');
      return;
    }

    exportTableToExcel({
      filename: `Sales_Graph_${interval}_${startDate}_to_${endDate}`,
      sheetName: 'Sales Graph Data',
      title: `Sales Graph - ${interval} Trend (${startDate} to ${endDate})`,
      columns: [
        { header: 'Period / Date', key: 'date', width: 20 },
        { header: 'Sales Amount (₹)', key: 'sales', width: 22, type: 'currency' },
        { header: 'Invoices Count', key: 'count', width: 16, type: 'number' },
      ],
      data: chartData,
      summaryRow: {
        date: 'TOTAL',
        sales: chartData.reduce((acc, c) => acc + c.sales, 0),
        count: chartData.reduce((acc, c) => acc + c.count, 0),
      },
    });

    toast.success(`Exported ${chartData.length} records to Excel!`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Control Bar: Date Range (From - To) & Excel Export Icon & Close */}
        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-slate-700">
              <span className="text-slate-500 font-medium">From</span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8.5 px-2.5 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#2563EB] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-[13px] font-semibold text-slate-700">
              <span className="text-slate-500 font-medium">To</span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8.5 px-2.5 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-[#2563EB] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
              title="Download Excel Report"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Graph Card Section */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight">
              Sales Graph
            </h2>

            {/* Interval Tabs: Daily | Weekly | Monthly | Yearly */}
            <div className="flex items-center gap-6 text-xs sm:text-[13px] font-semibold">
              {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as IntervalType[]).map((tab) => {
                const isActive = interval === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInterval(tab)}
                    className={`pb-1 cursor-pointer transition-all ${
                      isActive
                        ? 'text-[#2563EB] border-b-2 border-[#2563EB] font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Line / Area Chart */}
          <div className="w-full h-[450px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 65 }}
              >
                <defs>
                  <linearGradient id="salesGraphGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="1 1"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9.5, fill: '#64748b' }}
                  interval={interval === 'Daily' ? Math.max(1, Math.floor(chartData.length / 40)) : 0}
                  angle={-55}
                  textAnchor="end"
                  height={60}
                  tickMargin={8}
                />
                <YAxis
                  tick={{ fontSize: 10.5, fill: '#64748b' }}
                  tickFormatter={(val) => `${val}`}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  formatter={(val: any) => [
                    `₹${Number(val || 0).toLocaleString('en-IN')}`,
                    'Sales Amount',
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '10px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#2563EB"
                  strokeWidth={1.75}
                  fill="url(#salesGraphGradient)"
                  dot={{ r: 1.5, fill: '#2563EB', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#1D4ED8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
