import React, { useState, useEffect } from 'react';
import { DailyImsiStats, ImsiCellUsage, SignalingEvent } from '../types';
import { getImsiTrend, getProblemCells, getImsiGeoTrace } from '../services/dataService';
import { calculateHealthScore } from '../utils/scoringUtils';
import KpiCard from '../components/KpiCard';
import ScoreGauge from '../components/ScoreGauge';
import TrendChart from '../components/TrendChart';
import GeoMap from '../components/GeoMap';

const ImsiView: React.FC = () => {
  const [imsiInput, setImsiInput] = useState('466921234567890');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DailyImsiStats | null>(null);
  const [trend, setTrend] = useState<DailyImsiStats[]>([]);
  const [problemCells, setProblemCells] = useState<ImsiCellUsage[]>([]);
  const [geoEvents, setGeoEvents] = useState<SignalingEvent[]>([]);
  const [breakdown, setBreakdown] = useState<any>(null);

  const handleSearch = async () => {
    setLoading(true);
    
    try {
      // 1. Fetch Trend (Async)
      const trendData = await getImsiTrend(imsiInput, new Date(selectedDate));
      setTrend(trendData);

      // 2. Get current day stats (last one in trend)
      const currentStats = trendData[trendData.length - 1];
      setStats(currentStats);

      // 3. Calc Breakdown
      const bd = calculateHealthScore(currentStats);
      setBreakdown(bd);

      // 4. Get Problem Cells (Async)
      const cells = await getProblemCells(imsiInput, selectedDate);
      setProblemCells(cells);

      // 5. Get Geo Trace (Async)
      const trace = await getImsiGeoTrace(imsiInput, selectedDate);
      setGeoEvents(trace);

    } catch (e) {
      console.error("Failed to fetch IMSI data", e);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Search Bar */}
      <div className="bg-slate-800 p-4 rounded-lg flex flex-wrap gap-4 items-end shadow-lg border border-slate-700">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Target IMSI</label>
          <input 
            type="text" 
            value={imsiInput} 
            onChange={(e) => setImsiInput(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white font-mono focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Analysis Date</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
          />
        </div>
        <button 
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition-colors"
        >
          ANALYZE
        </button>
      </div>

      {loading && <div className="text-center py-10 text-blue-400">Processing Network Traces & Geospatial Data...</div>}

      {!loading && stats && breakdown && (
        <>
          {/* Top Section: Health Score & Critical KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Card */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <h2 className="text-lg font-bold text-slate-200 mb-4 self-start w-full border-b border-slate-700 pb-2">IMSI Health Score</h2>
              <div className="flex items-center gap-6">
                <ScoreGauge score={breakdown.totalScore} />
                <div className="text-sm space-y-2">
                  <div className="flex justify-between w-40">
                    <span className="text-slate-400">Connectivity</span>
                    <span className={breakdown.connectivityScore < 70 ? 'text-red-400' : 'text-green-400'}>{breakdown.connectivityScore}</span>
                  </div>
                  <div className="flex justify-between w-40">
                    <span className="text-slate-400">Experience</span>
                    <span className={breakdown.experienceScore < 70 ? 'text-red-400' : 'text-green-400'}>{breakdown.experienceScore}</span>
                  </div>
                  <div className="flex justify-between w-40">
                    <span className="text-slate-400">Radio Load</span>
                    <span className={breakdown.radioScore < 70 ? 'text-red-400' : 'text-green-400'}>{breakdown.radioScore}</span>
                  </div>
                </div>
              </div>
              
              {breakdown.topDetractors.length > 0 && (
                <div className="mt-4 w-full bg-red-900/20 p-3 rounded border border-red-900/50">
                  <div className="text-xs text-red-300 font-bold mb-1">PRIMARY DETRACTORS:</div>
                  <div className="text-sm text-red-200">
                    {breakdown.topDetractors.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Critical KPI Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard 
                title="Avg DL TP" 
                value={stats.avgDlTp.toFixed(1)} 
                unit="Mbps" 
                status={stats.avgDlTp < 5 ? 'critical' : stats.avgDlTp < 10 ? 'warning' : 'normal'}
                trend="flat"
              />
              <KpiCard 
                title="RRC Drop" 
                value={stats.rrcDropRate.toFixed(2)} 
                unit="%" 
                status={stats.rrcDropRate > 5 ? 'critical' : stats.rrcDropRate > 2 ? 'warning' : 'normal'}
              />
              <KpiCard 
                title="Latency" 
                value={stats.latencyP95.toFixed(0)} 
                unit="ms" 
                status={stats.latencyP95 > 100 ? 'critical' : stats.latencyP95 > 50 ? 'warning' : 'normal'}
              />
              <KpiCard 
                title="Packet Loss" 
                value={stats.pktLoss.toFixed(2)} 
                unit="%" 
                status={stats.pktLoss > 3 ? 'critical' : stats.pktLoss > 1 ? 'warning' : 'normal'}
              />
              <KpiCard 
                title="Serving PRB" 
                value={stats.servingCellPrb.toFixed(0)} 
                unit="%" 
                status={stats.servingCellPrb > 90 ? 'critical' : stats.servingCellPrb > 70 ? 'warning' : 'normal'}
                subText="Radio Load"
              />
              <KpiCard 
                title="Congestion" 
                value={stats.servingCellCongestion.toFixed(1)} 
                unit="%" 
                status={stats.servingCellCongestion > 15 ? 'critical' : stats.servingCellCongestion > 5 ? 'warning' : 'normal'}
              />
            </div>
          </div>

          {/* Trend Section (Full Width) */}
          <TrendChart data={trend} />

          {/* Root Cause / Cell Analysis Section */}
          <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-200">Top-N Problem Cell Analysis</h3>
              <span className="text-xs text-slate-500">Sorted by Impact Score (Stay Time × Load × Quality)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900">
                  <tr>
                    <th className="px-6 py-3">Cell / Site ID</th>
                    <th className="px-6 py-3">Stay Ratio</th>
                    <th className="px-6 py-3 text-center">Problem Score</th>
                    <th className="px-6 py-3">Key Metric (Abnormal)</th>
                    <th className="px-6 py-3">Root Cause Category</th>
                  </tr>
                </thead>
                <tbody>
                  {problemCells.map((cell, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-mono font-medium">
                        <div>{cell.cellId}</div>
                        <div className="text-xs text-slate-500">{cell.siteId}</div>
                      </td>
                      <td className="px-6 py-4">
                        {(cell.stayRatio * 100).toFixed(1)}%
                        <div className="text-xs text-slate-500">{(cell.stayTimeSec / 60).toFixed(0)} min</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded font-bold ${cell.problemScore > 0.4 ? 'bg-red-500/20 text-red-300' : 'bg-slate-600/20 text-slate-400'}`}>
                          {cell.problemScore.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cell.prbDlUtil > 80 && <div className="text-red-400">PRB: {cell.prbDlUtil.toFixed(0)}%</div>}
                        {cell.avgDlTp < 5 && <div className="text-yellow-400">TP: {cell.avgDlTp.toFixed(1)} Mbps</div>}
                        {cell.rrcDropRate > 2 && <div className="text-red-400">Drop: {cell.rrcDropRate.toFixed(2)}%</div>}
                        {cell.problemType === 'None' && <div className="text-green-500">Normal</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border 
                          ${cell.problemType === 'Load' ? 'border-orange-500 text-orange-400' : 
                            cell.problemType === 'Quality' ? 'border-yellow-500 text-yellow-400' :
                            cell.problemType === 'Coverage' ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'}`}>
                          {cell.problemType === 'None' ? 'HEALTHY' : cell.problemType.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Engineering Conclusion Helper */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-700">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Automated Engineering Conclusion</h4>
              <p className="text-sm text-slate-300">
                {breakdown.totalScore > 80 
                  ? "✅ IMSI indicates healthy performance. Any complaints may be subjective or device-specific."
                  : breakdown.radioScore < 60 && problemCells.some(c => c.problemType === 'Load')
                  ? "⚠️ Dominant Issue: RAN Congestion. High PRB Utilization in top serving cells correlates with throughput degradation."
                  : breakdown.connectivityScore < 60
                  ? "⚠️ Dominant Issue: Stability. High RRC Drop/Failure rates detected independent of cell load. Investigate RF coverage or interference."
                  : "⚠️ Mixed degradation detected. Please correlate with Area Level KPIs."
                }
              </p>
            </div>
          </div>

          {/* Geo-Spatial Map Section (Moved to Bottom) */}
          <div className="bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-700">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-semibold text-slate-300">Call Trace Geospatial Analysis</h3>
               <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-600">
                 Events: {geoEvents.length} | Outliers: {geoEvents.filter(e => e.isOutlier).length}
               </span>
            </div>
            <div className="min-h-[600px] h-full">
              <GeoMap events={geoEvents} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ImsiView;