import { useState, useMemo } from "react";
import axios from "axios";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

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

  const filteredAndSorted = useMemo(() => {
    let filtered = [...report];
    if (search) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      );
    }
    if (sortKey) {
      filtered.sort((a, b) => {
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
    return filtered;
  }, [report, search, sortKey, sortAsc]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">📈 LTV Report Generator</h1>

      <div className="flex gap-4 items-center mb-6">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="border p-2 rounded"
        />
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>

      {report.length > 0 && (
        <>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 p-2 border w-full max-w-md rounded"
          />

          <div className="overflow-x-auto border rounded bg-white p-4 shadow">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(report[0]).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-2 font-medium text-gray-600 cursor-pointer select-none"
                      onClick={() => handleSort(key)}
                    >
                      {key}
                      {sortKey === key ? (
                        sortAsc ? " 🔼" : " 🔽"
                      ) : (
                        ""
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    {Object.values(row).map((value, i) => (
                      <td key={i} className="px-4 py-2">{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
}

export default App;
