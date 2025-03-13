// src/pages/api/analytics/chart.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '@/src/lib/prisma';
import { requireAuth } from '@/src/lib/api/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check authentication
  
  
  const userId = await requireAuth(req, res);
  if (!userId) return;
  
 
  
  
  // Check if user is an admin (add proper admin check for your app)
  const adminEmails = ['nicola.mattioli.95@gmail.com','nicom.19@icloud.com']; // Replace with your actual admin check
  const isAdmin = adminEmails.includes(userId || '');
  
  if (req.method === 'GET') {
    try {
      // Parse query parameters
      const { 
        startDate, 
        endDate, 
        itemType, 
        action, 
        groupBy = 'day',
        userFilter
      } = req.query;
      
      // Parse dates
      const startDateTime = startDate ? new Date(startDate as string) : new Date(new Date().setDate(new Date().getDate() - 30)); // Default to last 30 days
      const endDateTime = endDate ? new Date(endDate as string) : new Date();
      
      // Build the query filter
      const whereClause: any = {
        timestamp: {
          gte: startDateTime,
          lte: endDateTime
        }
      };
      
      // Add user filter
      if (!isAdmin) {
        // If not admin, only show user's own data
        whereClause.userId = userId;
      } else if (userFilter) {
        // If admin and userFilter is provided
        whereClause.userId = userFilter;
      }
      
      // Add itemType filter if provided
      if (itemType) {
        const itemTypes = Array.isArray(itemType) ? itemType : [itemType];
        whereClause.itemType = { in: itemTypes };
      }
      
      // Add action filter if provided
      if (action) {
        const actions = Array.isArray(action) ? action : [action];
        whereClause.action = { in: actions };
      }
      
      // Get activity data grouped by date
      let activityData: any[] = [];
      
      // For SQL-based grouping, we need to use Prisma's $queryRaw
      // The SQL will vary based on your database (PostgreSQL shown here)
      if (groupBy === 'day') {
        // Group by day
        activityData = await prisma.$queryRaw`
          SELECT 
            DATE(timestamp) as date, 
            COUNT(*) as count
          FROM "ActivityLog"
          WHERE timestamp >= ${startDateTime} AND timestamp <= ${endDateTime}
          ${whereClause.userId ? `AND "userId" = ${whereClause.userId}` : ''}
          ${whereClause.itemType?.in ? `AND "itemType" IN (${whereClause.itemType.in.join(',')})` : ''}
          ${whereClause.action?.in ? `AND "action" IN (${whereClause.action.in.join(',')})` : ''}
          GROUP BY DATE(timestamp)
          ORDER BY date ASC
        `;
      } else if (groupBy === 'week') {
        // Group by week (PostgreSQL)
        activityData = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('week', timestamp) as date,
            COUNT(*) as count
          FROM "ActivityLog"
          WHERE timestamp >= ${startDateTime} AND timestamp <= ${endDateTime}
          ${whereClause.userId ? `AND "userId" = ${whereClause.userId}` : ''}
          ${whereClause.itemType?.in ? `AND "itemType" IN (${whereClause.itemType.in.join(',')})` : ''}
          ${whereClause.action?.in ? `AND "action" IN (${whereClause.action.in.join(',')})` : ''}
          GROUP BY DATE_TRUNC('week', timestamp)
          ORDER BY date ASC
        `;
      } else if (groupBy === 'month') {
        // Group by month (PostgreSQL)
        activityData = await prisma.$queryRaw`
          SELECT 
            DATE_TRUNC('month', timestamp) as date,
            COUNT(*) as count
          FROM "ActivityLog"
          WHERE timestamp >= ${startDateTime} AND timestamp <= ${endDateTime}
          ${whereClause.userId ? `AND "userId" = ${whereClause.userId}` : ''}
          ${whereClause.itemType?.in ? `AND "itemType" IN (${whereClause.itemType.in.join(',')})` : ''}
          ${whereClause.action?.in ? `AND "action" IN (${whereClause.action.in.join(',')})` : ''}
          GROUP BY DATE_TRUNC('month', timestamp)
          ORDER BY date ASC
        `;
      }
      
      // Format the data for the chart
      const formattedData = activityData.map((item: any) => ({
        date: item.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        count: parseInt(item.count)
      }));
      
      return res.status(200).json(formattedData);
    } catch (error) {
      console.error('Failed to get activity chart data:', error);
      return res.status(500).json({ message: 'Failed to get activity chart data' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}