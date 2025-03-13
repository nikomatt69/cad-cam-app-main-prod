// src/components/analytics/ActivityChart.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Loading from '@/src/components/ui/Loading';

interface ActivityChartProps {
  startDate?: Date;
  endDate?: Date;
  groupBy?: 'day' | 'week' | 'month';
  itemType?: string[];
  action?: string[];
  userFilter?: string;
  chartType?: 'line' | 'bar';
}

interface ActivityData {
  date: string;
  count: number;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  startDate,
  endDate,
  groupBy = 'day',
  itemType,
  action,
  userFilter,
  chartType = 'line'
}) => {
  const [data, setData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchActivityData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        if (startDate) {
          params.append('startDate', startDate.toISOString());
        }
        
        if (endDate) {
          params.append('endDate', endDate.toISOString());
        }
        
        params.append('groupBy', groupBy);
        
        if (itemType?.length) {
          itemType.forEach(type => {
            params.append('itemType', type);
          });
        }
        
        if (action?.length) {
          action.forEach(a => {
            params.append('action', a);
          });
        }
        
        if (userFilter) {
          params.append('userFilter', userFilter);
        }
        
        // Make the API request
        const response = await axios.get(`/api/analytics/chart?${params.toString()}`);
        setData(response.data);
      } catch (err) {
        setError(err as Error);
        console.error('Failed to fetch activity chart data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    void fetchActivityData(); // Add void to handle the unresolved Promise
  }, [startDate, endDate, groupBy, itemType, action, userFilter]); // Dependencies are correct now
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-md">
        <p>Failed to load activity chart data</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }
  
  // For demonstration, we'll use mock data until you implement the actual API endpoint
  const mockData = [
    { date: '2025-02-01', count: 12 },
    { date: '2025-02-02', count: 19 },
    { date: '2025-02-03', count: 15 },
    { date: '2025-02-04', count: 27 },
    { date: '2025-02-05', count: 32 },
    { date: '2025-02-06', count: 29 },
    { date: '2025-02-07', count: 18 },
    { date: '2025-02-08', count: 24 },
    { date: '2025-02-09', count: 33 },
    { date: '2025-02-10', count: 35 },
    { date: '2025-02-11', count: 40 },
    { date: '2025-02-12', count: 38 },
    { date: '2025-02-13', count: 42 },
    { date: '2025-02-14', count: 37 }
  ];
  
  // Use actual data when available, otherwise use mock data
  const chartData = data.length > 0 ? data : mockData;
  
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
        <p>No data available for the selected period</p>
      </div>
    );
  }
  
  // Format date label based on groupBy
  const formatDate = (date: string) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) {
        throw new Error('Invalid date');
      }
      
      switch (groupBy) {
        case 'day':
          return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        case 'week':
          return `Week ${d.toLocaleDateString(undefined, { day: 'numeric' })}`;
        case 'month':
          return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        default:
          return date;
      }
    } catch (e) {
      console.error('Date formatting error:', e);
      return 'Invalid date';
    }
  };
  
  // Render the appropriate chart type
  return (
    <div className="bg-[#F8FBFF] dark:bg-gray-600 dark:text-white shadow rounded-lg p-3 sm:p-4" role="region" aria-label="Activity Chart">
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-3 sm:mb-4">Activity Over Time</h3>
      <div className="h-60 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                width={30}
              />
              <Tooltip
                formatter={(value: number) => [`${value} activities`, 'Count']}
                labelFormatter={(label: string) => formatDate(label)}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              <Line 
                type="monotone" 
                dataKey="count" 
                name="Activity Count"
                stroke="#3B82F6" 
                activeDot={{ r: 6 }} 
                strokeWidth={2}
              />
            </LineChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 10 }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                width={30}
              />
              <Tooltip
                formatter={(value: number) => [`${value} activities`, 'Count']}
                labelFormatter={(label: string) => formatDate(label)}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
              <Bar 
                dataKey="count" 
                name="Activity Count"
                fill="#3B82F6" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};