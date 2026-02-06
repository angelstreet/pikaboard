import { useEffect, useState, useCallback } from 'react';
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
import { ViewToggle } from '../components/ViewToggle';
import { FocusList } from '../components/FocusList';
import { BlockerView } from '../components/BlockerView';

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'inbox', label: '📥 Inbox', color: 'bg-gray-100' },
  { id: 'up_next', label: '⏳ Up Next', color: 'bg-blue-50' },
  { id: 'in_progress', label: '🚧 In Progress', color: 'bg-yellow-50' },
  { id: 'testing', label: '🧪 Testing', color: 'bg-orange-50' },
  { id: 'in_review', label: '👀 In Review', color: 'bg-purple-50' },
  { id: 'done', label: '✅ Done', color: 'bg-green-50' },
];

function DroppableColumn({
  id,
  label,
  color,
  tasks,
  onTaskClick,
  activeId,
}: {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
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
        <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
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

  // Drag state
  const [activeId, setActiveId] = useState<number | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'all'>('all');

  // View state
  const [activeView, setActiveView] = useState<'kanban' | 'focus' | 'blocker'>('kanban');

  // Blocker count for badge
  const [blockerCount, setBlockerCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  // Load boards on mount
  useEffect(() => {
    loadBoards();
  }, []);

  // Load blocker count
  useEffect(() => {
    const loadBlockerCount = async () => {
      try {
        const data = await api.getProposals();
        const count = data.proposals.reduce((sum, p) => sum + p.items.length, 0);
        setBlockerCount(count);
      } catch {
        // Ignore errors
      }
    };
    loadBlockerCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadBlockerCount, 30000);
    return () => clearInterval(interval);
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

  const tasksByStatus = useCallback(
    (status: Task['status']) => tasks.filter((t) => t.status === status),
    [tasks]
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold">
            {activeView === 'kanban' ? '📋 Kanban' : activeView === 'focus' ? '🎯 Focus' : '🚧 Blockers'}
          </h2>
          <BoardSelector
            boards={boards}
            currentBoard={currentBoard}
            onSelectBoard={selectBoard}
            onCreateBoard={handleCreateBoard}
            onEditBoard={handleEditBoard}
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ViewToggle activeView={activeView} onViewChange={setActiveView} blockerCount={blockerCount} />
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Focus List View */}
      {activeView === 'focus' && (
        <FocusList tasks={tasks} onTaskClick={handleTaskClick} />
      )}

      {/* Blocker View */}
      {activeView === 'blocker' && (
        <BlockerView
          onTaskCreated={(task) => {
            // If task is created on current board, add to tasks
            if (task.board_id === currentBoard?.id) {
              setTasks((prev) => [task, ...prev]);
            }
            // Refresh blocker count
            api.getProposals().then((data) => {
              setBlockerCount(data.proposals.reduce((sum, p) => sum + p.items.length, 0));
            });
          }}
        />
      )}

      {/* Kanban View */}
      {activeView === 'kanban' && (
        <>
          {/* Filter Tabs */}
          <TaskFilterTabs
            tasks={tasks}
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            showTesting={currentBoard?.show_testing}
          />

          {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {(() => {
          // Filter out 'testing' column if board doesn't show it
          const boardColumns = currentBoard?.show_testing
            ? COLUMNS
            : COLUMNS.filter((col) => col.id !== 'testing');
          const visibleColumns = statusFilter === 'all'
            ? boardColumns
            : boardColumns.filter((col) => col.id === statusFilter);
          // Mobile: horizontal scroll with fixed column widths
          // Desktop: grid layout
          const isSingleColumn = statusFilter !== 'all';
          return (
            <div className={`
              ${isSingleColumn
                ? 'max-w-md mx-auto'
                : 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0'
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
        </>
      )}

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
    </div>
  );
}
