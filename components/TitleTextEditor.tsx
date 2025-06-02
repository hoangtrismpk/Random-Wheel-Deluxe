
import React, { useState, useEffect } from 'react';

interface TitleTextEditorProps {
  currentTitleText: string;
  onTitleTextChange: (newText: string) => void;
  defaultTitleText: string;
  isSpinning: boolean;
}

const TitleTextEditor: React.FC<TitleTextEditorProps> = ({
  currentTitleText,
  onTitleTextChange,
  defaultTitleText,
  isSpinning,
}) => {
  const [editText, setEditText] = useState(currentTitleText);

  useEffect(() => {
    setEditText(currentTitleText);
  }, [currentTitleText]);

  const handleApply = () => {
    if (isSpinning) return;
    onTitleTextChange(editText);
  };

  const handleReset = () => {
    if (isSpinning) return;
    setEditText(defaultTitleText); // Also update local state for immediate feedback
    onTitleTextChange(defaultTitleText);
  };

  return (
    <div className="space-y-3">
      <h4 className="text-md font-semibold text-sky-400 text-center">Nội Dung Tiêu Đề Chính</h4>
      <textarea
        value={editText}
        onChange={(e) => !isSpinning && setEditText(e.target.value)}
        rows={3}
        className="w-full p-2.5 text-sm border border-slate-600 rounded-lg bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 custom-scrollbar disabled:opacity-60"
        placeholder="Nhập tiêu đề của bạn..."
        disabled={isSpinning}
        aria-label="Chỉnh sửa nội dung tiêu đề chính của ứng dụng"
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleApply}
          disabled={isSpinning || editText === currentTitleText}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Áp dụng nội dung tiêu đề mới"
        >
          Áp dụng
        </button>
        <button
          onClick={handleReset}
          disabled={isSpinning || currentTitleText === defaultTitleText}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-300 font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Khôi phục nội dung tiêu đề mặc định"
        >
          Mặc định
        </button>
      </div>
    </div>
  );
};

export default TitleTextEditor;
