import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SystemOverviewChartProps {
  data: {
    users: number;
    agencies: number;
    trips: number;
    bookings: number;
  };
}

const SystemOverviewChart: React.FC<SystemOverviewChartProps> = ({ data }) => {
  const chartData = [
    {
      name: 'Users',
      count: data.users,
      fill: '#3b82f6',
    },
    {
      name: 'Agencies',
      count: data.agencies,
      fill: '#10b981',
    },
    {
      name: 'Trips',
      count: data.trips,
      fill: '#8b5cf6',
    },
    {
      name: 'Bookings',
      count: data.bookings,
      fill: '#f59e0b',
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SystemOverviewChart;
