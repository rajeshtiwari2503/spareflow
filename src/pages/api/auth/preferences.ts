import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard: {
    defaultView: string;
    itemsPerPage: number;
  };
}

export default withAuth(async (req, res, user) => {
  if (req.method === 'GET') {
    try {
      // Get user preferences from database or return defaults
      // For now, we'll store preferences as JSON in a system settings table
      // You could create a dedicated UserPreferences table for better structure
      
      const preferencesRecord = await prisma.systemSettings.findUnique({
        where: { key: `user_preferences_${user.id}` }
      });

      const defaultPreferences: UserPreferences = {
        theme: 'system',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
        dashboard: {
          defaultView: 'overview',
          itemsPerPage: 10,
        },
      };

      const preferences = preferencesRecord 
        ? JSON.parse(preferencesRecord.value)
        : defaultPreferences;

      res.status(200).json({ 
        success: true, 
        preferences 
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updates = req.body as Partial<UserPreferences>;
      
      // Get current preferences
      const currentRecord = await prisma.systemSettings.findUnique({
        where: { key: `user_preferences_${user.id}` }
      });

      const currentPreferences = currentRecord 
        ? JSON.parse(currentRecord.value)
        : {};

      // Merge with updates
      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        // Handle nested objects properly
        notifications: {
          ...currentPreferences.notifications,
          ...updates.notifications,
        },
        dashboard: {
          ...currentPreferences.dashboard,
          ...updates.dashboard,
        },
      };

      // Save to database
      await prisma.systemSettings.upsert({
        where: { key: `user_preferences_${user.id}` },
        update: { 
          value: JSON.stringify(updatedPreferences),
          updatedAt: new Date()
        },
        create: {
          key: `user_preferences_${user.id}`,
          value: JSON.stringify(updatedPreferences),
          description: `User preferences for ${user.name}`,
        },
      });

      res.status(200).json({ 
        success: true, 
        preferences: updatedPreferences 
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
});