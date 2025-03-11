// src/components/analytics/StatCard.tsx
import React, { ReactNode } from 'react';
import { ArrowUp, ArrowDown } from 'react-feather';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel
}) => {
  // Determine if change is positive or negative
  const isPositive = change !== undefined ? change >= 0 : undefined;
  
  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      
      {change !== undefined && (
        <div className="bg-gray-50 dark:bg-gray-600 px-5 py-3">
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
            </div>
            <div className="ml-2 text-sm">
              <span className={`font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-gray-500 dark:text-gray-300"> {changeLabel}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};