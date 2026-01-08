import React, { useState } from 'react';
import AreaView from './views/AreaView';
import ImsiView from './views/ImsiView';
import { setDataSource, getDataSource } from './services/dataService';
import { DataSourceMode } from './types';

// Simple Icons
const AreaIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);
const ImsiIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
);
const DatabaseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'area' | 'imsi'>('area');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(getDataSource());

  const handleToggleDataSource = () => {
    const newMode = dataSourceMode === 'mock' ? 'clickhouse' : 'mock';
    setDataSource(newMode);
    setDataSourceMode(newMode);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f172a] text-slate-200">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            TelcoInsight
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-widest">ENGINEERING DASHBOARD</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          <button
            onClick={() => setActiveTab('area')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'area' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <AreaIcon />
            <span className="font-medium">Area Monitor</span>
          </button>
          <button
            onClick={() => setActiveTab('imsi')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'imsi' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ImsiIcon />
            <span className="font-medium">Subscriber Analysis</span>
          </button>
        </nav>
        
        {/* Footer: System Status & Data Source */}
        <div className="p-6 mt-auto space-y-4">
           
           {/* Data Source Switch */}
           <div className="bg-slate-800 p-3 rounded border border-slate-700">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                  <DatabaseIcon /> DATA SOURCE
                </span>
                <button 
                  onClick={handleToggleDataSource}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${dataSourceMode === 'clickhouse' ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <span className={`${dataSourceMode === 'clickhouse' ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                </button>
             </div>
             <div className={`text-xs font-mono transition-colors ${dataSourceMode === 'clickhouse' ? 'text-blue-400' : 'text-slate-400'}`}>
               {dataSourceMode === 'clickhouse' ? '● CLICKHOUSE (SQL)' : '○ MOCK DATA'}
             </div>
             {dataSourceMode === 'clickhouse' && (
                <div className="text-[10px] text-slate-500 mt-1">
                   SQL generated in console
                </div>
             )}
           </div>

           <div className="bg-slate-800 p-3 rounded border border-slate-700">
             <div className="text-xs text-slate-500 font-bold mb-1">SYSTEM STATUS</div>
             <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-xs text-green-400">Live Tracing Active</span>
             </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'area' ? 'Area Network Performance' : 'Individual Subscriber Investigation'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === 'area' 
                ? 'Regional aggregated KPIs and congestion monitoring.' 
                : 'IMSI-level Root Cause Analysis (RCA) and QoE scoring.'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 flex flex-col items-end">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] mt-1 font-bold border ${dataSourceMode === 'clickhouse' ? 'border-blue-900 bg-blue-900/20 text-blue-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
              SOURCE: {dataSourceMode.toUpperCase()}
            </span>
          </div>
        </header>

        <div className="min-h-[500px]">
          {activeTab === 'area' ? <AreaView /> : <ImsiView />}
        </div>
      </main>
    </div>
  );
};

export default App;