
import React from 'react';

interface WinnerModalProps {
  isOpen: boolean;
  winnerName: string | null;
  onClose: () => void;
  onRemove: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ isOpen, winnerName, onClose, onRemove }) => {
  const getVisuallyNonEmptyName = (name: string | null): string | null => {
    if (!name) return null;
    const isEffectivelyWhitespaceOrInvisible = /^[\s\u200B-\u200D\uFEFF]*$/.test(name);
    return isEffectivelyWhitespaceOrInvisible ? null : name;
  };

  const nameForDisplay = getVisuallyNonEmptyName(winnerName);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="winnerModalTitle"
      aria-hidden={!isOpen} 
      className={`fixed inset-0 flex items-center justify-center p-4 z-50
                  transition-opacity duration-300 ease-in-out
                  ${isOpen ? 'bg-black bg-opacity-75 opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={isOpen ? onClose : undefined} 
    >
      <div 
        className={`w-full max-w-lg rounded-lg shadow-xl overflow-hidden
                    transform transition-all duration-300 ease-out
                    bg-slate-800
                    ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div id="winnerModalTitle" className="flex items-center justify-between p-4 bg-green-600 text-white">
          <h2 className="text-xl font-semibold">Chúng ta có người chiến thắng!</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold leading-none hover:text-green-200 transition-colors"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <div className="p-6 sm:p-8 text-center">
          <p
            className="text-4xl sm:text-5xl font-extrabold text-white py-4 mb-4 break-words
                       min-h-[60px] sm:min-h-[70px] flex items-center justify-center"
            aria-live="polite" 
          >
            {nameForDisplay || <span aria-hidden="true">&nbsp;</span>}
          </p>
        </div>

        <div className="px-6 py-4 flex justify-end items-center gap-3 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500 transition-colors"
            aria-label="Đóng thông báo người chiến thắng"
          >
            Đóng
          </button>
          <button
            onClick={onRemove}
            disabled={!winnerName} 
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={
              nameForDisplay
                ? `Xóa ${nameForDisplay} khỏi danh sách và cập nhật vòng quay`
                : (winnerName ? "Xóa người chiến thắng đã chọn khỏi danh sách" : "Xóa người chiến thắng khỏi danh sách")
            }
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
