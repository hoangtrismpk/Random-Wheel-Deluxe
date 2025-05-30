
import React, { useState, useEffect, ChangeEvent } from 'react';
import type { AppGlobalBackground, LinearGradientBackgroundConfig, RadialGradientBackgroundConfig, GradientColorStop } from '../types';
import { useNotification } from './NotificationContext';

interface AppBackgroundColorPickerProps {
  currentBackground: AppGlobalBackground;
  onBackgroundChange: (background: AppGlobalBackground) => void;
  isSpinning: boolean;
}

const MAX_GRADIENT_STOPS = 6;
const DEFAULT_SOLID_COLOR = '#1E293B'; // slate-800
const DEFAULT_LINEAR_GRADIENT: LinearGradientBackgroundConfig = {
  type: 'linear-gradient',
  angle: 135,
  stops: [
    { id: 'lg_default_1', color: '#0f172a', position: 0 }, // slate-900
    { id: 'lg_default_2', color: '#581c87', position: 50 }, // purple-900
    { id: 'lg_default_3', color: '#0f172a', position: 100 },// slate-900
  ],
};
const DEFAULT_RADIAL_GRADIENT: RadialGradientBackgroundConfig = {
  type: 'radial-gradient',
  shape: 'circle',
  position: 'center center',
  stops: [
    { id: 'rg_default_1', color: '#7c3aed', position: 0 }, // violet-600
    { id: 'rg_default_2', color: '#1e293b', position: 100 },// slate-800
  ],
};

const RADIAL_POSITIONS = [
  { label: 'Trung tâm', value: 'center center' },
  { label: 'Trên Trái', value: 'top left' },
  { label: 'Trên Giữa', value: 'top center' },
  { label: 'Trên Phải', value: 'top right' },
  { label: 'Giữa Trái', value: 'center left' },
  { label: 'Giữa Phải', value: 'center right' },
  { label: 'Dưới Trái', value: 'bottom left' },
  { label: 'Dưới Giữa', value: 'bottom center' },
  { label: 'Dưới Phải', value: 'bottom right' },
];


const AppBackgroundColorPicker: React.FC<AppBackgroundColorPickerProps> = ({
  currentBackground,
  onBackgroundChange,
  isSpinning,
}) => {
  const [bgType, setBgType] = useState<'solid' | 'linear-gradient' | 'radial-gradient'>('solid');
  const [solidColor, setSolidColor] = useState<string>(DEFAULT_SOLID_COLOR);
  const [solidColorHex, setSolidColorHex] = useState<string>(DEFAULT_SOLID_COLOR);

  const [linearGradientAngle, setLinearGradientAngle] = useState<number>(DEFAULT_LINEAR_GRADIENT.angle);
  const [linearGradientStops, setLinearGradientStops] = useState<GradientColorStop[]>(
    DEFAULT_LINEAR_GRADIENT.stops.map(s => ({...s, id: s.id || `lg_stop_${Date.now()}_${Math.random()}`}))
  );

  const [radialGradientShape, setRadialGradientShape] = useState<RadialGradientBackgroundConfig['shape']>(DEFAULT_RADIAL_GRADIENT.shape);
  const [radialGradientPosition, setRadialGradientPosition] = useState<string>(DEFAULT_RADIAL_GRADIENT.position);
  const [radialGradientStops, setRadialGradientStops] = useState<GradientColorStop[]>(
     DEFAULT_RADIAL_GRADIENT.stops.map(s => ({...s, id: s.id || `rg_stop_${Date.now()}_${Math.random()}`}))
  );
  
  const { addNotification } = useNotification();

  // Sync local state with prop
  useEffect(() => {
    if (currentBackground === null) {
      // When reset to default, picker can show its own initial defaults
      setBgType('linear-gradient'); // Or 'solid' if preferred as picker default
      setSolidColor(DEFAULT_SOLID_COLOR);
      setSolidColorHex(DEFAULT_SOLID_COLOR);
      setLinearGradientAngle(DEFAULT_LINEAR_GRADIENT.angle);
      setLinearGradientStops(DEFAULT_LINEAR_GRADIENT.stops.map(s => ({...s, id: s.id || `lg_stop_prop_${Date.now()}_${Math.random()}`})));
      setRadialGradientShape(DEFAULT_RADIAL_GRADIENT.shape);
      setRadialGradientPosition(DEFAULT_RADIAL_GRADIENT.position);
      setRadialGradientStops(DEFAULT_RADIAL_GRADIENT.stops.map(s => ({...s, id: s.id || `rg_stop_prop_${Date.now()}_${Math.random()}`})));
    } else if (typeof currentBackground === 'string') {
      setBgType('solid');
      setSolidColor(currentBackground);
      setSolidColorHex(currentBackground);
    } else if (currentBackground.type === 'linear-gradient') {
      setBgType('linear-gradient');
      setLinearGradientAngle(currentBackground.angle);
      setLinearGradientStops(currentBackground.stops.map(s => ({...s, id: s.id || `lg_stop_prop_${Date.now()}_${Math.random()}`})));
    } else if (currentBackground.type === 'radial-gradient') {
      setBgType('radial-gradient');
      setRadialGradientShape(currentBackground.shape);
      setRadialGradientPosition(currentBackground.position);
      setRadialGradientStops(currentBackground.stops.map(s => ({...s, id: s.id || `rg_stop_prop_${Date.now()}_${Math.random()}`})));
    }
  }, [currentBackground]);


  const handleSolidColorHexChange = (e: ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setSolidColorHex(hex);
    if (/^#[0-9A-F]{6}$/i.test(hex) || /^#[0-9A-F]{3}$/i.test(hex)) {
      setSolidColor(hex);
    }
  };
  const handleSolidColorPickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSolidColor(e.target.value);
    setSolidColorHex(e.target.value);
  };


  const handleAddGradientStop = (type: 'linear' | 'radial') => {
    const stops = type === 'linear' ? linearGradientStops : radialGradientStops;
    const setStops = type === 'linear' ? setLinearGradientStops : setRadialGradientStops;
    if (stops.length < MAX_GRADIENT_STOPS) {
      const newStopPosition = stops.length > 0 
        ? Math.min(100, stops[stops.length - 1].position + Math.round(100 / (stops.length + 1)))
        : 50;
      setStops([
        ...stops,
        { id: `stop_${type}_${Date.now()}_${stops.length + 1}`, color: '#FFFFFF', position: newStopPosition },
      ]);
    } else {
      addNotification(`Bạn chỉ có thể thêm tối đa ${MAX_GRADIENT_STOPS} điểm màu.`, 'info');
    }
  };

  const handleRemoveGradientStop = (type: 'linear' | 'radial', id: string) => {
    const stops = type === 'linear' ? linearGradientStops : radialGradientStops;
    const setStops = type === 'linear' ? setLinearGradientStops : setRadialGradientStops;
    if (stops.length > 2) {
      setStops(stops.filter(stop => stop.id !== id));
    } else {
      addNotification('Gradient cần ít nhất 2 điểm màu.', 'info');
    }
  };

  const handleGradientStopChange = (
    type: 'linear' | 'radial', 
    id: string, 
    field: 'color' | 'position', 
    value: string | number
  ) => {
    const setStops = type === 'linear' ? setLinearGradientStops : setRadialGradientStops;
    setStops(prevStops =>
      prevStops.map(stop =>
        stop.id === id
          ? {
              ...stop,
              [field]: field === 'position' ? Math.max(0, Math.min(100, Number(value))) : value,
            }
          : stop
      )
    );
  };

  const handleApply = () => {
    if (isSpinning) return;
    let newBackground: AppGlobalBackground = null;
    if (bgType === 'solid') {
      newBackground = solidColor;
    } else if (bgType === 'linear-gradient') {
      if (linearGradientStops.length < 2) {
        addNotification('Linear gradient cần ít nhất 2 điểm màu.', 'error'); return;
      }
      newBackground = {
        type: 'linear-gradient',
        angle: linearGradientAngle,
        stops: [...linearGradientStops].sort((a, b) => a.position - b.position),
      };
    } else if (bgType === 'radial-gradient') {
      if (radialGradientStops.length < 2) {
        addNotification('Radial gradient cần ít nhất 2 điểm màu.', 'error'); return;
      }
      newBackground = {
        type: 'radial-gradient',
        shape: radialGradientShape,
        position: radialGradientPosition,
        stops: [...radialGradientStops].sort((a, b) => a.position - b.position),
      };
    }
    onBackgroundChange(newBackground);
  };

  const handleResetToDefault = () => {
    if (isSpinning) return;
    onBackgroundChange(null); // Signal to App.tsx to use Tailwind classes
  };
  
  const renderPreview = () => {
    let backgroundStyle = '';
    if (bgType === 'solid') {
      backgroundStyle = solidColor;
    } else if (bgType === 'linear-gradient' && linearGradientStops.length >= 2) {
      const stopsStr = linearGradientStops.sort((a,b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ');
      backgroundStyle = `linear-gradient(${linearGradientAngle}deg, ${stopsStr})`;
    } else if (bgType === 'radial-gradient' && radialGradientStops.length >=2) {
      const stopsStr = radialGradientStops.sort((a,b) => a.position - b.position).map(s => `${s.color} ${s.position}%`).join(', ');
      backgroundStyle = `radial-gradient(${radialGradientShape} at ${radialGradientPosition}, ${stopsStr})`;
    }

    return (
      <div className="w-full h-20 rounded-md border border-slate-600 shadow-inner" style={{ background: backgroundStyle }}>
        {!backgroundStyle && <div className="flex items-center justify-center h-full text-slate-500 text-xs">Xem trước nền</div>}
      </div>
    );
  };

  const renderGradientStopEditor = (
    type: 'linear' | 'radial',
    stops: GradientColorStop[],
  ) => {
    return (
      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
        {stops.map((stop, index) => (
          <div key={stop.id || `stop-${index}`} className="flex items-center space-x-2 p-2 bg-slate-700/50 rounded-md">
            <input
              type="color"
              value={stop.color}
              onChange={(e) => !isSpinning && handleGradientStopChange(type, stop.id!, 'color', e.target.value)}
              disabled={isSpinning}
              className="w-10 h-8 p-0.5 border border-slate-500 rounded-md bg-slate-600 cursor-pointer disabled:cursor-not-allowed"
              aria-label={`Màu của điểm dừng ${index + 1}`}
            />
            <input
              type="number"
              min="0" max="100" step="1"
              value={stop.position}
              onChange={(e: ChangeEvent<HTMLInputElement>) => !isSpinning && handleGradientStopChange(type, stop.id!, 'position', parseInt(e.target.value, 10))}
              disabled={isSpinning}
              className="w-20 p-1.5 text-xs border border-slate-600 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-60"
              aria-label={`Vị trí của điểm dừng ${index + 1} (phần trăm)`}
            />
            <span className="text-slate-400 text-xs">%</span>
            <button
              onClick={() => !isSpinning && handleRemoveGradientStop(type, stop.id!)}
              disabled={isSpinning || stops.length <= 2}
              className="ml-auto text-red-500 hover:text-red-400 disabled:text-slate-500 disabled:cursor-not-allowed p-1 rounded-full focus:outline-none focus:ring-1 focus:ring-red-400"
              aria-label={`Xóa điểm dừng màu ${index + 1}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
        <button
          onClick={() => handleAddGradientStop(type)}
          disabled={isSpinning || stops.length >= MAX_GRADIENT_STOPS}
          className="w-full text-sm bg-sky-600 hover:bg-sky-700 text-white py-1.5 px-3 rounded-md shadow transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          Thêm Điểm Màu
        </button>
      </div>
    );
  };


  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold text-sky-400 text-center">Màu Nền Ứng Dụng</h4>
      
      <div className="mb-4 border-b border-slate-700/50">
        <nav className="flex -mb-px justify-center">
          {(['solid', 'linear-gradient', 'radial-gradient'] as const).map(type => (
            <button
              key={type}
              onClick={() => !isSpinning && setBgType(type)}
              aria-pressed={bgType === type}
              disabled={isSpinning}
              className={`py-2.5 px-4 font-medium text-sm border-b-2 outline-none focus:ring-1 focus:ring-pink-400 rounded-t-md
                ${bgType === type ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500/50'}
                ${isSpinning ? 'cursor-not-allowed opacity-60' : ''}
              `}
            >
              {type === 'solid' ? 'Màu Đơn' : type === 'linear-gradient' ? 'Linear Gradient' : 'Radial Gradient'}
            </button>
          ))}
        </nav>
      </div>
      
      {renderPreview()}

      {bgType === 'solid' && (
        <div className="space-y-2 p-3 border border-slate-700/50 rounded-md">
          <div className="flex items-center space-x-3">
            <label htmlFor="appSolidColorPicker" className="text-sm text-slate-300">Màu:</label>
            <input
              type="color"
              id="appSolidColorPicker"
              value={solidColor}
              onChange={handleSolidColorPickerChange}
              disabled={isSpinning}
              className="w-16 h-8 p-0.5 border border-slate-600 rounded-md bg-slate-700 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Chọn màu nền đơn cho ứng dụng"
            />
             <input
              type="text"
              id="appSolidColorHex"
              value={solidColorHex}
              onChange={handleSolidColorHexChange}
              placeholder="#1E293B"
              disabled={isSpinning}
              className="flex-grow p-1.5 text-sm border border-slate-600 rounded-md bg-slate-900 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
              aria-label="Mã HEX màu nền đơn"
            />
          </div>
        </div>
      )}

      {bgType === 'linear-gradient' && (
        <div className="space-y-3 p-3 border border-slate-700/50 rounded-md">
          <div className="flex flex-col items-start space-y-1">
            <label htmlFor="appLinearAngle" className="text-sm text-slate-300">Góc (°):</label>
            <input
              type="number" id="appLinearAngle" min="0" max="360"
              value={linearGradientAngle}
              onChange={(e) => !isSpinning && setLinearGradientAngle(parseInt(e.target.value, 10))}
              disabled={isSpinning}
              className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
              aria-label="Góc của linear gradient"
            />
          </div>
          <p className="text-sm text-slate-300">Điểm dừng màu:</p>
          {renderGradientStopEditor('linear', linearGradientStops)}
        </div>
      )}

      {bgType === 'radial-gradient' && (
        <div className="space-y-3 p-3 border border-slate-700/50 rounded-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="appRadialShape" className="block text-sm text-slate-300 mb-1">Hình dạng:</label>
              <select
                id="appRadialShape"
                value={radialGradientShape}
                onChange={(e) => !isSpinning && setRadialGradientShape(e.target.value as 'circle' | 'ellipse')}
                disabled={isSpinning}
                className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
                aria-label="Hình dạng của radial gradient"
              >
                <option value="circle">Tròn (Circle)</option>
                <option value="ellipse">Ellipse</option>
              </select>
            </div>
            <div>
              <label htmlFor="appRadialPosition" className="block text-sm text-slate-300 mb-1">Vị trí tâm:</label>
              <select
                id="appRadialPosition"
                value={radialGradientPosition}
                onChange={(e) => !isSpinning && setRadialGradientPosition(e.target.value)}
                disabled={isSpinning}
                className="w-full p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-sky-500 disabled:opacity-60 custom-scrollbar"
                aria-label="Vị trí tâm của radial gradient"
              >
                {RADIAL_POSITIONS.map(pos => <option key={pos.value} value={pos.value}>{pos.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-sm text-slate-300 pt-2">Điểm dừng màu:</p>
          {renderGradientStopEditor('radial', radialGradientStops)}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-3">
        <button
          onClick={handleApply}
          disabled={isSpinning}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Áp dụng màu nền đã chọn cho ứng dụng"
        >
          Áp dụng
        </button>
        <button
          onClick={handleResetToDefault}
          disabled={isSpinning}
          className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-300 font-medium py-2.5 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Khôi phục màu nền mặc định của ứng dụng"
        >
          Khôi phục Mặc định
        </button>
      </div>
    </div>
  );
};

export default AppBackgroundColorPicker;
