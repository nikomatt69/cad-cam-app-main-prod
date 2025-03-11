// src/components/analytics/AnalyticsOverview.tsx
import React from 'react';
import { useAnalytics } from '@/src/hooks/useAnalytics';
import { Activity, Users, Eye, FileText, Tool, Database } from 'react-feather';
import Loading from '@/src/components/ui/Loading';
import { ActivityCard } from './ActivityCard';
import { StatCard } from './StatCard';
import { ActivityItemType } from '@/src/lib/activityTracking';

interface AnalyticsOverviewProps {
  startDate?: Date;
  endDate?: Date;
  userFilter?: string;
  isAdmin?: boolean;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  startDate,
  endDate,
  userFilter,
  isAdmin = false
}) => {
  const { data, isLoading, error } = useAnalytics({
    startDate,
    endDate,
    userFilter,
    groupBy: 'day'
  });
  
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
        <p>Failed to load analytics data</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md">
        <p>No analytics data available</p>
      </div>
    );
  }
  
  // Group activity by type
  const activityByType = data.statistics.countByType.reduce((acc: Record<string, number>, item: any) => {
    acc[item.itemType] = item._count;
    return acc;
  }, {});
  
  // Group activity by action
  const activityByAction = data.statistics.countByAction.reduce((acc: Record<string, number>, item: any) => {
    acc[item.action] = item._count;
    return acc;
  }, {});
  
  // Calculate total activity count
  const totalActivityCount = (Object.values(activityByType) as number[]).reduce((sum, count) => sum + count, 0);
  
  // Map icons to activity types
  const getIcon = (type: ActivityItemType) => {
    switch (type) {
      case 'project':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'component':
        return <Database className="h-8 w-8 text-green-500" />;
      case 'tool':
        return <Tool className="h-8 w-8 text-orange-500" />;
      case 'page_view':
        return <Eye className="h-8 w-8 text-purple-500" />;
      default:
        return <Activity className="h-8 w-8 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Activity"
          value={totalActivityCount}
          icon={<Activity className="h-10 w-10 text-blue-500" />}
          change={10} // Replace with actual change percentage
          changeLabel="vs. previous period"
        />
        
        <StatCard
          title="Active Users"
          value={data.activeUsers.length}
          icon={<Users className="h-10 w-10 text-green-500" />}
          change={5} // Replace with actual change percentage
          changeLabel="from last month"
        />
        
        {isAdmin && (
          <StatCard
            title="Total Users"
            value={data.userCount}
            icon={<Users className="h-10 w-10 text-purple-500" />}
          />
        )}
        
        <StatCard
          title="Page Views"
          value={activityByType['page_view'] || 0}
          icon={<Eye className="h-10 w-10 text-indigo-500" />}
          change={3} // Replace with actual change percentage
          changeLabel="from last week"
        />
      </div>
      
      <div className="bg-[#F8FBFF] dark:bg-gray-600 dark:text-white shadow rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(activityByType)
            .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
            .map(([type, count]) => (
              <ActivityCard
                key={type}
                title={type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                count={count as number}
                icon={getIcon(type as ActivityItemType)}
              />
            ))
          }
        </div>
      </div>
      
      <div className="bg-[#F8FBFF] dark:bg-gray-600 dark:text-white shadow rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#F8FBFF] dark:bg-gray-600 dark:text-white divide-y divide-gray-200 dark:divide-gray-600">
              {data.recentActivity.map((activity: any) => (
                <tr key={activity.id}>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          {activity.user.image ? (
                            <img className="h-8 w-8 rounded-full" src={activity.user.image} alt="" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {activity.user.name?.charAt(0) || '?'}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            {activity.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white capitalize">
                      {activity.action.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white capitalize">
                      {activity.itemType.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {activity.itemId.length > 15 ? `${activity.itemId.substring(0, 15)}...` : activity.itemId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(activity.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
