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
  const [activeView, setActiveView] = useState<'kanban' | 'focus'>('kanban');

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
      // Select first board if none selected
      if (!currentBoard && boardsData.length > 0) {
        setCurrentBoard(boardsData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    }
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
      setCurrentBoard(newBoard);
    }
  };

  const handleDeleteBoard = async (id: number) => {
    await api.deleteBoard(id, false); // Move tasks to another board
    setBoards((prev) => prev.filter((b) => b.id !== id));
    // Select another board
    if (currentBoard?.id === id) {
      const remaining = boards.filter((b) => b.id !== id);
      setCurrentBoard(remaining[0] || null);
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {activeView === 'kanban' ? '📋 Kanban Board' : '🎯 Focus List'}
          </h2>
          <BoardSelector
            boards={boards}
            currentBoard={currentBoard}
            onSelectBoard={setCurrentBoard}
            onCreateBoard={handleCreateBoard}
            onEditBoard={handleEditBoard}
          />
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle activeView={activeView} onViewChange={setActiveView} />
          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Focus List View */}
      {activeView === 'focus' && (
        <FocusList tasks={tasks} onTaskClick={handleTaskClick} />
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
          const numCols = boardColumns.length;
          const gridCols = statusFilter === 'all' ? `grid-cols-${numCols}` : 'grid-cols-1 max-w-md';
          return (
            <div className={`grid ${gridCols} gap-4`}>
              {visibleColumns.map((col) => (
                <DroppableColumn
                  key={col.id}
                  id={col.id}
                  label={col.label}
                  color={col.color}
                  tasks={tasksByStatus(col.id)}
                  onTaskClick={handleTaskClick}
                  activeId={activeId}
                />
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
