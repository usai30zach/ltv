import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { unparse } from "papaparse";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setReport(res.data.data);
      setOrders(res.data.orders);
    } catch (err: any) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filtered = useMemo(() => {
    let data = [...report];
    if (search) {
      data = data.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    if (sortKey) {
      data.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortAsc ? aNum - bNum : bNum - aNum;
        }
        return sortAsc
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [report, search, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedData = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getPaginationPages = () => {
    const totalNumbers = 5;
    const pages: (number | string)[] = [];
    if (totalPages <= totalNumbers) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(1, currentPage - 1);
      const right = Math.min(totalPages, currentPage + 1);
      if (left > 1) pages.push(1, "...");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < totalPages) pages.push("...", totalPages);
    }
    return pages;
  };

  const getCustomerGroupedOrders = (customerId: string) => {
    if (!orders || !Array.isArray(orders)) return { summary: [], totalTransactions: 0 };

    // const customerOrders = orders.filter(o => o["Customer"].trim().toLowerCase() === customerId.trim().toLowerCase());
    const customerOrders = orders.filter(o =>
      o["Customer"]?.toString().trim().toLowerCase() === customerId?.toString().trim().toLowerCase()
    );
    
    const grouped: Record<string, { orders: string[], dates: string[], revenue: number, salesReps: string[], csrs: string[], estimators: string[], creators: string[] }> = {};

    customerOrders.forEach(order => {
      const date = new Date(order["Sales Order Date"]);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[key]) {
        grouped[key] = { orders: [], dates: [], revenue: 0, salesReps: [], csrs: [], estimators: [], creators: [] };
      }
      grouped[key].orders.push(order["SO#"]);
      grouped[key].dates.push(order["Sales Order Date"]);
      grouped[key].revenue += parseFloat(order["Total"] || "0");
      grouped[key].salesReps.push(order["Sales Rep"] || "");
      grouped[key].csrs.push(order["CSR"] || "");
      grouped[key].estimators.push(order["Estimator"] || "");
      grouped[key].creators.push(order["Created By"] || "");
    });

    const summary = Object.entries(grouped).map(([month, group]) => ({
      month,
      transactionCount: group.orders.length,
      totalSales: group.revenue,
      orderList: group.orders,
      dates: group.dates,
      salesReps: Array.from(new Set(group.salesReps)),
      csrs: Array.from(new Set(group.csrs)),
      estimators: Array.from(new Set(group.estimators)),
      creators: Array.from(new Set(group.creators)),
    }));

    const totalTransactions = summary.reduce((acc, row) => acc + row.transactionCount, 0);

    return { summary, totalTransactions };
  };


  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">📊 LTV Report Dashboard</h1>

      <div className="mb-6 flex gap-4 flex-wrap items-center">
        <input type="file" onChange={handleFileChange} />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Uploading..." : "Upload CSV"}
        </button>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <label className="flex items-center gap-2">
          Rows:
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {[5, 10, 20, 50].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {report.length > 0 && (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-200">
              <tr>
                {Object.keys(report[0]).map((key) => (
                  <th
                    key={key}
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => handleSort(key)}
                  >
                    {key} {sortKey === key ? (sortAsc ? "🔼" : "🔽") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedCustomer(row)}
                >
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="px-4 py-2">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div>Page {currentPage} of {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Prev</button>
            {getPaginationPages().map((page, i) => (
              <button
                key={i}
                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                disabled={page === '...'}
                className={page === currentPage ? "font-bold text-blue-600" : ""}
              >
                {page}
              </button>
            ))}
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4 text-blue-700">
              Transaction History: {selectedCustomer.CustomerID || selectedCustomer.Customer}
            </h2>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getCustomerGroupedOrders(selectedCustomer.CustomerID).summary}
                  dataKey="transactionCount"
                  nameKey="month"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {getCustomerGroupedOrders(selectedCustomer.CustomerID).summary.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <table className="min-w-full text-sm text-left mt-6">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2">Month</th>
                  <th className="px-4 py-2">Transactions</th>
                  <th className="px-4 py-2">Total Sales</th>
                  <th className="px-4 py-2">SO#</th>
                  <th className="px-4 py-2">Dates</th>
                  <th className="px-4 py-2">Sales Rep</th>
                  <th className="px-4 py-2">Estimator</th>
                  <th className="px-4 py-2">CSR</th>
                  <th className="px-4 py-2">Created By</th>
                </tr>
              </thead>
              <tbody>
                {getCustomerGroupedOrders(selectedCustomer.CustomerID).summary.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-2">{row.month}</td>
                    <td className="px-4 py-2">{row.transactionCount}</td>
                    <td className="px-4 py-2">${row.totalSales.toFixed(2)}</td>
                    <td className="px-4 py-2">{row.orderList.join(", ")}</td>
                    <td className="px-4 py-2">{row.dates.join(", ")}</td>
                    <td className="px-4 py-2">{row.salesReps.join(", ")}</td>
                    <td className="px-4 py-2">{row.estimators.join(", ")}</td>
                    <td className="px-4 py-2">{row.csrs.join(", ")}</td>
                    <td className="px-4 py-2">{row.creators.join(", ")}</td>
                  </tr>
                ))}
                <tr className="font-semibold border-t">
                  <td className="px-4 py-2">Total Transactions</td>
                  <td className="px-4 py-2" colSpan={8}>{getCustomerGroupedOrders(selectedCustomer.CustomerID).totalTransactions}</td>
                </tr>
              </tbody>
            </table>

            <div className="text-right">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
