import { createClient } from '@/lib/supabase/client'

export async function initializeNotifications() {
  const supabase = createClient()
  
  try {
    // Try to fetch from notifications table
    const { error } = await supabase
      .from('notifications')
      .select('count')
      .limit(1)
    
    if (error && error.code === '42P01') {
      // Table doesn't exist
      console.log('Notifications table not found. Please run the migration.')
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking notifications table:', error)
    return false
  }
}