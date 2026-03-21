import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AgencyStatusChartProps {
  active: number;
  suspended: number;
}

const AgencyStatusChart: React.FC<AgencyStatusChartProps> = ({ active, suspended }) => {
  const data = [
    { name: 'Active', value: active },
    { name: 'Suspended', value: suspended },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default AgencyStatusChart;
