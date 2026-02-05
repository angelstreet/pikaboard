import { useState, useRef, useEffect } from 'react';
import { Board } from '../api/client';

interface BoardSelectorProps {
  boards: Board[];
  currentBoard: Board | null;
  onSelectBoard: (board: Board) => void;
  onCreateBoard: () => void;
  onEditBoard: (board: Board) => void;
}

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export function BoardSelector({
  boards,
  currentBoard,
  onSelectBoard,
  onCreateBoard,
  onEditBoard,
}: BoardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const colors = currentBoard ? colorClasses[currentBoard.color] || colorClasses.blue : colorClasses.blue;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all
          ${colors.bg} ${colors.text} ${colors.border}
          hover:shadow-md
        `}
      >
        <span className="text-xl">{currentBoard?.icon || '📋'}</span>
        <span className="font-semibold">{currentBoard?.name || 'Select Board'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {boards.map((board) => {
              const boardColors = colorClasses[board.color] || colorClasses.blue;
              const isSelected = currentBoard?.id === board.id;

              return (
                <div
                  key={board.id}
                  className={`
                    flex items-center justify-between px-3 py-2 cursor-pointer
                    ${isSelected ? `${boardColors.bg}` : 'hover:bg-gray-50'}
                  `}
                >
                  <button
                    onClick={() => {
                      onSelectBoard(board);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 flex-1"
                  >
                    <span className="text-lg">{board.icon}</span>
                    <span className={`font-medium ${isSelected ? boardColors.text : 'text-gray-700'}`}>
                      {board.name}
                    </span>
                    {isSelected && (
                      <svg className="w-4 h-4 text-green-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditBoard(board);
                      setIsOpen(false);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Edit board"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="border-t">
            <button
              onClick={() => {
                onCreateBoard();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-blue-600 hover:bg-blue-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">Create new board</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
