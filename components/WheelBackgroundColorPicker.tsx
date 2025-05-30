
import React, { useState, useEffect, ChangeEvent } from 'react';
import type { WheelDynamicBackground, LinearGradientBackgroundConfig, GradientColorStop } from '../types';
import { useNotification } from './NotificationContext';

interface WheelBackgroundColorPickerProps {
  currentBackground: WheelDynamicBackground;
  onBackgroundChange: (background: WheelDynamicBackground) => void;
  isSpinning: boolean;
}

const MAX_GRADIENT_STOPS = 5;
const DEFAULT_SOLID_COLOR_WHEEL = '#FFC107'; // A default wheel color

const WheelBackgroundColorPicker: React.FC<WheelBackgroundColorPickerProps> = ({
  currentBackground,
  onBackgroundChange,
  isSpinning,
}) => {
  const [bgType, setBgType] = useState<'solid' | 'linear-gradient'>(
    typeof currentBackground === 'string' ? 'solid' : (currentBackground?.type === 'linear-gradient' ? 'linear-gradient' : 'solid')
  );
  const [solidColor, setSolidColor] = useState<string>(
    typeof currentBackground === 'string' ? currentBackground : DEFAULT_SOLID_COLOR_WHEEL
  );
  const [solidColorHex, setSolidColorHex] = useState<string>(
    typeof currentBackground === 'string' ? currentBackground : DEFAULT_SOLID_COLOR_WHEEL
  );

  const [gradientAngle, setGradientAngle] = useState<number>(
    currentBackground && typeof currentBackground === 'object' && currentBackground.type === 'linear-gradient' ? currentBackground.angle : 0
  );
  const [gradientStops, setGradientStops] = useState<GradientColorStop[]>(
    currentBackground && typeof currentBackground === 'object' && currentBackground.type === 'linear-gradient' 
    ? currentBackground.stops.map(s => ({...s, id: s.id || `stop_wheel_${Date.now()}_${Math.random().toString(36).substring(2,9)}`}))
    : [
        { id: `stop_wheel_${Date.now()}_1`, color: '#FF00FF', position: 0 },
        { id: `stop_wheel_${Date.now()}_2`, color: '#00FFFF', position: 100 },
      ]
  );
  const { addNotification } = useNotification();

  useEffect(() => {
    if (typeof currentBackground === 'string') {
      setBgType('solid');
      setSolidColor(currentBackground);
      setSolidColorHex(currentBackground);
    } else if (currentBackground && currentBackground.type === 'linear-gradient') {
      setBgType('linear-gradient');
      setGradientAngle(currentBackground.angle);
      setGradientStops(currentBackground.stops.map(s => ({...s, id: s.id || `stop_wheel_prop_${Date.now()}_${Math.random().toString(36).substring(2,9)}`})));
    } else { // null or invalid
      setBgType('solid'); 
      setSolidColor(DEFAULT_SOLID_COLOR_WHEEL);
      setSolidColorHex(DEFAULT_SOLID_COLOR_WHEEL);
      setGradientAngle(0);
      setGradientStops([
        { id: `stop_wheel_default_1`, color: '#FF00FF', position: 0 },
        { id: `stop_wheel_default_2`, color: '#00FFFF', position: 100 },
      ]);
    }
  }, [currentBackground]);

  const handleSolidColorHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    const hex = e.target.value;
    setSolidColorHex(hex);
    if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
      setSolidColor(hex);
    }
  };
  const handleSolidColorPickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    setSolidColor(e.target.value);
    setSolidColorHex(e.target.value);
  };


  const handleApply = () => {
    if (isSpinning) return;
    if (bgType === 'solid') {
      // Ensure solidColor is valid before applying, using solidColorHex as source of truth if it's a valid hex
      if (/^#[0-9A-F]{6}$/i.test(solidColorHex) || /^#[0-9A-F]{3}$/i.test(solidColorHex)) {
        onBackgroundChange(solidColorHex);
      } else {
        onBackgroundChange(solidColor); // fallback to color picker's direct value if hex is invalid
      }
    } else {
      if (gradientStops.length < 2) {
        addNotification('Gradient cần ít nhất 2 điểm màu.', 'error');
        return;
      }
      const sortedStops = [...gradientStops].sort((a, b) => a.position - b.position);
      onBackgroundChange({
        type: 'linear-gradient',
        angle: gradientAngle,
        stops: sortedStops,
      } as LinearGradientBackgroundConfig);
    }
  };

  const handleRemoveCustomBackground = () => {
    if (isSpinning) return;
    onBackgroundChange(null);
  };

  const handleAddGradientStop = () => {
    if (gradientStops.length < MAX_GRADIENT_STOPS) {
      const newStopPosition = gradientStops.length > 0 
        ? Math.min(100, gradientStops[gradientStops.length - 1].position + Math.round(100 / (gradientStops.length + 1)))
        : 50;
      setGradientStops([
        ...gradientStops,
        { id: `stop_wheel_${Date.now()}_${gradientStops.length + 1}`, color: '#FFFFFF', position: newStopPosition },
      ]);
    } else {
        addNotification(`Bạn chỉ có thể thêm tối đa ${MAX_GRADIENT_STOPS} điểm màu.`, 'info');
    }
  };

  const handleRemoveGradientStop = (id: string) => {
    if (gradientStops.length > 2) {
      setGradientStops(gradientStops.filter(stop => stop.id !== id));
    } else {
        addNotification('Gradient cần ít nhất 2 điểm màu.', 'info');
    }
  };

  const handleGradientStopChange = (id: string, field: 'color' | 'position', value: string | number) => {
    setGradientStops(
      gradientStops.map(stop =>
        stop.id === id
          ? {
              ...stop,
              [field]: field === 'position' ? Math.max(0, Math.min(100, Number(value))) : value,
            }
          : stop
      )
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold text-sky-400 text-center">Màu Nền Vòng Quay</h4>
      
      <div className="flex justify-center space-x-4 mb-3">
        {(['solid', 'linear-gradient'] as const).map(type => {
          const inputId = `wheel_bgtype-${type}`;
          return (
            <label
              key={type}
              htmlFor={inputId}
              className={`flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/70 transition-colors ${isSpinning ? 'opacity-60 cursor-not-allowed' : ''} ${bgType === type ? 'bg-slate-700 ring-1 ring-pink-500' : 'bg-slate-600/50'}`}
            >
              <input
                type="radio"
                name="wheelBgType"
                id={inputId}
                value={type}
                checked={bgType === type}
                onChange={(e) => !isSpinning && setBgType(e.target.value as 'solid' | 'linear-gradient')}
                disabled={isSpinning}
                className="sr-only peer"
              />
              <span className="w-4 h-4 border-2 border-slate-500 rounded-full flex items-center justify-center peer-checked:border-pink-500 transition-all duration-150">
                <span className="w-2 h-2 bg-pink-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-150"></span>
              </span>
              <span className="text-sm">{type === 'solid' ? 'Màu Đơn' : 'Gradient'}</span>
            </label>
          );
        })}
      </div>

      {bgType === 'solid' && (
        <div className="space-y-2 p-3 border border-slate-700/50 rounded-md">
            <label htmlFor="wheelSolidColorHex" className="block text-sm text-slate-300 mb-1">Mã HEX:</label>
            <div className="flex items-center space-x-2">
            <input
                type="text"
                id="wheelSolidColorHex"
                value={solidColorHex}
                onChange={handleSolidColorHexChange}
                placeholder={DEFAULT_SOLID_COLOR_WHEEL}
                disabled={isSpinning}
                className="flex-grow p-1.5 text-sm border border-slate-600 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                aria-label="Mã HEX màu nền đơn cho vòng quay"
            />
            <input
                type="color"
                id="wheelSolidColorPicker"
                value={solidColor}
                onChange={handleSolidColorPickerChange}
                disabled={isSpinning}
                className="w-10 h-8 p-0.5 border border-slate-500 rounded-md bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Chọn màu nền đơn cho vòng quay (visual picker)"
            />
            </div>
        </div>
      )}

      {bgType === 'linear-gradient' && (
        <div className="space-y-3 p-3 border border-slate-700/50 rounded-md">
          <div className="flex flex-col items-start space-y-1">
            <label htmlFor="wheelGradientAngle" className="text-sm text-slate-300">Góc (°):</label>
            <input
              type="number"
              id="wheelGradientAngle"
              min="0"
              max="360"
              value={gradientAngle}
              onChange={(e) => !isSpinning && setGradientAngle(parseInt(e.target.value, 10))}
              disabled={isSpinning}
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
              aria-label="Góc của gradient cho vòng quay"
            />
          </div>
          <p className="text-sm text-slate-300 mb-1">Điểm dừng màu:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {gradientStops.map((stop, index) => (
              <div key={stop.id || `wheel-stop-${index}`} className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded-md">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => !isSpinning && handleGradientStopChange(stop.id!, 'color', e.target.value)}
                  disabled={isSpinning}
                  className="w-10 h-8 p-0.5 border border-slate-500 rounded-md bg-slate-600 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Màu của điểm dừng ${index + 1} cho vòng quay`}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={stop.position}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => !isSpinning && handleGradientStopChange(stop.id!, 'position', parseInt(e.target.value, 10))}
                  disabled={isSpinning}
                  className="w-20 p-1.5 text-xs border border-slate-600 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
                  aria-label={String(`Vị trí của điểm dừng ${index + 1} (phần trăm) cho vòng quay`)}
                />
                <span className="text-slate-400 text-xs">%</span>
                <button
                  onClick={() => !isSpinning && handleRemoveGradientStop(stop.id!)}
                  disabled={isSpinning || Number(gradientStops.length) <= 2}
                  className="ml-auto text-red-500 hover:text-red-400 disabled:text-slate-500 disabled:cursor-not-allowed p-1 rounded-full focus:outline-none focus:ring-1 focus:ring-red-400"
                  aria-label={`Xóa điểm dừng màu ${index + 1} cho vòng quay`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleAddGradientStop}
            disabled={isSpinning || Number(gradientStops.length) >= MAX_GRADIENT_STOPS}
            className="w-full text-sm bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-md shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Thêm Điểm Màu
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-3">
        <button
          onClick={handleApply}
          disabled={isSpinning}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Áp dụng màu nền đã chọn cho vòng quay"
        >
          Áp dụng
        </button>
        <button
          onClick={handleRemoveCustomBackground}
          disabled={isSpinning || currentBackground === null}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-300 font-medium py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Xóa màu nền tùy chỉnh và quay lại mặc định cho vòng quay"
        >
          Xóa màu nền
        </button>
      </div>
    </div>
  );
};

export default WheelBackgroundColorPicker;
