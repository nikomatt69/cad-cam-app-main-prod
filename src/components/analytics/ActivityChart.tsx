// src/components/analytics/ActivityChart.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Loading from '@/src/components/ui/Loading';
import { Loader, AlertCircle } from 'react-feather';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartJSTooltip,
  Legend as ChartJSLegend,
  ChartData
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartJSTooltip,
  ChartJSLegend
);

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
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const fetchActivityData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.get('/api/analytics/chart', {
        timeout: 10000, // 10 second timeout
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        withCredentials: true
      });

      if (response.data) {
        setData(response.data);
      } else {
        throw new Error('No data received from the server');
      }
    } catch (err) {
      console.error('Error fetching activity data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chart data';
      setError(errorMessage);
      
      // Retry logic for specific errors
      if (retryCount < 3 && axios.isAxiosError(err) && (err.response?.status === 500 || !err.response)) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchActivityData();
        }, 2000 * Math.pow(2, retryCount)); // Exponential backoff
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col items-center">
          <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading chart data...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Unable to load chart
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => {
              setRetryCount(0);
              fetchActivityData();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
        </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart
              data={data}
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
              data={data}
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

export default ActivityChart;