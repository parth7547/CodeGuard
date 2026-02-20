import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Terminal, Loader2, AlertTriangle, CheckCircle2, History, Code2, Clock, Sun, Moon, Wifi, WifiOff, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [code, setCode] = useState('def example_vulnerability():\n    # Hardcoded credentials\n    secret_key = "AI_CORE_7782"\n    return secret_key');
  const [report, setReport] = useState('');
  const [displayedReport, setDisplayedReport] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  // History & System states
  const [activeTab, setActiveTab] = useState('new');
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isBackendOnline, setIsBackendOnline] = useState(null);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  // SMART API URL: Automatically uses Render when on Vercel, and localhost when on your PC
  const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : 'https://codeguard-backend-bubs.onrender.com';

  // --- SAFE RECURSIVE TYPING EFFECT ---
  useEffect(() => {
    let isCancelled = false;
    let i = 0;
    
    setDisplayedReport("");

    const tick = () => {
      if (isCancelled || !report || typeof report !== 'string') return;
      
      if (i <= report.length) {
        setDisplayedReport(report.substring(0, i));
        i++;
        setTimeout(tick, 5);
      }
    };

    if (report) {
      tick();
    }

    return () => {
      isCancelled = true;
    };
  }, [report]);

  // --- PDF EXPORT ---
  const downloadAuditPDF = () => {
    if (!report || typeof report !== 'string') return;
    
    const runGeneration = () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const timestamp = new Date().toLocaleString();
        
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("CODEGUARD SECURITY AUDIT", 20, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${timestamp}`, 20, 30);
        doc.text(`System Version: SEC-OPS v1.5`, 20, 35);
        
        doc.setLineWidth(0.5);
        doc.line(20, 40, 190, 40);
        
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        const splitReport = doc.splitTextToSize(report, 170);
        doc.text(splitReport, 20, 50);
        
        doc.save(`CodeGuard_Audit_${Date.now()}.pdf`);
      } catch (err) {
        console.error("PDF Export Error:", err);
        setStatus("Error: PDF Export failed.");
      }
    };

    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = runGeneration;
      document.head.appendChild(script);
    } else {
      runGeneration();
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/`, { method: 'GET' }).catch(() => null);
      setIsBackendOnline(response ? response.ok : false);
    } catch {
      setIsBackendOnline(false);
    }
  };

  const handleAnalyze = async () => {
    if (!code || typeof code !== 'string' || !code.trim()) {
      setStatus('Action Required: Input logic for analysis.');
      return;
    }

    setLoading(true);
    setStatus('SEC-OPS: Analyzing heuristics...');
    setReport(''); 
    
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: String(code) })
      });
      
      const data = await response.json();
      
      if (response.ok && data && data.audit_report) {
        setReport(String(data.audit_report));
        setStatus(String(data.db_status || 'Analysis Finalized'));
        setIsBackendOnline(true);
      } else {
        throw new Error(data.error || "Invalid response from server");
      }
    } catch (err) {
      console.error("Audit Execution Error:", err);
      setIsBackendOnline(false);
      setStatus(`System Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (isBackendOnline === false) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/history`);
      if (!response.ok) throw new Error('DB_FETCH_FAILURE');
      const data = await response.json();
      if (data && Array.isArray(data.history)) {
        const sanitized = data.history.map((item, idx) => ({
          id: String(item.id || item._id || idx),
          report: String(item.report || ''),
          code: String(item.code || ''),
          time: item.time || new Date().toISOString()
        }));
        setHistoryList(sanitized);
        setIsBackendOnline(true);
      }
    } catch (err) {
      console.error("History fetch failed:", err);
      setIsBackendOnline(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, isBackendOnline]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 font-sans p-4 md:p-8 transition-colors duration-500 selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
        
        {/* Header */}
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-black dark:bg-white p-2.5 rounded-xl shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-800 transition-transform hover:scale-105">
              <Shield className="w-5 h-5 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-[0.4em] uppercase leading-none mb-1">CodeGuard</h1>
              <div className="flex items-center gap-2">
                {isBackendOnline === true ? (
                  <span className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SYSTEM LINKED
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[8px] font-bold text-red-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> OFFLINE MODE
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-xl p-1 border border-neutral-200 dark:border-neutral-800 shadow-inner">
              <button 
                onClick={() => { setActiveTab('new'); setReport(''); setDisplayedReport(''); }} 
                className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest ${activeTab === 'new' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-md' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                AUDIT
              </button>
              <button 
                onClick={() => { setActiveTab('history'); setReport(''); setDisplayedReport(''); }} 
                className={`px-6 py-2 text-[10px] font-black rounded-lg transition-all tracking-widest ${activeTab === 'history' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-md' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                LOGS
              </button>
            </div>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-transform active:scale-90">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-neutral-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Input Side */}
          <div className="flex flex-col gap-4">
            {activeTab === 'new' ? (
              <>
                <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl h-[500px] flex flex-col overflow-hidden transition-all duration-300">
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[9px] font-black text-neutral-400 tracking-[0.2em] uppercase flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5" /> Source Terminal
                    </span>
                    <span className="text-[8px] font-mono text-neutral-300 uppercase">SEC-OPS_882</span>
                  </div>
                  <textarea
                    className="flex-1 w-full bg-transparent p-6 font-mono text-sm focus:outline-none resize-none placeholder:text-neutral-300 dark:placeholder:text-neutral-700 leading-relaxed scrollbar-hide"
                    placeholder="// Paste source code for automated audit..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={handleAnalyze} 
                  disabled={loading || isBackendOnline === false} 
                  className="w-full h-20 bg-black dark:bg-white text-white dark:text-black font-black rounded-2xl transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-20 uppercase tracking-[0.3em] text-[12px] active:scale-[0.98] hover:opacity-90 border-2 border-transparent dark:border-neutral-800 group"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> VERIFYING</>
                  ) : (
                    <><Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" /> EXECUTE SECURITY AUDIT</>
                  )}
                </button>
                
                {status && (
                  <div className={`p-4 rounded-xl border text-[10px] font-bold text-center uppercase tracking-widest transition-all ${String(status).toLowerCase().includes('error') ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-500' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 shadow-sm'}`}>
                    {String(status)}
                  </div>
                )}
              </>
            ) : (
              /* Logs Side */
              <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl h-[632px] flex flex-col overflow-hidden transition-all duration-300">
                <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-neutral-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase">Archive Database</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {loadingHistory ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="w-6 h-6 animate-spin opacity-10" /></div>
                  ) : historyList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-800 gap-3 opacity-50">
                      <AlertTriangle className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">VOID DATABASE</span>
                    </div>
                  ) : (
                    historyList.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => { 
                          setReport(item.report); 
                          setCode(item.code); 
                        }} 
                        className="p-5 border-b border-neutral-50 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-black dark:hover:border-l-white group"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black text-neutral-900 dark:text-white group-hover:underline uppercase tracking-tighter">Record Entry</span>
                          <span className="text-[9px] font-mono opacity-30 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded uppercase leading-none">
                            {new Date(item.time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono opacity-40 truncate bg-neutral-50/50 dark:bg-black/40 p-1.5 rounded border border-neutral-100 dark:border-neutral-800">
                          {item.code.substring(0, 100)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Report Side */}
          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl flex flex-col h-[632px] overflow-hidden transition-all duration-300">
            <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[9px] font-black text-neutral-400 tracking-[0.2em] uppercase flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Intel Analysis
              </span>
              <div className="flex items-center gap-2">
                {report && (
                  <>
                    <button 
                      onClick={downloadAuditPDF}
                      className="flex items-center gap-1.5 text-[9px] font-black text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-700 shadow-sm active:scale-95"
                    >
                      <Download className="w-3 h-3" /> PDF
                    </button>
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-full uppercase border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                      <CheckCircle2 className="w-3 h-3" /> SIGNED
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {displayedReport ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-neutral transition-all">
                  <ReactMarkdown 
                    className="prose-headings:font-bold prose-code:bg-neutral-100 dark:prose-code:bg-neutral-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-neutral-50 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800"
                  >
                    {displayedReport}
                  </ReactMarkdown>
                  {displayedReport.length < report.length && (
                    <span className="inline-block w-2 h-4 bg-neutral-400 dark:bg-neutral-600 animate-pulse ml-1 align-middle" />
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-200 dark:text-neutral-800 gap-5 text-center transition-all opacity-30">
                  <Shield className="w-16 h-16 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">SYSTEM STANDBY</p>
                </div>
              )}
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}