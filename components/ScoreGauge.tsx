import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { SCORE_COLOR_MAP } from '../constants';

interface Props {
  score: number;
}

const ScoreGauge: React.FC<Props> = ({ score }) => {
  const color = SCORE_COLOR_MAP(score);
  const data = [
    { name: 'Score', value: score },
    { name: 'Remainder', value: 100 - score },
  ];

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={75}
            startAngle={180}
            endAngle={0}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell key="score" fill={color} />
            <Cell key="remainder" fill="#334155" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3 text-center">
        <div className="text-3xl font-bold text-white">{score}</div>
        <div className="text-xs text-slate-400">Health Score</div>
      </div>
    </div>
  );
};

export default ScoreGauge;