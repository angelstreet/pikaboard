import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { api, Task, Board } from '../api/client';
import { TaskCard, TaskCardOverlay } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { BoardModal } from '../components/BoardModal';
import { BoardSelector } from '../components/BoardSelector';
import { TaskFilterTabs } from '../components/TaskFilterTabs';
import TaskSearch from '../components/TaskSearch';
import { useConfirmModal } from '../components/ConfirmModal';

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'inbox', label: '📥 Inbox', color: 'bg-gray-100' },
  { id: 'up_next', label: '⏳ Up Next', color: 'bg-blue-50' },
  { id: 'in_progress', label: '🚧 In Progress', color: 'bg-yellow-50' },
  { id: 'in_review', label: '👀 In Review', color: 'bg-purple-50' },
  { id: 'done', label: '✅ Done', color: 'bg-green-50' },
];

function DroppableColumn({
  id,
  label,
  color,
  tasks,
  onTaskClick,
  onArchive,
  onArchiveAll,
  activeId,
}: {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onArchiveAll?: () => void;
  activeId: number | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        ${color} rounded-lg p-3 min-h-[200px] flex flex-col
        ${isOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{label}</h3>
        <div className="flex items-center gap-2">
          {id === 'done' && tasks.length > 0 && onArchiveAll && (
            <button
              onClick={onArchiveAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Archive all done tasks"
            >
              📦 All
            </button>
          )}
          <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              onArchive={id === 'done' ? onArchive : undefined}
              isDragging={task.id === activeId}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function Boards() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  
  // Confirm modal
  const { confirm, ConfirmModalComponent } = useConfirmModal();

  // Drag state
  const [activeId, setActiveId] = useState<number | null>(null);

  // Filter state — mobile defaults to 'up_next' (single column), desktop defaults to 'all'
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>(() => {
    return window.innerWidth < 640 ? 'up_next' : 'all';
  });

  // Rejection reason modal state
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [pendingRejectionTask, setPendingRejectionTask] = useState<Task | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Notify TeamRoster of selected board
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('board-selected', { detail: { boardId: currentBoard?.id ?? null } }));
    return () => {
      window.dispatchEvent(new CustomEvent('board-selected', { detail: { boardId: null } }));
    };
  }, [currentBoard?.id]);

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  // Load tasks when board changes
  useEffect(() => {
    if (currentBoard) {
      loadTasks(currentBoard.id);
    }
  }, [currentBoard?.id]);

  const loadBoards = async () => {
    try {
      const boardsData = await api.getBoards();
      setBoards(boardsData);
      // Select saved board from localStorage, or first board
      if (!currentBoard && boardsData.length > 0) {
        const savedBoardId = localStorage.getItem('pikaboard-last-board');
        const savedBoard = savedBoardId 
          ? boardsData.find(b => b.id === parseInt(savedBoardId, 10))
          : null;
        setCurrentBoard(savedBoard || boardsData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    }
  };

  // Save board selection to localStorage
  const selectBoard = (board: Board) => {
    setCurrentBoard(board);
    localStorage.setItem('pikaboard-last-board', String(board.id));
  };

  const loadTasks = async (boardId: number) => {
    try {
      setLoading(true);
      const tasksData = await api.getTasks({ board_id: boardId });
      setTasks(tasksData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Filter done tasks to only show those completed within last 48 hours
  const visibleTasks = useMemo(() => {
    const now = Date.now();
    const hours48 = 48 * 60 * 60 * 1000;
    return tasks.filter((t) => {
      if (t.status !== 'done') return true;
      if (!t.completed_at) return true;
      return (now - new Date(t.completed_at).getTime()) < hours48;
    });
  }, [tasks]);

  const tasksByStatus = useCallback(
    (status: Task['status']) => visibleTasks.filter((t) => t.status === status),
    [visibleTasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as number;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target status from over.id
    // Over.id could be a column id (status) or another task id
    let targetStatus: Task['status'];
    if (COLUMNS.some((col) => col.id === over.id)) {
      targetStatus = over.id as Task['status'];
    } else {
      // Dropped on another task - get that task's status
      const targetTask = tasks.find((t) => t.id === over.id);
      if (!targetTask) return;
      targetStatus = targetTask.status;
    }

    if (task.status === targetStatus) return;

    // If moving to rejected, show rejection reason modal
    if (targetStatus === 'rejected') {
      setPendingRejectionTask(task);
      setRejectionReason('');
      setRejectionModalOpen(true);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );

    try {
      await api.updateTask(taskId, { status: targetStatus });
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
      console.error('Failed to update task status:', err);
    }
  };

  const handleRejectTask = async () => {
    if (!pendingRejectionTask || !rejectionReason.trim()) return;

    const taskId = pendingRejectionTask.id;
    const originalStatus = pendingRejectionTask.status;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: 'rejected', rejection_reason: rejectionReason.trim() }
          : t
      )
    );

    try {
      await api.updateTask(taskId, {
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
      });
      setRejectionModalOpen(false);
      setPendingRejectionTask(null);
      setRejectionReason('');
    } catch (err) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: originalStatus } : t))
      );
      console.error('Failed to reject task:', err);
    }
  };

  const handleCancelRejection = () => {
    setRejectionModalOpen(false);
    setPendingRejectionTask(null);
    setRejectionReason('');
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      const updated = await api.updateTask(editingTask.id, taskData);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create new task
      const newTask = await api.createTask({
        ...taskData,
        board_id: currentBoard?.id,
      });
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  const handleDeleteTask = async (id: number) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleArchiveTask = async (task: Task) => {
    const confirmed = await confirm({
      title: 'Archive Task',
      message: `Archive task #${task.id}: "${task.name}"? You can restore it later from the archive.`,
      confirmText: 'Archive',
      variant: 'warning',
    });
    if (confirmed) {
      await api.archiveTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }
  };

  const handleArchiveAllDone = async () => {
    if (!currentBoard) return;
    
    // Only archive done tasks from the CURRENT board
    const doneTasks = tasks.filter(
      (t) => t.status === 'done' && t.board_id === currentBoard.id
    );
    if (doneTasks.length === 0) return;
    
    const confirmed = await confirm({
      title: 'Archive All Done Tasks',
      message: `Archive all ${doneTasks.length} done tasks from "${currentBoard.name}"? You can restore them later.`,
      confirmText: 'Archive All',
      variant: 'danger',
    });
    
    if (confirmed) {
      await Promise.all(doneTasks.map((t) => api.archiveTask(t.id)));
      setTasks((prev) => prev.filter((t) => !(t.status === 'done' && t.board_id === currentBoard.id)));
    }
  };

  const handleEditBoard = (board: Board) => {
    setEditingBoard(board);
    setBoardModalOpen(true);
  };

  const handleCreateBoard = () => {
    setEditingBoard(null);
    setBoardModalOpen(true);
  };

  const handleSaveBoard = async (boardData: Partial<Board>) => {
    if (editingBoard) {
      const updated = await api.updateBoard(editingBoard.id, boardData);
      setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      if (currentBoard?.id === updated.id) {
        setCurrentBoard(updated);
      }
    } else {
      const newBoard = await api.createBoard(boardData);
      setBoards((prev) => [...prev, newBoard]);
      selectBoard(newBoard);
    }
  };

  const handleDeleteBoard = async (id: number) => {
    await api.deleteBoard(id, false); // Move tasks to another board
    setBoards((prev) => prev.filter((b) => b.id !== id));
    // Select another board
    if (currentBoard?.id === id) {
      const remaining = boards.filter((b) => b.id !== id);
      if (remaining[0]) {
        selectBoard(remaining[0]);
      } else {
        setCurrentBoard(null);
      }
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <strong>Error:</strong> {error}
        <button
          onClick={() => currentBoard && loadTasks(currentBoard.id)}
          className="ml-4 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header — compact single line on mobile */}
      <div className="flex items-center justify-between mb-3 sm:mb-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h2 className="text-lg sm:text-2xl font-bold hidden sm:block">📋 Boards</h2>
          <BoardSelector
            boards={boards}
            currentBoard={currentBoard}
            onSelectBoard={selectBoard}
            onCreateBoard={handleCreateBoard}
            onEditBoard={handleEditBoard}
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <TaskSearch onTaskClick={handleTaskClick} />
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <TaskFilterTabs
        tasks={tasks}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {(() => {
          const visibleColumns = statusFilter === 'all'
            ? COLUMNS
            : COLUMNS.filter((col) => col.id === statusFilter);
          // Mobile: horizontal scroll with fixed column widths
          // Desktop: grid layout
          const isSingleColumn = statusFilter !== 'all';
          return (
            <div className={`
              ${isSingleColumn
                ? 'max-w-md mx-auto'
                : 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4 sm:overflow-visible sm:pb-0'
              }
            `}>
              {visibleColumns.map((col) => (
                <div
                  key={col.id}
                  className={isSingleColumn ? 'w-full' : 'flex-shrink-0 w-[280px] sm:w-auto snap-start'}
                >
                  <DroppableColumn
                    id={col.id}
                    label={col.label}
                    color={col.color}
                    tasks={tasksByStatus(col.id)}
                    onTaskClick={handleTaskClick}
                    onArchive={handleArchiveTask}
                    onArchiveAll={handleArchiveAllDone}
                    activeId={activeId}
                  />
                </div>
              ))}
            </div>
          );
        })()}

        <DragOverlay>
          {activeTask && <TaskCardOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <TaskModal
        task={editingTask}
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />

      <BoardModal
        board={editingBoard}
        isOpen={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        onSave={handleSaveBoard}
        onDelete={handleDeleteBoard}
        boardCount={boards.length}
      />

      {/* Rejection Reason Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ❌ Reject Task
              </h2>
              <button
                onClick={handleCancelRejection}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You are rejecting <strong className="text-gray-900 dark:text-white">{pendingRejectionTask?.name}</strong>.
                Please provide a reason:
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Why is this task being rejected?"
                rows={4}
                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-white"
                autoFocus
              />

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                This reason will be visible on the task card.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
              <button
                onClick={handleCancelRejection}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectTask}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      <ConfirmModalComponent />
    </div>
  );
}
