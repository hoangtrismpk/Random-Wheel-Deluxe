
import React, { useState, useEffect, useCallback } from 'react';

interface NameInputProps {
  currentNames: string[];
  onNamesChange: (names: string[]) => void;
  isSpinning: boolean;
}

const NameInput: React.FC<NameInputProps> = ({ currentNames, onNamesChange, isSpinning }) => {
  const [textAreaValue, setTextAreaValue] = useState<string>(() => currentNames.join('\n'));

  useEffect(() => {
    const namesAsTextFromProps = currentNames.join('\n');
    if (textAreaValue !== namesAsTextFromProps) {
      setTextAreaValue(namesAsTextFromProps);
    }
  }, [currentNames]); 

  const handleTextAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setTextAreaValue(newText); 

    const namesArray = newText
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    
    onNamesChange(namesArray);
  };

  return (
    <div className="w-full p-6 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold text-pink-400 mb-4 text-center">Nhập Tên</h2>
      <textarea
        value={textAreaValue}
        onChange={handleTextAreaChange}
        placeholder="Nhập tên, mỗi tên một dòng hoặc cách nhau bằng dấu phẩy..."
        rows={8}
        className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150 ease-in-out custom-scrollbar"
        disabled={isSpinning}
        aria-label="Nhập tên cho vòng quay"
      />
      <p className="text-xs text-slate-500 mt-3 text-center">Cách tên bằng dòng mới hoặc dấu phẩy. Vòng quay tự động cập nhật.</p>
    </div>
  );
};

export default NameInput;
