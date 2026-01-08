import React, { useState, useEffect } from 'react';
import { MOCK_AREAS } from '../constants';
import { getAreaTrend } from '../services/dataService';
import KpiCard from '../components/KpiCard';
import { AreaHistoricalData } from '../types';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AreaView: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState(MOCK_AREAS[0]);
  const [viewMode, setViewMode] = useState<'management' | 'engineering'>('management');
  
  // Data State
  const [trendData, setTrendData] = useState<AreaHistoricalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await getAreaTrend(selectedArea);
      setTrendData(data);
      setLoading(false);
    };
    fetchData();
  }, [selectedArea]);

  if (loading || trendData.length === 0) {
    return <div className="h-96 flex items-center justify-center text-slate-400 animate-pulse">Loading Area Analytics...</div>;
  }

  const currentData = trendData[trendData.length - 1]; // Latest hour
  
  // Calculated summaries for Management View
  const score = Math.round(currentData.healthScore);
  const prevScore = Math.round(trendData[trendData.length - 2]?.healthScore || score);
  const scoreDiff = score - prevScore;

  // Determine Overall Status
  let healthStatus: 'STABLE' | 'WARNING' | 'CRITICAL' = 'STABLE';
  if (score < 70) healthStatus = 'CRITICAL';
  else if (score < 90) healthStatus = 'WARNING';

  // --- Management View Components ---

  const ExecutiveHero = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Primary Signal: Network Health Index */}
      <div className={`
        relative p-6 rounded-xl flex flex-col justify-between overflow-hidden shadow-2xl
        ${healthStatus === 'STABLE' ? 'bg-gradient-to-br from-green-900 to-slate-900 border border-green-700' : ''}
        ${healthStatus === 'WARNING' ? 'bg-gradient-to-br from-yellow-900 to-slate-900 border border-yellow-700' : ''}
        ${healthStatus === 'CRITICAL' ? 'bg-gradient-to-br from-red-900 to-slate-900 border border-red-700' : ''}
      `}>
         <div className="z-10">
            <h3 className="text-slate-300 text-sm font-bold tracking-wider uppercase opacity-80">Network Health Index</h3>
            <div className="flex items-baseline mt-2">
               <span className="text-6xl font-black text-white">{score}</span>
               <span className="text-xl font-medium text-slate-300 ml-1">/ 100</span>
            </div>
            
            <div className={`inline-flex items-center px-3 py-1 mt-4 rounded-full text-sm font-bold ${
              healthStatus === 'STABLE' ? 'bg-green-500/20 text-green-300' : 
              healthStatus === 'WARNING' ? 'bg-yellow-500/20 text-yellow-300' : 
              'bg-red-500/20 text-red-300'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${
                healthStatus === 'STABLE' ? 'bg-green-400' : 
                healthStatus === 'WARNING' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></span>
              {healthStatus}
            </div>
         </div>

         {/* Trend Indicator */}
         <div className="absolute right-6 top-6 text-right z-10">
             <div className="text-xs text-slate-400">vs. Prior Period</div>
             <div className={`text-lg font-bold ${scoreDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {scoreDiff > 0 ? '▲' : scoreDiff < 0 ? '▼' : '-'} {Math.abs(scoreDiff)} pts
             </div>
         </div>

         {/* Decorative Background Graph */}
         <div className="absolute bottom-0 left-0 w-full h-24 opacity-20 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={trendData}>
                 <Area type="monotone" dataKey="healthScore" stroke="white" fill="white" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Risk Radar: 3 Key Pillars */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
         <RiskCard 
            title="Service Availability" 
            status={currentData.availability > 99.9 ? 'Normal' : 'Degraded'} 
            value={`${currentData.availability.toFixed(2)}%`}
            isCritical={currentData.availability <= 99.9}
         />
         <RiskCard 
            title="User Experience" 
            status={currentData.throughput > 25 ? 'Excellent' : currentData.throughput > 10 ? 'Fair' : 'Poor'} 
            value={`${currentData.throughput.toFixed(1)} Mbps`}
            isCritical={currentData.throughput <= 10}
         />
         <RiskCard 
            title="Network Capacity" 
            status={currentData.prbUtil < 70 ? 'Optimal' : currentData.prbUtil < 90 ? 'High Load' : 'Congested'} 
            value={`${currentData.prbUtil.toFixed(1)}% Load`}
            isCritical={currentData.prbUtil >= 90}
         />
      </div>
    </div>
  );

  const RiskCard = ({ title, status, value, isCritical }: { title: string, status: string, value: string, isCritical: boolean }) => (
    <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
       isCritical ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-slate-800 border-slate-700'
    }`}>
       <div>
         <h4 className="text-slate-400 text-xs font-bold uppercase mb-2">{title}</h4>
         <div className={`text-lg font-bold ${isCritical ? 'text-red-300' : 'text-slate-200'}`}>{status}</div>
       </div>
       <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
          <span className="text-slate-500 text-xs">Current Level</span>
          <span className="font-mono text-sm text-slate-300">{value}</span>
       </div>
    </div>
  );

  // --- Engineering View Components ---
  
  const EngineeringDashboard = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard 
          title="Avg PRB Util" 
          value={currentData.prbUtil.toFixed(1)} 
          unit="%" 
          status={currentData.prbUtil > 70 ? 'warning' : 'normal'}
        />
        <KpiCard 
          title="Active Users" 
          value={currentData.activeUsers.toLocaleString()} 
          unit="#" 
          status="normal"
        />
        <KpiCard 
          title="Avg Throughput" 
          value={currentData.throughput.toFixed(1)} 
          unit="Mbps" 
          status={currentData.throughput < 10 ? 'warning' : 'normal'}
        />
        <KpiCard 
          title="Availability" 
          value={currentData.availability.toFixed(3)} 
          unit="%" 
          status={currentData.availability < 99.9 ? 'warning' : 'normal'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-4 rounded-lg h-80 border border-slate-700 shadow-lg">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Traffic Load vs. Capacity (24H)</h3>
           <ResponsiveContainer width="100%" height="90%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={3} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }} />
              <Bar dataKey="prbUtil" fill="#8884d8" name="PRB Util %" radius={[2, 2, 0, 0]} />
              <Bar dataKey="activeUsers" fill="#3b82f6" name="Active Users" hide />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg h-80 border border-slate-700 shadow-lg">
           <h3 className="text-sm font-semibold text-slate-300 mb-4">Throughput Trend (Mbps)</h3>
           <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} interval={3} />
              <YAxis stroke="#94a3b8" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="throughput" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} name="DL Throughput" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
         <div className="flex items-center gap-4">
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Target Area</label>
                <select 
                    value={selectedArea} 
                    onChange={(e) => setSelectedArea(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white outline-none min-w-[200px]"
                >
                {MOCK_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
             </div>
         </div>

         {/* View Mode Toggle */}
         <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-600">
            <button
               onClick={() => setViewMode('management')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                   viewMode === 'management' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
               }`}
            >
               Management
            </button>
            <button
               onClick={() => setViewMode('engineering')}
               className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                   viewMode === 'engineering' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
               }`}
            >
               Engineering
            </button>
         </div>
      </div>

      {viewMode === 'management' ? (
        <div className="animate-fade-in-up">
            <ExecutiveHero />
            
            {/* 24H Health Trend Line (Executive Summary) */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-200">24H Performance Trend</h3>
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
                     Last Update: Today {currentData.hour}
                  </span>
               </div>
               
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                       <defs>
                          <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                             <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                       <XAxis dataKey="hour" stroke="#64748b" tickMargin={10} fontSize={12} interval={2} />
                       <YAxis stroke="#64748b" domain={[0, 100]} hide />
                       <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                          formatter={(val: number) => [val.toFixed(1), 'Score']}
                       />
                       <Area type="monotone" dataKey="healthScore" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
               
               {/* Auto-Generated Insight */}
               <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">AI Insight</h4>
                  <p className="text-sm text-slate-300">
                     {score > 90 
                       ? "Network performance is optimal. Capacity utilization is well-balanced with no significant anomalies detected in the last 24 hours."
                       : score > 70
                       ? "Moderate load detected during peak hours (19:00 - 22:00). Throughput dipped slightly but remains above Service Level Agreements (SLA)."
                       : "Critical congestion detected. High PRB utilization (>90%) is severely impacting user throughput. Immediate capacity expansion or load balancing recommended."}
                  </p>
               </div>
            </div>
        </div>
      ) : (
        <div className="animate-fade-in-up">
           <EngineeringDashboard />
           
           {/* Detailed Log Table (Engineering Only) */}
           <div className="mt-6 bg-slate-800 p-6 rounded-lg border border-slate-700">
               <h3 className="text-lg font-bold text-slate-200 mb-4">Engineering Summary</h3>
               <ul className="space-y-3 text-sm text-slate-300 font-mono">
                 <li className="flex items-start">
                   <span className="mr-2 text-green-400">●</span>
                   Area availability: {(currentData.availability).toFixed(3)}%.
                 </li>
                 <li className="flex items-start">
                   <span className={`mr-2 ${currentData.prbUtil > 80 ? 'text-yellow-400' : 'text-slate-400'}`}>●</span>
                   Peak Load: {Math.max(...trendData.map(d => d.prbUtil)).toFixed(1)}% at {trendData.find(d => d.prbUtil === Math.max(...trendData.map(t => t.prbUtil)))?.hour}.
                 </li>
                 <li className="flex items-start">
                   <span className="mr-2 text-slate-400">●</span>
                   Top offender cells: C-20192 (Interference), C-20193 (Overshoot).
                 </li>
               </ul>
           </div>
        </div>
      )}
    </div>
  );
};

export default AreaView;