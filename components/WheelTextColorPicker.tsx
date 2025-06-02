
import React, { useState, useEffect, ChangeEvent } from 'react';
import { useNotification } from './NotificationContext';

interface WheelTextColorPickerProps {
  currentTextColor: string;
  onTextColorChange: (color: string) => void;
  defaultTextColor: string;
  isSpinning: boolean;
}

const WheelTextColorPicker: React.FC<WheelTextColorPickerProps> = ({
  currentTextColor,
  onTextColorChange,
  defaultTextColor,
  isSpinning,
}) => {
  const [selectedColor, setSelectedColor] = useState(currentTextColor);
  const [hexColor, setHexColor] = useState(currentTextColor);
  const { addNotification } = useNotification();

  useEffect(() => {
    setSelectedColor(currentTextColor);
    setHexColor(currentTextColor);
  }, [currentTextColor]);

  const handleColorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    setSelectedColor(e.target.value);
    setHexColor(e.target.value);
  };

  const handleHexInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    const newHex = e.target.value;
    setHexColor(newHex);
    if (/^#[0-9A-F]{6}$/i.test(newHex) || /^#[0-9A-F]{3}$/i.test(newHex)) {
      setSelectedColor(newHex);
    }
  };

  const handleApply = () => {
    if (isSpinning) return;
    let colorToApply = selectedColor;
    if (!(/^#[0-9A-F]{6}$/i.test(hexColor) || /^#[0-9A-F]{3}$/i.test(hexColor))) {
        // If hex is invalid, but selectedColor (from picker) is valid, use selectedColor.
        // If both are somehow out of sync and hex is bad, consider a fallback or error.
        // For simplicity, we trust selectedColor if hex input is bad.
        if (!(/^#[0-9A-F]{6}$/i.test(selectedColor) || /^#[0-9A-F]{3}$/i.test(selectedColor))) {
            addNotification('Mã HEX màu không hợp lệ. Sử dụng màu từ bảng chọn.', 'error');
            colorToApply = selectedColor; // Fallback to whatever color picker had
        }
    } else {
        colorToApply = hexColor; // hex is valid, use it
    }
    onTextColorChange(colorToApply);
  };

  const handleReset = () => {
    if (isSpinning) return;
    onTextColorChange(defaultTextColor);
  };

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-semibold text-sky-300 text-center">Màu Chữ Vòng Quay</h5>
      <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-md">
        <input
          type="color"
          value={selectedColor}
          onChange={handleColorInputChange}
          disabled={isSpinning}
          className="w-10 h-10 p-0.5 border border-slate-600 rounded-md bg-slate-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Chọn màu chữ cho các mục trên vòng quay"
        />
        <input
          type="text"
          value={hexColor}
          onChange={handleHexInputChange}
          placeholder={defaultTextColor}
          disabled={isSpinning}
          className="flex-grow p-2 text-sm border border-slate-600 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
          aria-label="Mã HEX cho màu chữ trên vòng quay"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleApply}
          disabled={isSpinning || selectedColor === currentTextColor}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Áp dụng màu chữ đã chọn"
        >
          Áp dụng
        </button>
        <button
          onClick={handleReset}
          disabled={isSpinning || currentTextColor === defaultTextColor}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-300 font-medium py-2 px-3 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Đặt lại màu chữ về mặc định"
        >
          Mặc định
        </button>
      </div>
    </div>
  );
};

export default WheelTextColorPicker;
