
import React, { useRef, useEffect, useCallback, useLayoutEffect, useState } from 'react'; // Added useState for sliderTooltip
import WheelCanvas from './components/WheelCanvas';
import NameInput from './components/NameInput';
import WinnerModal from './components/WinnerModal';
import ImageSelectionModal from './components/ImageSelectionModal';
import GiftManagement from './components/GiftManagement';
import ConfirmationModal from './components/ConfirmationModal';
import BoostWinRateInput from './components/BoostWinRateInput';
import WheelBackgroundColorPicker from './components/WheelBackgroundColorPicker';
import AppBackgroundColorPicker from './components/AppBackgroundColorPicker';
import WheelTextColorPicker from './components/WheelTextColorPicker';
import TitleTextEditor from './components/TitleTextEditor';
import TitleColorPicker from './components/TitleColorPicker';
import TickSoundSelector from './components/TickSoundSelector';
import type { 
    WinnerHistoryItem, 
    GiftItem, 
    BoostedParticipant, 
    AppGlobalBackground, 
    SoundOption, // Corrected import
    GiftAwardHistoryItem, // Added import
    NonGiftWinnerHistoryItem // Added import
} from './types';
import { useNotification } from './components/NotificationContext';

// Hooks
import { useWheelData } from './hooks/useWheelData';
import { useInterfaceState } from './hooks/useInterfaceState';
import { useWheelCustomization } from './hooks/useWheelCustomization';
import { useAppAppearance } from './hooks/useAppAppearance';
import { useSoundManagement } from './hooks/useSoundManagement';
import { useSpinControls } from './hooks/useSpinControls';
import { useWinnerManagement } from './hooks/useWinnerManagement'; // WinnerData already exported by this
import { useSpinMechanics } from './hooks/useSpinMechanics'; // WinnerDataParam already exported

export interface ImageAsset { 
  dataURL: string;
  fileName: string;
}
export type ImageStore = Record<string, ImageAsset>; 
// Define SpinOptionTab here as it's specific to App's tab logic for "Spin Options"
export type SpinOptionTab = 'beforeSpin' | 'duringSpin' | 'afterSpin'; 

export const CUSTOM_SOUND_URL_PLACEHOLDER = "custom_sound_placeholder_url"; 

const AVAILABLE_TICK_SOUNDS_APP: SoundOption[] = [
  { name: "Âm kim loại", url: "https://irace.vn/wp-content/uploads/2025/06/am-thanh-quay-3.mp3" },
  { name: "Chiếc nón kỳ diệu", url: "https://irace.vn/wp-content/uploads/2025/06/chiec_non_ly_dieu.mp3", fixedDuration: 20, isContinuous: true },
  { name: "Tiếng Trống (8s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng-trong-8s.mp3", fixedDuration: 8, isContinuous: true },
  { name: "Tiếng trống (16s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng-trong-16s.mp3", fixedDuration: 16, isContinuous: true },
  { name: "Tiếng trống (20s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng_trong-20s.mp3", fixedDuration: 20, isContinuous: true },
];
const DEFAULT_TICK_SOUND_URL_APP = AVAILABLE_TICK_SOUNDS_APP[0].url;


const App: React.FC = () => {
  const { addNotification } = useNotification();
  const appContainerRef = useRef<HTMLDivElement>(null);
  const wheelWrapperRef = useRef<HTMLDivElement>(null);
  const spinDurationSliderRef = useRef<HTMLInputElement>(null); 

  const wheelData = useWheelData(['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thu Hà', 'Hoàng Đức Hải', 'Vũ Ngọc Lan', 'Đặng Tiến Dũng', 'Bùi Thanh Mai']);
  const interfaceState = useInterfaceState();
  const wheelCustomization = useWheelCustomization();
  const appAppearance = useAppAppearance(appContainerRef);
  const soundManagement = useSoundManagement(AVAILABLE_TICK_SOUNDS_APP, DEFAULT_TICK_SOUND_URL_APP);
  const spinControls = useSpinControls(
    soundManagement.selectedTickSoundUrl,
    soundManagement.customSoundDurationSeconds,
    AVAILABLE_TICK_SOUNDS_APP
  );

  const winnerManagement = useWinnerManagement(
    () => wheelData.names,
    wheelData.setNames,
    () => wheelData.imageStore,
    () => wheelData.priorityNamesInput,
    wheelData.setPriorityNamesInput,
    () => wheelData.boostedParticipants,
    wheelData.setBoostedParticipants,
    () => wheelData.giftList,
    wheelData.setGiftList,
    () => spinControls.autoRemoveWinner,
    () => spinControls.autoShuffle,
    () => spinControls.useGiftList,
    interfaceState.setShowConfetti
  );

  const spinMechanics = useSpinMechanics({
    names: wheelData.names,
    imageStore: wheelData.imageStore,
    boostedParticipants: wheelData.boostedParticipants,
    parsedPriorityNames: wheelData.parsedPriorityNames,
    showBoostWinRateSectionInTab: interfaceState.showBoostWinRateSectionInTab, 
    spinDuration: spinControls.spinDuration,
    useGiftList: spinControls.useGiftList,
    giftList: wheelData.giftList,
    activeTickSoundElement: soundManagement.activeTickSoundElement,
    activeSoundIsContinuous: soundManagement.activeSoundIsContinuous,
    playTickSoundContinuousStart: soundManagement.playTickSoundContinuousStart,
    playTickSoundContinuousStop: soundManagement.playTickSoundContinuousStop,
    playWinSound: soundManagement.playWinSound,
    onSpinComplete: winnerManagement.addWinnerToHistoryAndDisplay,
    wheelWrapperRef: wheelWrapperRef,
  });
  
  const [sliderThumbPositionStyle, setSliderThumbPositionStyle] = useState({ left: '0%' });
  const [showSpinDurationTooltip, setShowSpinDurationTooltip] = useState(false);
  const [wheelAreaDimension, setWheelAreaDimension] = useState(500);


  const handleNamesUpdateCombined = useCallback((newNamesFromInput: string[]) => {
    wheelData.handleNamesUpdate(newNamesFromInput, spinMechanics.isSpinning, winnerManagement.showWinnerModal);
    if (!spinMechanics.isSpinning && !winnerManagement.showWinnerModal) {
      // Potentially reset rotation here directly if not handled by spinMechanics reset
      // spinMechanics.setCurrentRotation(prev => prev % (2 * Math.PI)); // Example
    }
  }, [wheelData, spinMechanics.isSpinning, winnerManagement.showWinnerModal]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (interfaceState.showClearHistoryConfirmModal) interfaceState.setShowClearHistoryConfirmModal(false);
        if (winnerManagement.showWinnerModal) winnerManagement.handleCloseWinnerModalLogic();
        if (interfaceState.isImageModalOpen) interfaceState.closeImageModal();
      }
      if (event.ctrlKey && event.altKey && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        interfaceState.setShowPriorityInputSection(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    interfaceState.showClearHistoryConfirmModal, interfaceState.setShowClearHistoryConfirmModal,
    winnerManagement.showWinnerModal, winnerManagement.handleCloseWinnerModalLogic,
    interfaceState.isImageModalOpen, interfaceState.closeImageModal,
    interfaceState.setShowPriorityInputSection // Added dependency
  ]);
  
    useEffect(() => {
    const updateWheelAreaDimension = () => {
        let targetContainerWidth;
        let maxHeightConstraint;
        const availableHeight = window.innerHeight;
        const verticalPadding = 40; 
        const minSize = 250;

        if (window.innerWidth < 1024) { 
            targetContainerWidth = window.innerWidth * 0.95;
            maxHeightConstraint = availableHeight * 0.70 - verticalPadding;
        } else { 
            targetContainerWidth = window.innerWidth * 0.55; 
            maxHeightConstraint = availableHeight * 0.80 - verticalPadding; 
        }
        let newSize = Math.min(targetContainerWidth, maxHeightConstraint);
        newSize = Math.max(minSize, newSize); 
        setWheelAreaDimension(newSize);
    };
    updateWheelAreaDimension();
    window.addEventListener('resize', updateWheelAreaDimension);
    return () => {
        window.removeEventListener('resize', updateWheelAreaDimension);
        if (spinMechanics.animationFrameIdRef.current) { 
            cancelAnimationFrame(spinMechanics.animationFrameIdRef.current);
        }
    };
  }, [spinMechanics.animationFrameIdRef]);


  useLayoutEffect(() => {
    const sliderElement = spinDurationSliderRef.current;
    if (!sliderElement) {
      setSliderThumbPositionStyle({ left: '0%' });
      return;
    }
    const inputWidth = sliderElement.offsetWidth;
    if (inputWidth === 0) {
      return;
    }
    const thumbWidthEstimate = parseFloat(getComputedStyle(sliderElement).getPropertyValue('--slider-thumb-size')) || 16;
    const val = spinControls.spinDuration / 1000;
    const min = parseFloat(sliderElement.min);
    const max = parseFloat(sliderElement.max);
    const valueRange = max - min;
    let valuePercentDecimal = valueRange > 0 ? (val - min) / valueRange : (val >= max ? 1 : 0);
    valuePercentDecimal = Math.max(0, Math.min(1, valuePercentDecimal));
    sliderElement.style.setProperty('--value-percent', `${valuePercentDecimal * 100}%`);
    const thumbLeftEdgePx = valuePercentDecimal * (inputWidth - thumbWidthEstimate);
    const thumbCenterPx = thumbLeftEdgePx + (thumbWidthEstimate / 2);
    let leftPercentage = (thumbCenterPx / inputWidth) * 100;
    leftPercentage = Math.max(0, Math.min(100, leftPercentage));
    setSliderThumbPositionStyle({ left: `${leftPercentage}%` });
  }, [spinControls.spinDuration, wheelAreaDimension, showSpinDurationTooltip, spinControls.isSpinDurationLocked, soundManagement.selectedTickSoundUrl, soundManagement.customSoundDurationSeconds]);


  const handleSpinWheelAttempt = () => {
    if (spinControls.useGiftList) {
      const currentGift = wheelData.giftList.find(g => g.quantity > 0);
      if (!currentGift) {
        addNotification("Tất cả các phần quà đã được trao hoặc danh sách quà trống!", 'info');
        return;
      }
    }
    spinMechanics.spinWheel(); 
  };

  const getSpinButtonText = () => {
    if (spinMechanics.isSpinning) return 'Đang quay...';
    if (spinControls.useGiftList) {
      const currentGift = wheelData.giftList.find(g => g.quantity > 0);
      if (currentGift) return `QUAY CHO "${currentGift.title}"!`;
      return 'Hết Quà!';
    }
    return 'QUAY!';
  };

  const isSpinDisabled = () => {
    if (spinMechanics.isSpinning || wheelData.names.length === 0) return true;
    if (spinControls.useGiftList && !wheelData.giftList.some(g => g.quantity > 0)) return true;
    return false;
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

  const sanitizeForTSV = (text: string | undefined): string => {
    if (text === undefined || text === null) return '';
    return text.toString().replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
  };

  const handleCopyResults = async () => {
    if (winnerManagement.winnerHistory.length === 0) {
      addNotification("Không có kết quả để sao chép.", 'info');
      return;
    }
    const header = "Loại Giải thưởng\tTên Phần Quà\tNgười Trúng\tLà Hình Ảnh\tThời Gian\n";
    const rows = winnerManagement.winnerHistory.map(item => {
      const timestamp = new Date(item.timestamp).toLocaleString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
      const isImage = item.winner.isImage ? "Có" : "Không";
      const winnerNameOutput = sanitizeForTSV(item.winner.displayName);
      if (item.type === 'gift') {
        const giftTitle = sanitizeForTSV(item.giftTitle);
        const giftAwardedName = sanitizeForTSV(item.giftAwardedName);
        return `${giftTitle}\t${giftAwardedName}\t${winnerNameOutput}\t${isImage}\t${timestamp}`;
      } else {
        return `Vòng Quay Thường\t-\t${winnerNameOutput}\t${isImage}\t${timestamp}`;
      }
    }).join('\n');
    const tsvContent = header + rows;
    try {
      await navigator.clipboard.writeText(tsvContent);
      addNotification("Đã sao chép kết quả vào clipboard!", 'success');
    } catch (err) {
      addNotification("Lỗi: Không thể sao chép.", 'error');
    }
  };
  
  const sliderMinVal = 5;
  const sliderMaxVal = (soundManagement.selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && soundManagement.customSoundDurationSeconds !== null)
      ? Math.floor(soundManagement.customSoundDurationSeconds)
      : (spinControls.isSpinDurationLocked ? spinControls.spinDuration / 1000 : 60);
  
  const calculateLeftPercent = (val: number, min: number, max: number): string => {
    if (max === min) return '50%'; 
    const percentage = ((val - min) / (max - min)) * 100;
    return `${Math.max(0, Math.min(100, percentage))}%`;
  };

  const durationLabels: { value: number; text: string }[] = [];
  durationLabels.push({ value: sliderMinVal, text: `${sliderMinVal}s`});
  const p2Value = (soundManagement.selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && soundManagement.customSoundDurationSeconds !== null) 
      ? Math.round(sliderMinVal + (sliderMaxVal - sliderMinVal) / 3) 
      : 20;
  if (p2Value > sliderMinVal && p2Value < sliderMaxVal) {
      durationLabels.push({ value: p2Value, text: `${p2Value}s`});
  }
  const p3Value = (soundManagement.selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && soundManagement.customSoundDurationSeconds !== null)
      ? Math.round(sliderMinVal + (sliderMaxVal - sliderMinVal) * 2 / 3) 
      : 40;
  if (p3Value > sliderMinVal && p3Value < sliderMaxVal && (!durationLabels.some(l => l.value === p3Value) || p3Value > p2Value) ) {
      if (durationLabels.some(l => l.value === p2Value) && p3Value <= p2Value) { /* empty */ } else {
        durationLabels.push({ value: p3Value, text: `${p3Value}s`});
      }
  }
  if (sliderMaxVal > sliderMinVal && !durationLabels.some(l=>l.value === sliderMaxVal)) {
      durationLabels.push({ value: sliderMaxVal, text: `${sliderMaxVal}s`});
  }
  const uniqueDurationLabels = durationLabels
    .sort((a, b) => a.value - b.value)
    .filter((point, index, self) => index === self.findIndex(p => p.value === point.value));

  const renderTabContent = () => {
    if (interfaceState.activeTab === 'nameInput') {
      return (
        <>
          <h2 className="text-2xl font-bold text-pink-400 mb-4 text-center">Nhập Tên hoặc Thêm Ảnh</h2>
          <NameInput
            currentNames={wheelData.names}
            imageStore={wheelData.imageStore}
            onNamesChange={handleNamesUpdateCombined}
            addNewImageToWheel={wheelData.addNewImageToWheel}
            isSpinning={spinMechanics.isSpinning || winnerManagement.showWinnerModal}
          />
        </>
      );
    }
    if (interfaceState.activeTab === 'results') {
      const groupedHistoryTyped: Record<string, GiftAwardHistoryItem[]> = {};
      const standardHistoryTyped: NonGiftWinnerHistoryItem[] = [];

      winnerManagement.winnerHistory.forEach(item => {
        if (item.type === 'gift') {
          if (!groupedHistoryTyped[item.giftTitle]) {
            groupedHistoryTyped[item.giftTitle] = [];
          }
          groupedHistoryTyped[item.giftTitle].push(item as GiftAwardHistoryItem);
        } else {
          standardHistoryTyped.push(item as NonGiftWinnerHistoryItem);
        }
      });
      for (const title in groupedHistoryTyped) {
        groupedHistoryTyped[title].sort((a, b) => b.timestamp - a.timestamp);
      }
      standardHistoryTyped.sort((a, b) => b.timestamp - a.timestamp);

      return (
        <>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <h2 className="text-2xl font-bold text-pink-400">Kết Quả Quay</h2>
            <div className="flex gap-2">
               <button
                onClick={handleCopyResults}
                disabled={winnerManagement.winnerHistory.length === 0 || spinMechanics.isSpinning}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Sao chép kết quả quay"
              >
                Sao chép Kết quả
              </button>
              <button
                onClick={() => interfaceState.setShowClearHistoryConfirmModal(true)}
                disabled={winnerManagement.winnerHistory.length === 0 || spinMechanics.isSpinning}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Xóa lịch sử kết quả"
              >
                Xóa Kết Quả
              </button>
            </div>
          </div>
          {winnerManagement.winnerHistory.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 winner-history-list custom-scrollbar">
              {Object.entries(groupedHistoryTyped).map(([giftTitle, items]) => (
                <div key={giftTitle} className="mb-3">
                  <h3 className="text-lg font-semibold text-sky-400 mb-1 sticky top-0 bg-slate-800 py-1">{giftTitle}</h3>
                  <ul className="space-y-1 pl-2">
                    {items.map((item, index) => (
                      <li key={`${item.timestamp}-${index}`} className="text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md flex items-center gap-2">
                        {item.winner.isImage && item.winner.imageDataURL ? (
                          <img src={item.winner.imageDataURL} alt={item.winner.displayName} className="w-6 h-6 object-cover rounded-full flex-shrink-0"/>
                        ) : <span className="w-6 h-6 flex-shrink-0 text-center">👤</span>}
                        <span className="truncate flex-grow">{item.winner.displayName} (<span className="italic text-slate-400">{item.giftAwardedName}</span>)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {standardHistoryTyped.length > 0 && (
                 <div className="mb-3">
                  {Object.keys(groupedHistoryTyped).length > 0 && <h3 className="text-lg font-semibold text-sky-400 mb-1 sticky top-0 bg-slate-800 py-1">Vòng quay thường</h3>}
                  <ul className="space-y-1 pl-2">
                  {standardHistoryTyped.map((item, index) => (
                     <li key={`${item.timestamp}-${index}`} className="text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md flex items-center gap-2">
                        {item.winner.isImage && item.winner.imageDataURL ? (
                          <img src={item.winner.imageDataURL} alt={item.winner.displayName} className="w-6 h-6 object-cover rounded-full flex-shrink-0"/>
                        ) : <span className="w-6 h-6 flex-shrink-0 text-center">👤</span> }
                        <span className="truncate flex-grow">{item.winner.displayName}</span>
                      </li>
                  ))}
                  </ul>
                 </div>
              )}
            </div>
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
    children: React.ReactNode,
    isTabbed: boolean = false 
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
          <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>▼</span>
        </button>
        {isOpen && (
          <div id={contentId} className={`border-t border-slate-700 ${isTabbed ? '' : 'p-4'}`}>
            {children}
          </div>
        )}
      </div>
    );
  };
  
  const titleLinesSplit = appAppearance.titleText.split('\n');
  const mainTitleText = titleLinesSplit[0] || "";
  const subTitleText = titleLinesSplit.length > 1 ? titleLinesSplit.slice(1).join('\n') : "";

  return (
    <div 
        ref={appContainerRef} 
        className="min-h-screen text-slate-100 flex flex-col items-center p-4 space-y-6" 
    >
      <style>{`
        @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
        .animate-fall { animation-name: fall; animation-timing-function: ease-out; }
        .winner-history-list::-webkit-scrollbar { width: 6px; } .winner-history-list::-webkit-scrollbar-track { background: #334155; border-radius: 8px; }
        .winner-history-list::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 8px; } .winner-history-list::-webkit-scrollbar-thumb:hover { background: #6d28d9; }
      `}</style>
      
      <header className="text-center">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl" style={{ lineHeight: 'normal' }}>
          {(() => {
            const renderStyledLine = (text: string, isSub: boolean) => {
              if (!text.trim() && isSub) return null;
              const colorConfig = appAppearance.titleColorConfig;
              if (colorConfig === null) { 
                return isSub ? ( <span className="block text-purple-400 text-3xl mt-1">{text}</span> ) : 
                               ( <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">{text}</span> );
              } else { 
                let style: React.CSSProperties = {};
                let baseClassName = "block";
                if (isSub) baseClassName += " text-3xl mt-1"; 
                if (typeof colorConfig === 'string') { style.color = colorConfig;
                } else { 
                  const sortedStops = [...colorConfig.stops].sort((a, b) => a.position - b.position);
                  const stopsString = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
                  if (colorConfig.type === 'linear-gradient') { style.backgroundImage = `linear-gradient(${colorConfig.angle}deg, ${stopsString})`;
                  } else { style.backgroundImage = `radial-gradient(${colorConfig.shape} at ${colorConfig.position}, ${stopsString})`; }
                  baseClassName += " text-transparent bg-clip-text";
                  style.WebkitBackgroundClip = 'text'; style.backgroundClip = 'text';
                }
                return <span className={baseClassName} style={style}>{text}</span>;
              }
            };
            return ( <> {renderStyledLine(mainTitleText, false)} {subTitleText && renderStyledLine(subTitleText, true)} </> );
          })()}
        </h1>
      </header>

      <main className="flex flex-col lg:flex-row items-start justify-around w-full max-w-screen-2xl gap-6 lg:gap-10">
        <div ref={wheelWrapperRef} className="relative flex-shrink-0 w-full lg:w-auto aspect-square mx-auto lg:mx-0" 
             style={{maxWidth: `${wheelAreaDimension}px`, maxHeight: `${wheelAreaDimension}px` }}>
          <WheelCanvas
            names={wheelData.names}
            imageStore={wheelData.imageStore}
            boostedParticipants={interfaceState.showBoostWinRateSectionInTab ? wheelData.boostedParticipants : []}
            rotationAngle={spinMechanics.currentRotation}
            canvasSize={wheelAreaDimension * 0.9}
            centerImageSrc={wheelCustomization.centerImageSrc}
            wheelBackgroundImageSrc={wheelCustomization.wheelBackgroundImageSrc}
            dynamicBackgroundColor={wheelCustomization.wheelDynamicBackground}
            wheelTextColor={wheelCustomization.wheelTextColor}
            onWheelClick={handleSpinWheelAttempt}
            tickSound={soundManagement.activeSoundIsContinuous ? null : soundManagement.activeTickSoundElement}
            isTickSoundContinuous={soundManagement.activeSoundIsContinuous}
          />
        </div>

        <div className="flex flex-col items-center space-y-5 w-full lg:max-w-md xl:max-w-lg">
          <div className="w-full grid grid-cols-2 border-b border-slate-700 mb-0">
            <button onClick={() => interfaceState.setActiveTab('nameInput')} aria-pressed={interfaceState.activeTab === 'nameInput'}
              className={`w-full py-3 px-4 font-medium text-center transition-colors duration-150 ease-in-out ${interfaceState.activeTab === 'nameInput' ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500' : 'bg-slate-700 text-slate-400 hover:text-pink-300 hover:bg-slate-600'} rounded-t-lg focus:outline-none focus:ring-2 focus:ring-pink-500`}>
              Nhập Liệu
            </button>
            <button onClick={() => interfaceState.setActiveTab('results')} aria-pressed={interfaceState.activeTab === 'results'}
              className={`w-full py-3 px-4 font-medium text-center transition-colors duration-150 ease-in-out ${interfaceState.activeTab === 'results' ? 'bg-slate-800 text-pink-400 border-b-2 border-pink-500' : 'bg-slate-700 text-slate-400 hover:text-pink-300 hover:bg-slate-600'} rounded-t-lg focus:outline-none focus:ring-2 focus:ring-pink-500`}>
              Kết quả
            </button>
          </div>
          
          <div className="w-full p-6 bg-slate-800 rounded-b-xl shadow-2xl">
            {renderTabContent()}
          </div>
          
          <button onClick={handleSpinWheelAttempt} disabled={isSpinDisabled()}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-2xl py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
            {getSpinButtonText()}
          </button>

          {interfaceState.showPriorityInputSection && (
            <div className="w-full p-6 bg-slate-800 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-sky-400">Người Chiến Thắng Ưu Tiên</h2>
                <button onClick={() => interfaceState.setShowPriorityInputSection(false)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 px-3 rounded-md">Ẩn</button>
              </div>
              <textarea value={wheelData.priorityNamesInput} onChange={(e) => wheelData.setPriorityNamesInput(e.target.value)}
                placeholder="Nhập tên ưu tiên, cách nhau bằng dấu phẩy hoặc xuống dòng..." rows={3}
                className="w-full p-3 border border-slate-700 rounded-lg bg-slate-900 text-slate-200 focus:ring-2 focus:ring-sky-500 custom-scrollbar"
                disabled={spinMechanics.isSpinning || winnerManagement.showWinnerModal} />
              <p className="text-xs text-slate-500 mt-2 text-center">Ctrl+Alt+K để Hiện/Ẩn.</p>
            </div>
          )}
          
          {renderCollapsibleSection("Tùy Chọn Quay", interfaceState.isSpinOptionsOpen, interfaceState.setIsSpinOptionsOpen, "spinOptionsContent", (
            <>
              <div className="w-full grid grid-cols-3 border-b border-slate-700 mb-0">
                {(['beforeSpin', 'duringSpin', 'afterSpin'] as SpinOptionTab[]).map(tab => (
                  <button key={tab} onClick={() => interfaceState.setActiveSpinOptionTab(tab)} aria-pressed={interfaceState.activeSpinOptionTab === tab}
                    className={`w-full py-2.5 px-3 text-sm font-medium text-center transition-colors duration-150 ease-in-out ${spinMechanics.isSpinning ? 'cursor-not-allowed' : ''} ${ interfaceState.activeSpinOptionTab === tab ? 'bg-slate-700/70 text-pink-400 border-b-2 border-pink-500' : 'bg-transparent text-slate-400 hover:text-pink-300 hover:bg-slate-700/30'} focus:outline-none focus:ring-1 focus:ring-pink-400`}
                    disabled={spinMechanics.isSpinning}>
                    {tab === 'beforeSpin' ? 'Trước khi quay' : tab === 'duringSpin' ? 'Trong khi quay' : 'Sau khi quay'}
                  </button>
                ))}
              </div>
              <div className="p-4 space-y-4">
                {interfaceState.activeSpinOptionTab === 'beforeSpin' && (
                  <>
                    <label htmlFor="useGiftListCheckbox" className="flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      <input type="checkbox" id="useGiftListCheckbox" checked={spinControls.useGiftList} onChange={(e) => spinControls.setUseGiftList(e.target.checked)}
                        disabled={spinMechanics.isSpinning} className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800"/>
                      <span>Nhập danh sách quà</span>
                    </label>
                    {spinControls.useGiftList && <GiftManagement giftList={wheelData.giftList} setGiftList={wheelData.setGiftList} isSpinning={spinMechanics.isSpinning}/>}
                    <label htmlFor="showBoostWinRateCheckbox" className="flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors mt-4">
                      <input type="checkbox" id="showBoostWinRateCheckbox" checked={interfaceState.showBoostWinRateSectionInTab} onChange={(e) => interfaceState.setShowBoostWinRateSectionInTab(e.target.checked)}
                        disabled={spinMechanics.isSpinning} className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800"/>
                      <span>Tăng tỉ lệ thắng</span>
                    </label>
                    {interfaceState.showBoostWinRateSectionInTab && (
                      <div className="mt-2 p-3 border border-slate-600 rounded-lg bg-slate-800/40">
                        <BoostWinRateInput boostedParticipants={wheelData.boostedParticipants} setBoostedParticipants={wheelData.setBoostedParticipants}
                          isSpinning={spinMechanics.isSpinning} namesOnWheel={wheelData.names} imageStore={wheelData.imageStore}/>
                      </div>
                    )}
                  </>
                )}
                {interfaceState.activeSpinOptionTab === 'duringSpin' && (
                  <>
                    <div className="my-2">
                      <label htmlFor="spinDurationSlider" className="block text-sm font-medium text-slate-300 mb-2 text-center">
                        Thời gian quay (<span className="font-bold text-blue-400">{spinControls.spinDuration / 1000}</span> giây)
                        {spinControls.isSpinDurationLocked && <span className="text-xs text-yellow-400"> (Bị khóa)</span>}
                        {soundManagement.selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && soundManagement.customSoundDurationSeconds &&
                         <span className="text-xs text-green-400"> (Tối đa: {soundManagement.customSoundDurationSeconds.toFixed(1)}s)</span>}
                      </label>
                       <div className="relative px-1 py-3">
                        <input ref={spinDurationSliderRef} type="range" id="spinDurationSlider" min="5" max={sliderMaxVal} value={spinControls.spinDuration / 1000}
                          onChange={(e) => {
                            if (spinMechanics.isSpinning || spinControls.isSpinDurationLocked) {
                                if(spinControls.isSpinDurationLocked) addNotification("Thời gian quay bị khóa bởi âm thanh đặt trước.", "info");
                                return;
                            }
                            let newDurationSeconds = parseInt(e.target.value, 10);
                            if (soundManagement.selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && soundManagement.customSoundDurationSeconds !== null) {
                                if (newDurationSeconds > soundManagement.customSoundDurationSeconds) {
                                    addNotification(`Thời gian quay tối đa cho âm thanh tùy chỉnh này là ${soundManagement.customSoundDurationSeconds.toFixed(1)} giây.`, 'error');
                                    newDurationSeconds = Math.floor(soundManagement.customSoundDurationSeconds);
                                }
                            }
                            spinControls.setSpinDuration(newDurationSeconds * 1000);
                          }}
                          onMouseEnter={() => setShowSpinDurationTooltip(true)} onMouseLeave={() => setShowSpinDurationTooltip(false)}
                          disabled={spinMechanics.isSpinning || spinControls.isSpinDurationLocked}
                          className="w-full h-auto bg-transparent appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"/>
                        <div className={`slider-tooltip ${showSpinDurationTooltip ? 'visible' : ''}`} style={sliderThumbPositionStyle} aria-hidden="true">
                          {spinControls.spinDuration / 1000}s
                        </div>
                      </div>
                      <div className="relative h-4 text-xs text-slate-400 mt-0.5 px-1">
                        {uniqueDurationLabels.map(label => {
                            const leftPos = calculateLeftPercent(label.value, sliderMinVal, sliderMaxVal);
                            let transform = 'translateX(-50%)';
                            if (label.value === sliderMinVal && parseFloat(leftPos) < 5) transform = 'translateX(0%)'; 
                            if (label.value === sliderMaxVal && parseFloat(leftPos) > 95) transform = 'translateX(-100%)'; 
                            if (label.value === sliderMinVal && leftPos === "0%") transform = 'none';
                            if (label.value === sliderMaxVal && leftPos === "100%") transform = 'translateX(-100%)';
                            return (<span key={`label-${label.value}`} style={{ position: 'absolute', left: leftPos, transform: transform }} className="whitespace-nowrap">{label.text}</span>);
                        })}
                      </div>
                    </div>
                    <TickSoundSelector availableSounds={AVAILABLE_TICK_SOUNDS_APP} currentSoundUrl={soundManagement.selectedTickSoundUrl}
                      customSoundName={soundManagement.customSoundName} customSoundDataUrl={soundManagement.customSoundDataUrl}
                      onSoundConfigChange={soundManagement.handleSoundConfigChange} isSpinning={spinMechanics.isSpinning}
                      tickVolume={soundManagement.tickSoundVolume} onTickVolumeChange={soundManagement.setTickSoundVolume}/>
                  </>
                )}
                {interfaceState.activeSpinOptionTab === 'afterSpin' && (
                  <div className="space-y-3">
                    <label htmlFor="autoShuffleCheckbox" className="flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      <input type="checkbox" id="autoShuffleCheckbox" checked={spinControls.autoShuffle} onChange={(e) => spinControls.setAutoShuffle(e.target.checked)}
                        disabled={spinMechanics.isSpinning} className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800"/>
                      <span>Tự động trộn danh sách sau mỗi lần quay</span>
                    </label>
                    <label htmlFor="autoRemoveWinnerCheckbox" className="flex items-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      <input type="checkbox" id="autoRemoveWinnerCheckbox" checked={spinControls.autoRemoveWinner} onChange={(e) => spinControls.setAutoRemoveWinner(e.target.checked)}
                        disabled={spinMechanics.isSpinning} className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800"/>
                      <span>Tự xóa người trúng sau mỗi lần quay</span>
                    </label>
                    {spinControls.autoRemoveWinner && <p className="text-xs text-yellow-400/90 text-center mt-0.5 px-2">Người thắng sẽ bị xóa khỏi danh sách quay, danh sách ưu tiên và danh sách tăng tỉ lệ.</p>}
                  </div>
                )}
              </div>
            </>
          ), true)} 
          
          {renderCollapsibleSection("Tùy Chỉnh Vòng Quay", interfaceState.isWheelCustomizationOpen, interfaceState.setIsWheelCustomizationOpen, "wheelCustomizationContent", (
            <div className="space-y-3">
              <button onClick={() => interfaceState.openImageModal('centerLogo')} disabled={spinMechanics.isSpinning}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed">Chọn Logo Trung Tâm</button>
              {wheelCustomization.centerImageSrc && (
                <button onClick={wheelCustomization.handleRemoveLogo} disabled={spinMechanics.isSpinning}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2">Xóa Logo Trung Tâm</button>
              )}
              <button onClick={() => interfaceState.openImageModal('wheelBackground')} disabled={spinMechanics.isSpinning}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2">Chọn Ảnh Nền Vòng Quay</button>
              {wheelCustomization.wheelBackgroundImageSrc && (
                <button onClick={wheelCustomization.handleRemoveWheelBackground} disabled={spinMechanics.isSpinning}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed mt-2">Xóa Ảnh Nền Vòng Quay</button>
              )}
               <div className="pt-3 border-t border-slate-700/50">
                 <WheelBackgroundColorPicker currentBackground={wheelCustomization.wheelDynamicBackground} onBackgroundChange={wheelCustomization.handleWheelDynamicBackgroundChange} isSpinning={spinMechanics.isSpinning}/>
               </div>
               <div className="pt-3 border-t border-slate-700/50">
                <WheelTextColorPicker currentTextColor={wheelCustomization.wheelTextColor} onTextColorChange={wheelCustomization.handleWheelTextColorChange}
                  defaultTextColor={wheelCustomization.DEFAULT_WHEEL_TEXT_COLOR_HOOK} isSpinning={spinMechanics.isSpinning}/>
               </div>
            </div>
          ))}

           {renderCollapsibleSection("🎨 Tùy Chỉnh Giao Diện Chung", interfaceState.isAppAppearanceOpen, interfaceState.setIsAppAppearanceOpen, "appAppearanceContent", (
              <div className="space-y-6">
                <TitleTextEditor currentTitleText={appAppearance.titleText} onTitleTextChange={appAppearance.handleTitleTextChange}
                  defaultTitleText={appAppearance.DEFAULT_TITLE_TEXT_HOOK} isSpinning={spinMechanics.isSpinning}/>
                <div className="pt-4 border-t border-slate-700/50">
                  <TitleColorPicker currentTitleColor={appAppearance.titleColorConfig} onTitleColorChange={appAppearance.handleTitleColorChange}
                    activeTitleText={appAppearance.titleText} isSpinning={spinMechanics.isSpinning}/>
                </div>
                <div className="pt-4 border-t border-slate-700/50">
                  <AppBackgroundColorPicker currentBackground={appAppearance.appGlobalBackground} onBackgroundChange={appAppearance.handleAppGlobalBackgroundChange} isSpinning={spinMechanics.isSpinning}/>
                </div>
              </div>
            ))}
        </div>
      </main>
      <footer className="text-slate-500 text-sm mt-auto pt-6">Được xây dựng bởi iRace.vn ❤️</footer>

      <WinnerModal isOpen={winnerManagement.showWinnerModal} winnerName={winnerManagement.selectedName} winnerItem={winnerManagement.selectedItem}
        imageStore={wheelData.imageStore} onClose={winnerManagement.handleCloseWinnerModalLogic} onRemove={winnerManagement.handleRemoveWinnerManually}
        autoRemoveWinnerActive={spinControls.autoRemoveWinner} giftDetails={winnerManagement.currentGiftForModal}/>

      <ImageSelectionModal isOpen={interfaceState.isImageModalOpen} onClose={interfaceState.closeImageModal}
        onImageSelected={(src) => wheelCustomization.handleImageSelectedForWheel(src, interfaceState.imageSelectionPurpose)}
        purposeTitle={interfaceState.imageSelectionPurpose === 'centerLogo' ? 'Chọn Logo Trung Tâm' : interfaceState.imageSelectionPurpose === 'wheelBackground' ? 'Chọn Ảnh Nền Vòng Quay' : 'Chọn Hình Ảnh'}/>

      <ConfirmationModal isOpen={interfaceState.showClearHistoryConfirmModal} onClose={() => interfaceState.setShowClearHistoryConfirmModal(false)}
        onConfirm={winnerManagement.clearWinnerHistory} title="Xác nhận xóa lịch sử"
        message="Bạn có chắc chắn muốn xóa toàn bộ lịch sử kết quả quay không? Hành động này không thể hoàn tác." confirmButtonText="Xóa Tất Cả" confirmButtonVariant="danger"/>

      {interfaceState.showConfetti && (
        <div className="fixed inset-0 w-screen h-screen pointer-events-none z-[100] overflow-hidden">
          {Array.from({ length: 150 }).map((_, i) => <ConfettiPiece key={i} id={i} />)}
        </div>
      )}
    </div>
  );
};

export default App;
