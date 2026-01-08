import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
  status: 'normal' | 'warning' | 'critical';
  subText?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, unit, trend, status, subText }) => {
  const statusColors = {
    normal: 'border-l-4 border-green-500 bg-slate-800',
    warning: 'border-l-4 border-yellow-500 bg-slate-800',
    critical: 'border-l-4 border-red-500 bg-slate-800',
  };

  const textColors = {
    normal: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
  };

  return (
    <div className={`p-4 rounded shadow-md ${statusColors[status]} flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-slate-400 text-sm uppercase tracking-wider font-semibold">{title}</span>
        {trend && (
          <span className={`text-xs px-2 py-0.5 rounded-full bg-opacity-20 ${status === 'normal' ? 'bg-green-500 text-green-300' : status === 'warning' ? 'bg-yellow-500 text-yellow-300' : 'bg-red-500 text-red-300'}`}>
            {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${textColors[status]}`}>{value}</span>
        <span className="text-slate-500 text-xs">{unit}</span>
      </div>
      {subText && <div className="text-slate-500 text-xs mt-1">{subText}</div>}
    </div>
  );
};

export default KpiCard;