
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

export interface ImageAsset {
  dataURL: string;
  fileName: string;
}

export type ImageStore = Record<string, ImageAsset>;

// Type for items in winner history
export type WinnerHistoryItem = string | {
  id: string;
  dataURL: string;
  fileName: string;
  isImage: true;
};

// Fisher-Yates Shuffle Algorithm Helper
const shuffleArray = (array: string[]): string[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


const App: React.FC = () => {
  const [names, setNames] = useState<string[]>(['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thu Hà', 'Hoàng Đức Hải', 'Vũ Ngọc Lan', 'Đặng Tiến Dũng', 'Bùi Thanh Mai']);
  const [currentRotation, setCurrentRotation] = useState(0); // radians
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null); // For display (filename or text)
  const [selectedItem, setSelectedItem] = useState<string | null>(null); // Actual ID or text from names array
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinDuration, setSpinDuration] = useState<number>(10000); // Default 10 seconds
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryItem[]>([]); // Updated type
  const [calculatedCanvasSize, setCalculatedCanvasSize] = useState(500);
  
  const [centerImageSrc, setCenterImageSrc] = useState<string | null>(null);
  const [wheelBackgroundImageSrc, setWheelBackgroundImageSrc] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSelectionPurpose, setImageSelectionPurpose] = useState<'centerLogo' | 'wheelBackground' | null>(null);

  const [priorityNamesInput, setPriorityNamesInput] = useState<string>('');
  const [parsedPriorityNames, setParsedPriorityNames] = useState<string[]>([]);
  const [showPriorityInputSection, setShowPriorityInputSection] = useState(false);

  const [imageStore, setImageStore] = useState<ImageStore>({});
  const [autoShuffle, setAutoShuffle] = useState<boolean>(false);
  const [spinJustCompletedWithAutoShuffle, setSpinJustCompletedWithAutoShuffle] = useState<boolean>(false);

  // New UI states
  const [activeTab, setActiveTab] = useState<'nameInput' | 'results'>('nameInput');
  const [isSpinOptionsOpen, setIsSpinOptionsOpen] = useState<boolean>(false);
  const [isWheelCustomizationOpen, setIsWheelCustomizationOpen] = useState<boolean>(false);


  const spinStartRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const winnerIndexRef = useRef(0);
  const confettiTimerRef = useRef<number | null>(null); // Ref for confetti timer

  useEffect(() => {
    const newParsedNames = priorityNamesInput
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    setParsedPriorityNames(newParsedNames);
  }, [priorityNamesInput]);

  const handleNamesUpdate = useCallback((newNamesFromInput: string[]) => {
    setNames(newNamesFromInput);

    setImageStore(prevStore => {
      const newStore = { ...prevStore };
      let storeChanged = false;
      for (const imageIdInStore in newStore) {
        if (!newNamesFromInput.includes(imageIdInStore)) {
          if (prevStore[imageIdInStore]) { 
             delete newStore[imageIdInStore];
             storeChanged = true;
          }
        }
      }
      return storeChanged ? newStore : prevStore;
    });

    if (!isSpinning && !showWinnerModal) {
        setSelectedName(null);
        setSelectedItem(null);
        setCurrentRotation(prev => prev % (2 * Math.PI));
    }
  }, [isSpinning, showWinnerModal]);


  const addNewImageToWheel = useCallback((id: string, dataURL: string, fileName: string) => {
    setImageStore(prev => ({ ...prev, [id]: { dataURL, fileName } }));
    setNames(prevNames => [...prevNames, id]);
  }, []);


  const spinWheel = useCallback(() => {
    if (names.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setSelectedName(null);
    setSelectedItem(null);
    // setShowConfetti(false); // Confetti logic moved to useEffect
    setShowWinnerModal(false);
    setSpinJustCompletedWithAutoShuffle(false); 

    let potentialWinnerIdOrName: string | null = null;
    const actualNameEntries = names.map(nameOrId => imageStore[nameOrId]?.fileName || nameOrId);


    if (parsedPriorityNames.length > 0) {
      const validPriorityCandidatesOnWheel = actualNameEntries.filter(nameOnWheel =>
        parsedPriorityNames.includes(nameOnWheel)
      );

      if (validPriorityCandidatesOnWheel.length > 0) {
        const winningNameFromPriorityList = validPriorityCandidatesOnWheel[
          Math.floor(Math.random() * validPriorityCandidatesOnWheel.length)
        ];
        const determinedWinnerIndex = actualNameEntries.indexOf(winningNameFromPriorityList);

        if (determinedWinnerIndex !== -1) {
          winnerIndexRef.current = determinedWinnerIndex;
        } else {
          potentialWinnerIdOrName = null; 
        }
      }
    }

    if (potentialWinnerIdOrName === null || winnerIndexRef.current < 0 || winnerIndexRef.current >= names.length) { 
      winnerIndexRef.current = Math.floor(Math.random() * names.length);
    }
    
    const numSegments = names.length;
    const anglePerSegment = (2 * Math.PI) / numSegments;

    const desiredFinalAngleOfSegment = -Math.PI / 2; 
    const segmentMiddleAngle = (winnerIndexRef.current * anglePerSegment) + (anglePerSegment / 2);
    let targetAngleForSegmentMiddle = desiredFinalAngleOfSegment - segmentMiddleAngle;

    const randomFactor = Math.random() * 0.8 + 0.1; 
    const randomOffsetWithinSegment = (randomFactor - 0.5) * anglePerSegment; 
    let targetAngle = targetAngleForSegmentMiddle - randomOffsetWithinSegment;


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
        
        animationFrameIdRef.current = null;

        const winnerIdOrName = names[winnerIndexRef.current]; 
        const winnerImageAsset = imageStore[winnerIdOrName];
        const winnerDisplayName = winnerImageAsset?.fileName || winnerIdOrName; 
        
        const trimmedWinnerDisplayName = winnerDisplayName ? winnerDisplayName.trim() : "";

        if (trimmedWinnerDisplayName.length > 0 || winnerImageAsset) { 
            setSelectedName(trimmedWinnerDisplayName); 
            setSelectedItem(winnerIdOrName); 
            
            if (winnerImageAsset) {
              setWinnerHistory(prevHistory => [
                ...prevHistory, 
                { 
                  id: winnerIdOrName, 
                  dataURL: winnerImageAsset.dataURL, 
                  fileName: winnerImageAsset.fileName, 
                  isImage: true 
                }
              ]);
            } else {
              setWinnerHistory(prevHistory => [...prevHistory, winnerIdOrName]);
            }

            setShowWinnerModal(true);
            setShowConfetti(true); // Trigger confetti
        } else {
            console.warn("Spin resulted in an invalid or empty winner name. Modal not shown.");
            setSelectedName(null);
            setSelectedItem(null);
        }
        
        if (autoShuffle) {
          setSpinJustCompletedWithAutoShuffle(true);
        }
        
        setIsSpinning(false);
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
  }, [names, isSpinning, currentRotation, spinDuration, parsedPriorityNames, imageStore, autoShuffle]);

  // Effect for managing auto-shuffle after spin
  useEffect(() => {
    if (spinJustCompletedWithAutoShuffle && !isSpinning) { 
      const shuffledNames = shuffleArray([...names]);
      handleNamesUpdate(shuffledNames);
      setSpinJustCompletedWithAutoShuffle(false);
    }
  }, [spinJustCompletedWithAutoShuffle, names, handleNamesUpdate, isSpinning]);

  // Effect for managing confetti lifecycle
  useEffect(() => {
    if (showWinnerModal && showConfetti) {
      // If modal is shown and confetti flag is true, start the timer
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
      }, 6000);
    } else if (!showWinnerModal && showConfetti) {
      // If modal is closed but confetti flag was still true, turn it off immediately
      setShowConfetti(false);
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    }

    // Cleanup timer on unmount or if dependencies change before timer fires
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
    };
  }, [showWinnerModal, showConfetti]);


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
    // setShowConfetti(false); // Confetti is now handled by the useEffect
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showWinnerModal) handleCloseWinnerModal();
        if (isImageModalOpen) {
            setIsImageModalOpen(false);
            setImageSelectionPurpose(null);
        }
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
    if (selectedItem) { 
      const updatedNames = names.filter(item => item !== selectedItem);
      handleNamesUpdate(updatedNames); 

      if(selectedName) { 
        const currentPriorityList = priorityNamesInput
          .split(/[\n,]+/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        const newPriorityList = currentPriorityList.filter(name => name !== selectedName);
        setPriorityNamesInput(newPriorityList.join('\n'));
      }
    }
    setShowWinnerModal(false);
  };
  
  const handleClearWinnerHistory = () => {
    setWinnerHistory([]);
  };

  const handleImageSelected = (src: string) => {
    if (imageSelectionPurpose === 'centerLogo') {
      setCenterImageSrc(src);
    } else if (imageSelectionPurpose === 'wheelBackground') {
      setWheelBackgroundImageSrc(src);
    }
    setIsImageModalOpen(false);
    setImageSelectionPurpose(null);
  };

  const handleRemoveLogo = () => {
    setCenterImageSrc(null);
  };

  const handleRemoveWheelBackground = () => {
    setWheelBackgroundImageSrc(null);
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

  const openImageModal = (purpose: 'centerLogo' | 'wheelBackground') => {
    setImageSelectionPurpose(purpose);
    setIsImageModalOpen(true);
  };

  const renderTabContent = () => {
    if (activeTab === 'nameInput') {
      return (
        <>
          <h2 className="text-2xl font-bold text-pink-400 mb-4 text-center">Nhập Tên hoặc Thêm Ảnh</h2>
          <NameInput
            currentNames={names}
            imageStore={imageStore}
            onNamesChange={handleNamesUpdate}
            addNewImageToWheel={addNewImageToWheel}
            isSpinning={isSpinning || showWinnerModal}
          />
        </>
      );
    }
    if (activeTab === 'results') {
      return (
        <>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-bold text-pink-400">Kết Quả Quay</h2>
            <button
              onClick={handleClearWinnerHistory}
              disabled={winnerHistory.length === 0 || isSpinning}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Xóa lịch sử kết quả"
            >
              Xóa Kết Quả
            </button>
          </div>
          {winnerHistory.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto space-y-1 pr-1 winner-history-list custom-scrollbar">
              {winnerHistory.map((historyItem, index) => {
                const isObjectItem = typeof historyItem === 'object' && historyItem !== null && 'isImage' in historyItem;
                return (
                  <li 
                    key={index} 
                    className={`text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md truncate ${isObjectItem ? 'flex items-center gap-2' : ''}`}
                  >
                    <span>{index + 1}.</span>
                    {isObjectItem && historyItem.isImage ? (
                      <>
                        <img 
                          src={historyItem.dataURL} 
                          alt={historyItem.fileName} 
                          className="w-6 h-6 object-cover rounded-full flex-shrink-0"
                        />
                        <span className="truncate">{historyItem.fileName}</span>
                      </>
                    ) : (
                      <span>{typeof historyItem === 'string' ? historyItem : 'Lỗi mục'}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 text-center py-2">Chưa có kết quả. Hãy quay vòng quay!</p>
          )}
        </>
      );
    }
    return null;
  };

  const renderCollapsibleSection = (
    title: string, 
    isOpen: boolean, 
    setIsOpen: (open: boolean) => void, 
    contentId: string, 
    children: React.ReactNode
  ) => {
    return (
      <div className="w-full bg-slate-800 rounded-xl shadow-xl">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full flex justify-between items-center p-4 text-lg font-semibold text-pink-400 hover:bg-slate-700/50 rounded-t-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-slate-800"
        >
          <span>{title}</span>
          <span className="transform transition-transform duration-200">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
        {isOpen && (
          <div id={contentId} className="p-4 border-t border-slate-700">
            {children}
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-100 flex flex-col items-center p-4 space-y-6">
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
        <h1 
          className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl"
          style={{ lineHeight: 'normal' }} 
        >
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
            imageStore={imageStore}
            rotationAngle={currentRotation}
            canvasSize={calculatedCanvasSize}
            centerImageSrc={centerImageSrc}
            wheelBackgroundImageSrc={wheelBackgroundImageSrc} 
          />
        </div>

        <div className="flex flex-col items-center space-y-5 w-full lg:max-w-md xl:max-w-lg">
          {/* Tab Navigation */}
          <div className="w-full grid grid-cols-2 border-b border-slate-700 mb-0">
            <button
              onClick={() => setActiveTab('nameInput')}
              aria-pressed={activeTab === 'nameInput'}
              className={`w-full py-3 px-4 font-medium text-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-t-lg ${
                activeTab === 'nameInput' 
                ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500' 
                : 'bg-slate-700 text-slate-400 hover:text-pink-300 hover:bg-slate-600'
              }`}
            >
              Nhập Liệu
            </button>
            <button
              onClick={() => setActiveTab('results')}
              aria-pressed={activeTab === 'results'}
              className={`w-full py-3 px-4 font-medium text-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-t-lg ${
                activeTab === 'results' 
                ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500' 
                : 'bg-slate-700 text-slate-400 hover:text-pink-300 hover:bg-slate-600'
              }`}
            >
              Kết quả
            </button>
          </div>
          
          {/* Tab Content Area */}
          <div className="w-full p-6 bg-slate-800 rounded-b-xl shadow-2xl">
            {renderTabContent()}
          </div>
          
          <button
            onClick={spinWheel}
            disabled={isSpinning || names.length === 0}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-2xl py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            aria-label="Quay vòng may mắn"
          >
            {isSpinning ? 'Đang quay...' : 'QUAY!'}
          </button>

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
          
          {renderCollapsibleSection("Tùy Chọn Quay", isSpinOptionsOpen, setIsSpinOptionsOpen, "spinOptionsContent", (
            <div className="space-y-3">
              <div className="flex justify-around items-center mb-3">
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
                        aria-label={`Thời gian quay ${sec} giây`}
                      />
                      <span className="w-5 h-5 border-2 border-slate-500 rounded-full flex items-center justify-center peer-checked:border-pink-500 transition-all duration-150">
                        <span className="w-2.5 h-2.5 bg-pink-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-150"></span>
                      </span>
                      <span>{sec} giây</span>
                    </label>
                  );
                })}
              </div>
              <label htmlFor="autoShuffleCheckbox" className="flex items-center justify-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700 transition-colors">
                <input
                  type="checkbox"
                  id="autoShuffleCheckbox"
                  checked={autoShuffle}
                  onChange={(e) => setAutoShuffle(e.target.checked)}
                  disabled={isSpinning}
                  className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800 disabled:opacity-60"
                />
                <span>Tự động trộn danh sách sau mỗi lần quay</span>
              </label>
            </div>
          ))}
          
          {renderCollapsibleSection("Tùy Chỉnh Vòng Quay", isWheelCustomizationOpen, setIsWheelCustomizationOpen, "wheelCustomizationContent", (
            <div className="space-y-3">
              <button
                onClick={() => openImageModal('centerLogo')}
                disabled={isSpinning}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Chọn logo trung tâm"
              >
                Chọn Logo Trung Tâm
              </button>
              {centerImageSrc && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={isSpinning}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  aria-label="Xóa logo trung tâm"
                >
                  Xóa Logo Trung Tâm
                </button>
              )}
              <button
                onClick={() => openImageModal('wheelBackground')}
                disabled={isSpinning}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                aria-label="Chọn ảnh nền cho vòng quay"
              >
                Chọn Ảnh Nền Vòng Quay
              </button>
              {wheelBackgroundImageSrc && (
                <button
                  onClick={handleRemoveWheelBackground}
                  disabled={isSpinning}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  aria-label="Xóa ảnh nền vòng quay"
                >
                  Xóa Ảnh Nền Vòng Quay
                </button>
              )}
            </div>
          ))}

        </div>
      </main>
      <footer className="text-slate-500 text-sm mt-auto pt-6">
        Được xây dựng bởi iRace.vn ❤️
      </footer>

      <WinnerModal
        isOpen={showWinnerModal}
        winnerName={selectedName} 
        winnerItem={selectedItem} 
        imageStore={imageStore}   
        onClose={handleCloseWinnerModal}
        onRemove={handleRemoveWinner}
      />

      <ImageSelectionModal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setImageSelectionPurpose(null);
        }}
        onImageSelected={handleImageSelected}
        purposeTitle={imageSelectionPurpose === 'centerLogo' ? 'Chọn Logo Trung Tâm' : imageSelectionPurpose === 'wheelBackground' ? 'Chọn Ảnh Nền Vòng Quay' : 'Chọn Hình Ảnh'}
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
    