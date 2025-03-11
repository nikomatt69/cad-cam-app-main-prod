// src/components/analytics/ActivityCard.tsx
import React, { ReactNode } from 'react';

interface ActivityCardProps {
  title: string;
  count: number;
  icon: ReactNode;
  subtitle?: string;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  count,
  icon,
  subtitle
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-600 rounded-lg p-4 shadow-sm hover:shadow-md transition duration-150">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-300">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{count.toLocaleString()}</p>
      </div>
    </div>
  );
};