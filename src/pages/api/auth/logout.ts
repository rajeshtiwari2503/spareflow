import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';

export default withAuth(async (req, res, user) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { reason } = req.body;

    // Log the logout event
    console.log(`User ${user.id} (${user.email}) logged out. Reason: ${reason || 'manual'} at ${new Date().toISOString()}`);

    // In a production application, you might want to:
    // 1. Invalidate the token on the server side by adding it to a blacklist
    // 2. Clear any active sessions from a sessions table
    // 3. Log the logout event to an audit log
    // 4. Send notifications if it's a security-related logout

    // For now, we'll just acknowledge the logout
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      reason: reason || 'manual',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});