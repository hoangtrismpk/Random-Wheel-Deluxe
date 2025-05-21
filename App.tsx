
import React, { useState, useEffect, useRef, useCallback } from 'react';
import WheelCanvas from './components/WheelCanvas';
import NameInput from './components/NameInput';
import WinnerModal from './components/WinnerModal';
import ImageSelectionModal from './components/ImageSelectionModal';

// Easing function: easeOutQuart
const easeOutQuart = (t: number, b: number, c: number, d: number): number => {
  t /= d;
  t--;
  return -c * (t * t * t * t - 1) + b;
};

const App: React.FC = () => {
  const [names, setNames] = useState<string[]>(['Quay thử!', 'Thử lại', 'Chiến thắng!', 'Chúc may mắn', 'Trúng độc đắc!', 'Gần trúng...', 'Sát nút', 'Lần tới']);
  const [currentRotation, setCurrentRotation] = useState(0); // radians
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinDuration, setSpinDuration] = useState<number>(10000); // Default 10 seconds
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerHistory, setWinnerHistory] = useState<string[]>([]);
  const [calculatedCanvasSize, setCalculatedCanvasSize] = useState(500);
  const [centerImageSrc, setCenterImageSrc] = useState<string | null>(null); 
  const [isImageModalOpen, setIsImageModalOpen] = useState(false); 

  const [priorityNamesInput, setPriorityNamesInput] = useState<string>(''); 
  const [parsedPriorityNames, setParsedPriorityNames] = useState<string[]>([]); 
  const [showPriorityInputSection, setShowPriorityInputSection] = useState(false);


  const spinStartRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const winnerIndexRef = useRef(0);

  useEffect(() => {
    const newParsedNames = priorityNamesInput
      .split(/[\n,]+/) 
      .map(name => name.trim())
      .filter(name => name.length > 0);
    setParsedPriorityNames(newParsedNames);
  }, [priorityNamesInput]);

  const handleNamesUpdate = useCallback((newNames: string[]) => {
    setNames(newNames);
    setSelectedName(null);
    
    if (!isSpinning) { 
        setCurrentRotation(prev => prev % (2 * Math.PI)); 
    }
  }, [isSpinning]);

  const spinWheel = useCallback(() => {
    if (names.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedName(null); 
    setShowConfetti(false);
    setShowWinnerModal(false); 

    let potentialWinnerByName: string | null = null;

    if (parsedPriorityNames.length > 0) { 
      const validPriorityCandidatesOnWheel = names.filter(nameOnWheel => 
        parsedPriorityNames.includes(nameOnWheel)
      );

      if (validPriorityCandidatesOnWheel.length > 0) {
        potentialWinnerByName = validPriorityCandidatesOnWheel[
          Math.floor(Math.random() * validPriorityCandidatesOnWheel.length)
        ];
        const determinedWinnerIndex = names.indexOf(potentialWinnerByName);
        if (determinedWinnerIndex !== -1) {
          winnerIndexRef.current = determinedWinnerIndex;
        } else {
          potentialWinnerByName = null; 
        }
      }
    }

    if (potentialWinnerByName === null) { 
      winnerIndexRef.current = Math.floor(Math.random() * names.length);
    }
    
    const numSegments = names.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    let desiredFinalAngleOfSegment = -Math.PI / 2; 
    let segmentMiddleAngle = (winnerIndexRef.current * anglePerSegment) + (anglePerSegment / 2);
    let targetAngle = desiredFinalAngleOfSegment - segmentMiddleAngle;

    const MIN_ADDITIONAL_ROTATIONS = 6; 
    let totalTargetRotation = currentRotation + MIN_ADDITIONAL_ROTATIONS * 2 * Math.PI;
    
    const currentRotRemainder = totalTargetRotation % (2 * Math.PI);
    const normalizedTargetAngle = (targetAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const normalizedCurrentRotRemainder = (currentRotRemainder % (2*Math.PI) + 2 * Math.PI) % (2*Math.PI);

    totalTargetRotation += (normalizedTargetAngle - normalizedCurrentRotRemainder);

     if (totalTargetRotation <= currentRotation + 0.1) { 
        totalTargetRotation += 2 * Math.PI; 
    }
    
    targetRotationRef.current = totalTargetRotation;
    spinStartRotationRef.current = currentRotation;
    spinStartTimeRef.current = performance.now();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - spinStartTimeRef.current;
      if (elapsed >= spinDuration) {
        const finalRotation = targetRotationRef.current;
        setCurrentRotation(finalRotation);
        setIsSpinning(false); 
        animationFrameIdRef.current = null;

        const winner = names[winnerIndexRef.current];
        const trimmedWinner = winner ? winner.trim() : ""; 

        if (trimmedWinner.length > 0) { 
            setSelectedName(trimmedWinner); 
            setWinnerHistory(prevHistory => [...prevHistory, trimmedWinner]);
            setShowWinnerModal(true); 
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 6000); 
        } else {
            console.warn("Spin resulted in an invalid or empty winner name. Modal not shown.");
            setSelectedName(null);
        }
        return;
      }

      const newRotation = easeOutQuart(
        elapsed,
        spinStartRotationRef.current,
        targetRotationRef.current - spinStartRotationRef.current,
        spinDuration
      );
      setCurrentRotation(newRotation);
      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);
  }, [names, isSpinning, currentRotation, spinDuration, parsedPriorityNames]);

  useEffect(() => {
    const updateCanvasSize = () => {
        const maxWidthPercentage = window.innerWidth < 1024 ? 0.9 : 0.55;
        const availableWidth = window.innerWidth * maxWidthPercentage;
        const availableHeight = window.innerHeight * 0.7; 

        const newSize = Math.max(250, Math.min(800, availableWidth - 40, availableHeight - 40));
        setCalculatedCanvasSize(newSize);
    };
    updateCanvasSize(); 
    window.addEventListener('resize', updateCanvasSize);
    return () => {
        window.removeEventListener('resize', updateCanvasSize);
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
    };
  }, []);

  const handleCloseWinnerModal = useCallback(() => { 
    setShowWinnerModal(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showWinnerModal) handleCloseWinnerModal();
        if (isImageModalOpen) setIsImageModalOpen(false);
      }
      if (event.ctrlKey && event.altKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault(); 
        setShowPriorityInputSection(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showWinnerModal, isImageModalOpen, handleCloseWinnerModal]); 


  const handleRemoveWinner = () => {
    if (selectedName) {
      const nameToRemove = selectedName;
      
      handleNamesUpdate(names.filter(name => name !== nameToRemove)); 

      const currentPriorityList = priorityNamesInput
        .split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      const newPriorityList = currentPriorityList.filter(name => name !== nameToRemove);
      setPriorityNamesInput(newPriorityList.join('\n')); 
    }
    setShowWinnerModal(false); 
  };
  
  const handleClearWinnerHistory = () => {
    setWinnerHistory([]);
  };

  const handleImageSelected = (src: string) => {
    setCenterImageSrc(src);
    setIsImageModalOpen(false); 
  };

  const handleRemoveLogo = () => {
    setCenterImageSrc(null);
  };
  
  const ConfettiPiece: React.FC<{id: number}> = ({id}) => {
    const style = {
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 4}s`, 
      animationDelay: `${Math.random() * 0.8}s`, 
      backgroundColor: `hsl(${Math.random() * 360}, 80%, 65%)`, 
      transform: `rotate(${Math.random() * 720 - 360}deg) scale(${Math.random() * 0.6 + 0.7})`, 
      width: `${Math.random() * 8 + 8}px`, 
      height: `${Math.random() * 15 + 10}px`, 
    };
    return <div key={id} className="absolute opacity-0 animate-fall rounded-sm" style={style}></div>;
  };

  const spinDurationsOptions = [5, 10, 15]; 

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 space-y-6">
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall { animation-name: fall; animation-timing-function: ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ec4899; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #db2777; }

        .winner-history-list::-webkit-scrollbar { width: 6px; }
        .winner-history-list::-webkit-scrollbar-track { background: #334155; border-radius: 8px; }
        .winner-history-list::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 8px; }
        .winner-history-list::-webkit-scrollbar-thumb:hover { background: #6d28d9; }
      `}</style>
      
      <header className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">
            Vòng Quay May Mắn
          </span>
          <span className="block text-purple-400 text-3xl mt-1">Phiên Bản Đặc Biệt</span>
        </h1>
      </header>

      <main className="flex flex-col lg:flex-row items-start justify-around w-full max-w-screen-2xl gap-6 lg:gap-10">
        <div className="relative flex-shrink-0 w-full lg:w-auto aspect-square mx-auto lg:mx-0" style={{maxWidth: `${calculatedCanvasSize}px`, maxHeight: `${calculatedCanvasSize}px` }}>
          <WheelCanvas 
            names={names} 
            rotationAngle={currentRotation} 
            canvasSize={calculatedCanvasSize}
            centerImageSrc={centerImageSrc}
          />
        </div>

        <div className="flex flex-col items-center space-y-5 w-full lg:w-auto lg:max-w-md xl:max-w-lg">
          <NameInput 
            currentNames={names} 
            onNamesChange={handleNamesUpdate} 
            isSpinning={isSpinning || showWinnerModal} 
          />

          {showPriorityInputSection && (
            <div className="w-full p-6 bg-slate-800 rounded-xl shadow-2xl transition-all duration-300 ease-in-out">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-sky-400">Người Chiến Thắng Ưu Tiên</h2>
                <button
                  onClick={() => setShowPriorityInputSection(false)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 px-3 rounded-md transition-colors"
                  aria-label="Ẩn mục người chiến thắng ưu tiên"
                >
                  Ẩn
                </button>
              </div>
              <textarea
                value={priorityNamesInput}
                onChange={(e) => setPriorityNamesInput(e.target.value)}
                placeholder="Nhập tên ưu tiên, cách nhau bằng dấu phẩy hoặc xuống dòng. Nếu có tên nào trong danh sách này trên vòng quay, một người sẽ được chọn."
                rows={3}
                className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ease-in-out custom-scrollbar"
                disabled={isSpinning || showWinnerModal}
                aria-label="Nhập tên người chiến thắng ưu tiên, cách nhau bằng dấu phẩy hoặc xuống dòng"
              />
              <p className="text-xs text-slate-500 mt-2 text-center">Nếu để trống, một tên ngẫu nhiên từ danh sách chính sẽ được chọn. (Ctrl+Alt+K để Hiện/Ẩn)</p>
            </div>
          )}

          <div className="w-full p-4 bg-slate-800 rounded-xl shadow-xl">
            <h3 className="text-lg font-semibold text-pink-400 mb-3 text-center">Thời Gian Quay</h3>
            <div className="flex justify-around items-center">
              {spinDurationsOptions.map((sec) => {
                const durationValue = sec * 1000;
                const inputId = `duration-${sec}s`;
                return (
                  <label
                    key={sec}
                    htmlFor={inputId}
                    className={`flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700 transition-colors ${isSpinning ? 'opacity-60 cursor-not-allowed' : ''} ${spinDuration === durationValue ? 'bg-slate-700/70 ring-2 ring-pink-500' : ''}`}
                  >
                    <input
                      type="radio"
                      name="spinDuration"
                      value={durationValue}
                      id={inputId}
                      checked={spinDuration === durationValue}
                      onChange={(e) => !isSpinning && setSpinDuration(parseInt(e.target.value))}
                      disabled={isSpinning}
                      className="sr-only peer"
                    />
                    <span className="w-5 h-5 border-2 border-slate-500 rounded-full flex items-center justify-center peer-checked:border-pink-500 transition-all duration-150">
                      <span className="w-2.5 h-2.5 bg-pink-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-150"></span>
                    </span>
                    <span>{sec} giây</span>
                  </label>
                );
              })}
            </div>
          </div>
          
          <div className="w-full p-4 bg-slate-800 rounded-xl shadow-xl space-y-3">
            <h3 className="text-lg font-semibold text-pink-400 text-center">Logo Trung Tâm</h3>
            <button
              onClick={() => setIsImageModalOpen(true)}
              disabled={isSpinning}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Chọn logo trung tâm"
            >
              Chọn Logo
            </button>
            {centerImageSrc && (
              <button
                onClick={handleRemoveLogo}
                disabled={isSpinning}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Xóa logo trung tâm"
              >
                Xóa Logo
              </button>
            )}
          </div>

          <button
            onClick={spinWheel}
            disabled={isSpinning || names.length === 0}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-2xl py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            aria-label="Quay vòng may mắn"
          >
            {isSpinning ? 'Đang quay...' : 'QUAY!'}
          </button>

          <div className="w-full p-4 bg-slate-800 rounded-xl shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-purple-400">Lịch Sử Chiến Thắng</h3>
              <button
                onClick={handleClearWinnerHistory}
                disabled={winnerHistory.length === 0 || isSpinning}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 aria-label="Xóa lịch sử người chiến thắng"
              >
                Xóa Lịch Sử
              </button>
            </div>
            {winnerHistory.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto space-y-1 pr-1 winner-history-list">
                {winnerHistory.map((winner, index) => (
                  <li key={index} className="text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md truncate">
                    {index + 1}. {winner}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 text-center py-2">Chưa có người chiến thắng. Hãy quay vòng quay!</p>
            )}
          </div>

        </div>
      </main>
      <footer className="text-slate-500 text-sm mt-auto pt-6">
        Tạo bằng React, TypeScript, và Tailwind CSS. (Ctrl+Alt+K cho Người Chiến Thắng Ưu Tiên)
      </footer>

      <WinnerModal
        isOpen={showWinnerModal}
        winnerName={selectedName}
        onClose={handleCloseWinnerModal}
        onRemove={handleRemoveWinner}
      />

      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onImageSelected={handleImageSelected}
      />

      {showConfetti && (
        <div className="fixed inset-0 w-screen h-screen pointer-events-none z-[100] overflow-hidden">
          {Array.from({ length: 150 }).map((_, i) => <ConfettiPiece key={i} id={i} />)} 
        </div>
      )}
    </div>
  );
};

export default App;
