import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api, Activity } from '../api/client';

interface ActivityMetadata {
  agent_label?: string;
  status?: 'running' | 'completed' | 'failed';
  duration_sec?: number;
  task_summary?: string;
  taskId?: number;
}

// Track shown toasts to avoid duplicates
const shownToasts = new Set<string>();

export function useTaskNotifications() {
  const lastCheckRef = useRef<Date | null>(null);
  const isFirstLoadRef = useRef(true);

  const checkForCompletions = useCallback(async () => {
    try {
      const activities = await api.getActivity({ limit: 50 });
      const now = new Date();
      
      // Filter for task completions since last check
      const completions = activities.filter((activity: Activity) => {
        if (activity.type !== 'task_completed') return false;
        
        // On first load, don't show notifications for old completions
        if (isFirstLoadRef.current) return false;
        
        // Only show for completions since last check
        if (lastCheckRef.current) {
          const activityTime = new Date(activity.created_at);
          return activityTime > lastCheckRef.current;
        }
        
        return false;
      });

      // Show toast for each new completion
      completions.forEach((activity: Activity) => {
        const metadata = activity.metadata as ActivityMetadata | null;
        const toastId = `task-${activity.id}`;
        
        // Skip if already shown
        if (shownToasts.has(toastId)) return;
        shownToasts.add(toastId);
        
        // Clean up old toast IDs (keep last 100)
        if (shownToasts.size > 100) {
          const iterator = shownToasts.values();
          const first = iterator.next().value;
          if (first) shownToasts.delete(first);
        }
        
        // Get task name with fallback
        let taskName = 'Task completed';
        if (metadata?.task_summary) {
          taskName = metadata.task_summary;
        } else if (activity.message) {
          taskName = activity.message;
        }
        
        const agentLabel = metadata?.agent_label;
        
        // Build message text
        let message = '✅ Task Completed';
        message += '\n' + taskName;
        if (agentLabel) {
          message += '\nby ' + agentLabel;
        }
        
        toast.success(message, {
          id: toastId,
          duration: 4000,
        });
      });

      // Update last check time
      lastCheckRef.current = now;
      isFirstLoadRef.current = false;
    } catch (err) {
      // Silently fail - don't spam with error toasts
      console.error('Failed to check for task completions:', err);
    }
  }, []);

  useEffect(() => {
    // Initial check (sets up lastCheckRef without showing toasts)
    checkForCompletions();
    
    // Poll every 10 seconds
    const interval = setInterval(() => {
      checkForCompletions();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkForCompletions]);
}
