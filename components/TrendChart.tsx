import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DailyImsiStats } from '../types';

interface Props {
  data: DailyImsiStats[];
}

const TrendChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="h-64 w-full bg-slate-800 p-4 rounded-lg">
      <h3 className="text-sm font-semibold text-slate-300 mb-4">IMSI 七日品質趨勢 (Score & Throughput)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.slice(5)} />
          <YAxis yAxisId="left" stroke="#8884d8" fontSize={12} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Area yAxisId="left" type="monotone" dataKey="healthScore" stroke="#8884d8" fillOpacity={1} fill="url(#colorScore)" name="Health Score" />
          <Area yAxisId="right" type="monotone" dataKey="avgDlTp" stroke="#82ca9d" fillOpacity={1} fill="url(#colorTp)" name="Avg DL TP (Mbps)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;