import React, { useState, useEffect } from 'react';
import { Shield, Lock, Terminal, Loader2, AlertTriangle, CheckCircle2, History, Clock, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [code, setCode] = useState('def example_vulnerability():\n    # Hardcoded credentials\n    secret_key = "AI_CORE_7782"\n    return secret_key');
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  
  const [activeTab, setActiveTab] = useState('new');
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isBackendOnline, setIsBackendOnline] = useState(null);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  /**
   * API Base URL 
   * This points directly to your live Render backend!
   */
  const getApiBase = () => {
    const deployedUrl = ""; 
    
    if (typeof window !== 'undefined' && 
       (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:8000';
    }
    return deployedUrl;
  };

  const API_BASE = getApiBase();

  const checkConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/`, { method: 'GET' }).catch(() => null);
      setIsBackendOnline(!!(response && response.ok));
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
      
      // 1. Force the UI to display the exact error string from the Python backend
      if (data && data.error) {
        throw new Error(data.error);
      }
      
      // 2. Catch default FastAPI HTTP exceptions
      if (data && data.detail) {
        throw new Error(typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
      }
      
      if (response.ok && data.audit_report) {
        setReport(String(data.audit_report));
        setStatus(String(data.db_status || 'Analysis Finalized'));
        setIsBackendOnline(true);
      } else {
        throw new Error("Engine returned an unrecognized format.");
      }
    } catch (err) {
      console.error("Audit failed:", err);
      
      // Catch the 404 Model error and provide a clear fix message
      let errMsg = err.message;
      if (errMsg.includes('404') && errMsg.includes('MODELS/')) {
        errMsg = "Model not found. Ensure backend main.py uses 'gemini-pro' or 'gemini-1.5-flash-latest' and redeploy Render.";
      }
      
      setStatus(`SYSTEM ERROR: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (isBackendOnline === false) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API_BASE}/history`);
      if (!response.ok) throw new Error('Database response failed');
      
      const data = await response.json();
      if (data && Array.isArray(data.history)) {
        // Fallback added for older MongoDB schemas (audit_report and code_submitted)
        const sanitized = data.history.map((item, idx) => ({
          id: String(item.id || item._id || idx),
          report: String(item.report || item.audit_report || ''),
          code: String(item.code || item.code_submitted || ''),
          time: item.time || new Date().toISOString()
        }));
        setHistoryList(sanitized);
        setIsBackendOnline(true);
      }
    } catch (err) {
      console.error("Archive fetch failed:", err);
      setIsBackendOnline(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000); 
    return () => clearInterval(interval);
  }, [API_BASE]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, isBackendOnline]);

  return (
    <div className={theme === 'dark' ? 'dark font-sans' : 'font-sans'}>
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-neutral-900 dark:text-neutral-100 p-4 md:p-8 transition-colors duration-500">
        
        <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-black dark:bg-white p-2.5 rounded-xl shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-800">
              <Shield className="w-5 h-5 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-[0.4em] uppercase leading-none mb-1">CodeGuard</h1>
              <div className="flex items-center gap-2 mt-1">
                {isBackendOnline === true ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Core Online
                  </span>
                ) : isBackendOnline === false ? (
                  <span className="flex items-center gap-1.5 text-[9px] font-bold text-red-500 uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Connecting...
                  </span>
                ) : (
                  <span className="text-[9px] text-neutral-400 animate-pulse uppercase tracking-widest">Linking...</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-xl p-1 border border-neutral-200 dark:border-neutral-800 shadow-inner">
              <button 
                onClick={() => { setActiveTab('new'); setReport(''); }}
                className={`px-6 py-2.5 text-[10px] font-black rounded-lg transition-all tracking-widest ${activeTab === 'new' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-md' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                AUDIT
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2.5 text-[10px] font-black rounded-lg transition-all tracking-widest ${activeTab === 'history' ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-md' : 'text-neutral-400 hover:text-neutral-600'}`}
              >
                LOGS
              </button>
            </div>
            <button onClick={toggleTheme} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm transition-all">
              {theme === 'dark' ? <Sun className="w-4 h-4 text-neutral-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-5">
            {activeTab === 'new' ? (
              <>
                <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl h-[500px] flex flex-col overflow-hidden transition-all duration-300">
                  <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                    <span className="text-[9px] font-black text-neutral-400 tracking-[0.2em] uppercase flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5" /> Source Terminal
                    </span>
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
                  className="w-full h-20 bg-black dark:bg-white text-white dark:text-black font-black rounded-3xl transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-20 uppercase tracking-[0.3em] text-[12px] active:scale-[0.98] hover:opacity-90 border-2 border-transparent dark:border-neutral-800 group"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Verifying</>
                  ) : (
                    <><Lock className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Execute Security Audit</>
                  )}
                </button>
                
                {status && (
                  <div className={`p-4 rounded-xl border text-[10px] font-bold text-center uppercase tracking-widest transition-all ${String(status).toLowerCase().includes('error') ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 text-red-500' : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 shadow-sm'}`}>
                    {String(status)}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl h-[612px] flex flex-col overflow-hidden">
                <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-neutral-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black tracking-[0.2em] uppercase">Archive Database</span>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {loadingHistory ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="w-6 h-6 animate-spin opacity-10" /></div>
                  ) : historyList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-300 dark:text-neutral-800 gap-3 opacity-30">
                      <AlertTriangle className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Void Log</span>
                    </div>
                  ) : (
                    historyList.map((item, idx) => (
                      <div 
                        key={item.id} 
                        onClick={() => {
                           setReport(String(item.report));
                           setCode(String(item.code));
                        }}
                        className="p-5 border-b border-neutral-50 dark:border-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900 cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-black dark:hover:border-l-white group"
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black text-neutral-900 dark:text-white uppercase tracking-tighter">Record Entry #{historyList.length - idx}</span>
                          <span className="text-[9px] font-mono opacity-30 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded uppercase leading-none">{new Date(item.time).toLocaleDateString()}</span>
                        </div>
                        <div className="text-[11px] font-mono opacity-40 truncate bg-neutral-50/50 dark:bg-black/40 p-1.5 rounded border border-neutral-100 dark:border-neutral-800">{item.code}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl flex flex-col h-[612px] overflow-hidden">
            <div className="bg-neutral-50/50 dark:bg-neutral-900/40 px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[9px] font-black text-neutral-400 tracking-[0.2em] uppercase flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Intel Analysis
              </span>
              {report && (
                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full uppercase border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" /> Signed
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {report ? (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-neutral">
                  <ReactMarkdown>{String(report)}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-200 dark:text-neutral-800 gap-5 text-center transition-all opacity-30">
                  <Shield className="w-16 h-16 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.5em]">System Standby</p>
                </div>
              )}
            </div>
          </div>
          
        </main>
      </div>
    </div>
  );
}