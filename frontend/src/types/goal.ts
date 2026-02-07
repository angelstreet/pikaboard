// Goal type for API
export interface Goal {
  id: number;
  title: string;
  description: string | null;
  type: 'global' | 'agent';
  agent_id: number | null;
  status: 'active' | 'paused' | 'achieved';
  progress: number;
  deadline: string | null;
  board_id: number | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  done_count?: number;
}
