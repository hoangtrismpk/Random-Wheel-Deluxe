
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import WheelCanvas from './components/WheelCanvas';
import NameInput from './components/NameInput';
import WinnerModal from './components/WinnerModal';
import ImageSelectionModal from './components/ImageSelectionModal';
import GiftManagement from './components/GiftManagement'; // Component mới
import ConfirmationModal from './components/ConfirmationModal'; // Import ConfirmationModal
import BoostWinRateInput from './components/BoostWinRateInput'; // Import BoostWinRateInput
import WheelBackgroundColorPicker from './components/WheelBackgroundColorPicker'; // Import new component
import AppBackgroundColorPicker from './components/AppBackgroundColorPicker'; // Import new component for global background
import WheelTextColorPicker from './components/WheelTextColorPicker'; // Import new component for wheel text color
import TitleTextEditor from './components/TitleTextEditor'; // Import new component for title text
import TitleColorPicker from './components/TitleColorPicker'; // Import new component for title color
import TickSoundSelector from './components/TickSoundSelector'; // Import new component for tick sound
import InfoSection from './components/InfoSection'; // Import the new InfoSection component
import type { GiftItem, WinnerHistoryItem, WinnerDetails, GiftAwardHistoryItem, NonGiftWinnerHistoryItem, BoostedParticipant, WheelDynamicBackground, AppGlobalBackground } from './types'; // Kiểu dữ liệu mới
import { useNotification } from './components/NotificationContext'; // Import useNotification

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

// Fisher-Yates Shuffle Algorithm Helper
const shuffleArray = (array: string[]): string[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const DEFAULT_WHEEL_TEXT_COLOR = "#1F2937";
const DEFAULT_TITLE_TEXT = "Vòng Quay May Mắn\nPhiên Bản Đặc Biệt";

export interface SoundOption {
  name: string;
  url: string;
  fixedDuration?: number; // in seconds, locks spin duration
  isContinuous?: boolean; // If true, plays continuously during spin
}

export const CUSTOM_SOUND_URL_PLACEHOLDER = "custom_sound_placeholder_url";

const AVAILABLE_TICK_SOUNDS: SoundOption[] = [
  { name: "Âm kim loại", url: "https://irace.vn/wp-content/uploads/2025/06/am-thanh-quay-3.mp3" },
  { name: "Chiếc nón kỳ diệu", url: "https://irace.vn/wp-content/uploads/2025/06/chiec_non_ly_dieu.mp3", fixedDuration: 20, isContinuous: true },
  { name: "Tiếng Trống (8s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng-trong-8s.mp3", fixedDuration: 8, isContinuous: true },
  { name: "Tiếng trống (16s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng-trong-16s.mp3", fixedDuration: 16, isContinuous: true },
  { name: "Tiếng trống (20s)", url: "https://irace.vn/wp-content/uploads/2025/06/tieng_trong-20s.mp3", fixedDuration: 20, isContinuous: true },
];

const DEFAULT_TICK_SOUND_URL = AVAILABLE_TICK_SOUNDS[0].url;
const DEFAULT_SPIN_DURATION_MS = 10000;


type SpinOptionTab = 'beforeSpin' | 'duringSpin' | 'afterSpin';

// --- Configuration for Spin Animation Speed ---
const DESIRED_INITIAL_ANGULAR_VELOCITY_RAD_PER_MS = 0.025; 
const ABSOLUTE_MIN_TOTAL_SPINS = 4;
const EPSILON_FINISH = 0.001; // Small tolerance for comparing rotation angles (in radians)


const App: React.FC = () => {
  const [names, setNames] = useState<string[]>(['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thu Hà', 'Hoàng Đức Hải', 'Vũ Ngọc Lan', 'Đặng Tiến Dũng', 'Bùi Thanh Mai']);
  const [currentRotation, setCurrentRotation] = useState(0); // radians
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null); 
  const [selectedItem, setSelectedItem] = useState<string | null>(null); 
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinDuration, setSpinDuration] = useState<number>(DEFAULT_SPIN_DURATION_MS); 
  const [isSpinDurationLocked, setIsSpinDurationLocked] = useState<boolean>(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryItem[]>([]);
  const [wheelAreaDimension, setWheelAreaDimension] = useState(500); 
  
  const [centerImageSrc, setCenterImageSrc] = useState<string | null>(null);
  const [wheelBackgroundImageSrc, setWheelBackgroundImageSrc] = useState<string | null>(null);
  const [wheelDynamicBackground, setWheelDynamicBackground] = useState<WheelDynamicBackground>(null); 
  const [wheelTextColor, setWheelTextColor] = useState<string>(DEFAULT_WHEEL_TEXT_COLOR); 
  const [appGlobalBackground, setAppGlobalBackground] = useState<AppGlobalBackground>(null); 
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSelectionPurpose, setImageSelectionPurpose] = useState<'centerLogo' | 'wheelBackground' | null>(null);

  const [priorityNamesInput, setPriorityNamesInput] = useState<string>('');
  const [parsedPriorityNames, setParsedPriorityNames] = useState<string[]>([]);
  const [showPriorityInputSection, setShowPriorityInputSection] = useState(false);

  const [imageStore, setImageStore] = useState<ImageStore>({});
  const [autoShuffle, setAutoShuffle] = useState<boolean>(false);
  const [autoRemoveWinner, setAutoRemoveWinner] = useState<boolean>(false);
  const [pendingWinnerForAutoRemoval, setPendingWinnerForAutoRemoval] = useState<WinnerDetails | null>(null); 

  const [activeTab, setActiveTab] = useState<'nameInput' | 'results'>('nameInput');
  const [isSpinOptionsOpen, setIsSpinOptionsOpen] = useState<boolean>(false);
  const [activeSpinOptionTab, setActiveSpinOptionTab] = useState<SpinOptionTab>('beforeSpin');
  const [isWheelCustomizationOpen, setIsWheelCustomizationOpen] = useState<boolean>(false);
  const [isAppAppearanceOpen, setIsAppAppearanceOpen] = useState<boolean>(false); 
  const [showBoostWinRateSectionInTab, setShowBoostWinRateSectionInTab] = useState<boolean>(false); // New state

  const [useGiftList, setUseGiftList] = useState<boolean>(false);
  const [giftList, setGiftList] = useState<GiftItem[]>([]);
  const [currentGiftForModal, setCurrentGiftForModal] = useState<{ title: string; name: string } | null>(null);
  
  const { addNotification } = useNotification(); 

  const [showClearHistoryConfirmModal, setShowClearHistoryConfirmModal] = useState(false);

  const [boostedParticipants, setBoostedParticipants] = useState<BoostedParticipant[]>([]);

  const [titleText, setTitleText] = useState<string>(DEFAULT_TITLE_TEXT);
  const [titleColorConfig, setTitleColorConfig] = useState<AppGlobalBackground>(null);

  const [selectedTickSoundUrl, setSelectedTickSoundUrl] = useState<string>(DEFAULT_TICK_SOUND_URL);
  const [customSoundDataUrl, setCustomSoundDataUrl] = useState<string | null>(null);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);
  const [customSoundDurationSeconds, setCustomSoundDurationSeconds] = useState<number | null>(null);
  const [activeTickSoundElement, setActiveTickSoundElement] = useState<HTMLAudioElement | null>(null);
  const [tickSoundVolume, setTickSoundVolume] = useState<number>(1); 
  const [activeSoundIsContinuous, setActiveSoundIsContinuous] = useState<boolean>(false);
  const audioFadeIntervalRef = useRef<number | null>(null);
  
  const [sliderThumbPositionStyle, setSliderThumbPositionStyle] = useState({ left: '0%' });
  const [showSpinDurationTooltip, setShowSpinDurationTooltip] = useState(false);

  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState(true);


  const spinStartRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const winnerIndexRef = useRef(0);
  const confettiTimerRef = useRef<number | null>(null); 
  const wheelWrapperRef = useRef<HTMLDivElement>(null); 
  const appContainerRef = useRef<HTMLDivElement>(null); 
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  const winningGiftRef = useRef<GiftItem | null>(null);
  const spinDurationSliderRef = useRef<HTMLInputElement>(null); 


  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem('wheelOfFortuneState');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        
        if (savedState.names !== undefined) setNames(savedState.names);
        if (savedState.imageStore !== undefined) setImageStore(savedState.imageStore);
        if (savedState.winnerHistory !== undefined) setWinnerHistory(savedState.winnerHistory);
        if (savedState.centerImageSrc !== undefined) setCenterImageSrc(savedState.centerImageSrc);
        if (savedState.wheelBackgroundImageSrc !== undefined) setWheelBackgroundImageSrc(savedState.wheelBackgroundImageSrc);
        if (savedState.wheelDynamicBackground !== undefined) setWheelDynamicBackground(savedState.wheelDynamicBackground);
        if (savedState.wheelTextColor !== undefined) setWheelTextColor(savedState.wheelTextColor);
        if (savedState.appGlobalBackground !== undefined) setAppGlobalBackground(savedState.appGlobalBackground);
        if (savedState.priorityNamesInput !== undefined) setPriorityNamesInput(savedState.priorityNamesInput);
        if (typeof savedState.autoShuffle === 'boolean') setAutoShuffle(savedState.autoShuffle);
        if (typeof savedState.autoRemoveWinner === 'boolean') setAutoRemoveWinner(savedState.autoRemoveWinner);
        if (savedState.activeTab !== undefined) setActiveTab(savedState.activeTab);
        if (typeof savedState.isSpinOptionsOpen === 'boolean') setIsSpinOptionsOpen(savedState.isSpinOptionsOpen);
        if (savedState.activeSpinOptionTab !== undefined) setActiveSpinOptionTab(savedState.activeSpinOptionTab);
        if (typeof savedState.isWheelCustomizationOpen === 'boolean') setIsWheelCustomizationOpen(savedState.isWheelCustomizationOpen);
        if (typeof savedState.isAppAppearanceOpen === 'boolean') setIsAppAppearanceOpen(savedState.isAppAppearanceOpen);
        if (typeof savedState.showBoostWinRateSectionInTab === 'boolean') setShowBoostWinRateSectionInTab(savedState.showBoostWinRateSectionInTab);
        if (typeof savedState.useGiftList === 'boolean') setUseGiftList(savedState.useGiftList);
        if (savedState.giftList !== undefined) setGiftList(savedState.giftList);
        if (savedState.boostedParticipants !== undefined) setBoostedParticipants(savedState.boostedParticipants);
        if (savedState.titleText !== undefined) setTitleText(savedState.titleText);
        if (savedState.titleColorConfig !== undefined) setTitleColorConfig(savedState.titleColorConfig);
        if (savedState.selectedTickSoundUrl !== undefined) setSelectedTickSoundUrl(savedState.selectedTickSoundUrl);
        if (savedState.customSoundDataUrl !== undefined) setCustomSoundDataUrl(savedState.customSoundDataUrl);
        if (savedState.customSoundName !== undefined) setCustomSoundName(savedState.customSoundName);
        if (savedState.customSoundDurationSeconds !== undefined) setCustomSoundDurationSeconds(savedState.customSoundDurationSeconds);
        if (typeof savedState.tickSoundVolume === 'number') setTickSoundVolume(savedState.tickSoundVolume);
        if (typeof savedState.spinDuration === 'number') setSpinDuration(savedState.spinDuration);
        if (typeof savedState.isSpinDurationLocked === 'boolean') setIsSpinDurationLocked(savedState.isSpinDurationLocked);
      }
    } catch (error) {
      console.error("Could not load state from localStorage:", error);
      localStorage.removeItem('wheelOfFortuneState'); // Clear corrupted state
    }
  }, []); // Empty array ensures this runs only once on mount

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        names,
        imageStore,
        winnerHistory,
        centerImageSrc,
        wheelBackgroundImageSrc,
        wheelDynamicBackground,
        wheelTextColor,
        appGlobalBackground,
        priorityNamesInput,
        autoShuffle,
        autoRemoveWinner,
        activeTab,
        isSpinOptionsOpen,
        activeSpinOptionTab,
        isWheelCustomizationOpen,
        isAppAppearanceOpen,
        showBoostWinRateSectionInTab,
        useGiftList,
        giftList,
        boostedParticipants,
        titleText,
        titleColorConfig,
        selectedTickSoundUrl,
        customSoundDataUrl,
        customSoundName,
        customSoundDurationSeconds,
        tickSoundVolume,
        spinDuration,
        isSpinDurationLocked,
      };
      localStorage.setItem('wheelOfFortuneState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Could not save state to localStorage:", error);
    }
  }, [
    names, imageStore, winnerHistory, centerImageSrc, wheelBackgroundImageSrc, 
    wheelDynamicBackground, wheelTextColor, appGlobalBackground, priorityNamesInput, 
    autoShuffle, autoRemoveWinner, activeTab, isSpinOptionsOpen, activeSpinOptionTab, 
    isWheelCustomizationOpen, isAppAppearanceOpen, showBoostWinRateSectionInTab, 
    useGiftList, giftList, boostedParticipants, titleText, titleColorConfig, 
    selectedTickSoundUrl, customSoundDataUrl, customSoundName, customSoundDurationSeconds, 
    tickSoundVolume, spinDuration, isSpinDurationLocked
  ]);

  useEffect(() => {
    winSoundRef.current = new Audio("https://irace.vn/wp-content/uploads/2025/05/vo-tay.mp3");
    winSoundRef.current.preload = "auto";
    winSoundRef.current.onerror = () => {
        // console.error("Error loading win sound.");
    };

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);


  const handleSoundConfigChange = useCallback((config: { url: string; dataUrl?: string; fileName?: string }) => {
    setSelectedTickSoundUrl(config.url);
    if (config.url === CUSTOM_SOUND_URL_PLACEHOLDER && config.dataUrl && config.fileName) {
      setCustomSoundDataUrl(config.dataUrl); 
      setCustomSoundName(config.fileName);
    } else if (config.url !== CUSTOM_SOUND_URL_PLACEHOLDER) {
      setCustomSoundDataUrl(null);
      setCustomSoundName(null);
      setCustomSoundDurationSeconds(null);
    }
  }, []);


  useEffect(() => {
    if (audioFadeIntervalRef.current) {
        clearInterval(audioFadeIntervalRef.current);
        audioFadeIntervalRef.current = null;
    }
    if (activeTickSoundElement) {
        activeTickSoundElement.pause();
        activeTickSoundElement.onloadedmetadata = null;
        activeTickSoundElement.onerror = null;
        activeTickSoundElement.oncanplaythrough = null;
        activeTickSoundElement.onended = null;
    }

    let soundSourceUrlForPredefined: string | null = null;
    let isContinuousForPredefined = false;
    let fixedDurationForPredefined: number | undefined = undefined;
    let isProcessingCustomSound = false;

    if (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDataUrl) {
        isProcessingCustomSound = true;
        const audioForDuration = new Audio(customSoundDataUrl);
        
        audioForDuration.onloadedmetadata = () => {
            const duration = audioForDuration.duration;
            if (!isFinite(duration)) {
                addNotification("Không thể xác định thời lượng âm thanh tùy chỉnh.", 'error', 5000);
                setCustomSoundDataUrl(null); setCustomSoundName(null); setCustomSoundDurationSeconds(null);
                setSelectedTickSoundUrl(DEFAULT_TICK_SOUND_URL); 
                setIsSpinDurationLocked(false); 
                setActiveTickSoundElement(null);
                return;
            }

            if (duration < 5) {
                addNotification("Âm thanh quá ngắn (tối thiểu 5 giây). Vui lòng chọn âm thanh khác.", 'error', 5000);
                setCustomSoundDataUrl(null); setCustomSoundName(null); setCustomSoundDurationSeconds(null);
                setSelectedTickSoundUrl(DEFAULT_TICK_SOUND_URL); 
                setIsSpinDurationLocked(false);
                setSpinDuration(DEFAULT_SPIN_DURATION_MS);
                setActiveTickSoundElement(null);
                return;
            }
            if (duration > 60) {
                addNotification("Âm thanh quá dài (tối đa 60 giây). Vui lòng chọn âm thanh khác.", 'error', 5000);
                setCustomSoundDataUrl(null); setCustomSoundName(null); setCustomSoundDurationSeconds(null);
                setSelectedTickSoundUrl(DEFAULT_TICK_SOUND_URL);
                setIsSpinDurationLocked(false);
                setSpinDuration(DEFAULT_SPIN_DURATION_MS);
                setActiveTickSoundElement(null);
                return;
            }

            setCustomSoundDurationSeconds(duration);
            setSpinDuration(Math.round(duration * 1000));
            setIsSpinDurationLocked(false); 

            const newAudio = new Audio(customSoundDataUrl);
            newAudio.preload = "auto";
            newAudio.volume = tickSoundVolume;
            newAudio.loop = true; 
            newAudio.onerror = () => {
                console.error(`Error loading custom sound for playback: ${customSoundName}`);
                addNotification(<>Không thể tải âm thanh tùy chỉnh: <code className="text-xs bg-slate-700 p-0.5 rounded">{customSoundName}</code></>, 'error', 5000);
                setActiveTickSoundElement(null);
            };
            setActiveTickSoundElement(newAudio);
            setActiveSoundIsContinuous(true); 
        };
        audioForDuration.onerror = () => {
            addNotification("Lỗi khi tải siêu dữ liệu cho âm thanh tùy chỉnh.", 'error', 5000);
            setCustomSoundDataUrl(null); setCustomSoundName(null); setCustomSoundDurationSeconds(null);
            setSelectedTickSoundUrl(DEFAULT_TICK_SOUND_URL);
            setIsSpinDurationLocked(false);
            setSpinDuration(DEFAULT_SPIN_DURATION_MS);
            setActiveTickSoundElement(null);
        };
    } else {
        setCustomSoundDurationSeconds(null); 
        const soundOption = AVAILABLE_TICK_SOUNDS.find(s => s.url === selectedTickSoundUrl);
        if (soundOption) {
            soundSourceUrlForPredefined = soundOption.url;
            isContinuousForPredefined = !!soundOption.isContinuous;
            fixedDurationForPredefined = soundOption.fixedDuration;
        }

        if (fixedDurationForPredefined !== undefined) {
            setSpinDuration(fixedDurationForPredefined * 1000);
            setIsSpinDurationLocked(true);
        } else {
             if (selectedTickSoundUrl !== CUSTOM_SOUND_URL_PLACEHOLDER || !customSoundDataUrl) {
                setIsSpinDurationLocked(false);
            }
        }
        setActiveSoundIsContinuous(isContinuousForPredefined);
        if (soundSourceUrlForPredefined) {
            const newAudio = new Audio(soundSourceUrlForPredefined);
            newAudio.preload = "auto";
            newAudio.volume = tickSoundVolume;
            if (isContinuousForPredefined) {
                newAudio.loop = true;
            } else {
                newAudio.loop = false; 
                newAudio.load(); // Explicitly load discrete sounds
            }
            newAudio.onerror = () => {
                console.error(`Error loading sound from: ${soundSourceUrlForPredefined}`);
                addNotification(<>Không thể tải âm thanh từ: <code className="text-xs bg-slate-700 p-0.5 rounded">{soundSourceUrlForPredefined}</code></>, 'error', 5000);
                setActiveTickSoundElement(null);
            };
            setActiveTickSoundElement(newAudio);
        } else {
             setActiveTickSoundElement(null); 
        }
    }
    
    if (isProcessingCustomSound) {
        setActiveTickSoundElement(null); 
        setActiveSoundIsContinuous(true); 
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTickSoundUrl, customSoundDataUrl, tickSoundVolume, addNotification]); 


  useEffect(() => {
    if (activeTickSoundElement) {
      activeTickSoundElement.volume = tickSoundVolume;
    }
  }, [tickSoundVolume, activeTickSoundElement]);


  useEffect(() => {
    if (appContainerRef.current) {
      const baseClasses = "min-h-screen text-slate-100 flex flex-col items-center p-4 space-y-6";
      const defaultBgClasses = ['bg-gradient-to-br', 'from-slate-900', 'via-purple-900', 'to-slate-900'];
      
      appContainerRef.current.classList.remove(...defaultBgClasses);
      appContainerRef.current.style.background = '';


      if (appGlobalBackground === null) {
        appContainerRef.current.classList.add(...defaultBgClasses);
        appContainerRef.current.className = `${baseClasses} ${defaultBgClasses.join(' ')}`;
      } else if (typeof appGlobalBackground === 'string') { 
        appContainerRef.current.style.background = appGlobalBackground;
        appContainerRef.current.className = baseClasses;
      } else if (appGlobalBackground.type === 'linear-gradient') {
        const stopsString = appGlobalBackground.stops
          .sort((a, b) => a.position - b.position)
          .map(stop => `${stop.color} ${stop.position}%`)
          .join(', ');
        appContainerRef.current.style.background = `linear-gradient(${appGlobalBackground.angle}deg, ${stopsString})`;
        appContainerRef.current.className = baseClasses;
      } else if (appGlobalBackground.type === 'radial-gradient') {
        const stopsString = appGlobalBackground.stops
          .sort((a, b) => a.position - b.position)
          .map(stop => `${stop.color} ${stop.position}%`)
          .join(', ');
        const shape = appGlobalBackground.shape || 'circle';
        const position = appGlobalBackground.position || 'center';
        appContainerRef.current.style.background = `radial-gradient(${shape} at ${position}, ${stopsString})`;
        appContainerRef.current.className = baseClasses;
      }
    }
  }, [appGlobalBackground]);


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


  const addMultipleImagesToWheel = useCallback((newAssets: { id: string; dataURL: string; fileName: string }[]) => {
    if (newAssets.length === 0) return;

    setImageStore(prevStore => {
        const newStoreEntries = newAssets.reduce((acc, asset) => {
            acc[asset.id] = { dataURL: asset.dataURL, fileName: asset.fileName };
            return acc;
        }, {} as ImageStore);
        return { ...prevStore, ...newStoreEntries };
    });

    const newIds = newAssets.map(asset => asset.id);
    setNames(prevNames => [...prevNames, ...newIds]);
  }, []);

  const getCurrentGiftToSpinFor = (): GiftItem | null => {
    if (!useGiftList || giftList.length === 0) return null;
    return giftList.find(gift => gift.quantity > 0) || null;
  };
  
  const animateSpin = useCallback((timestamp: number) => {
    if (!spinStartTimeRef.current) spinStartTimeRef.current = timestamp; 
    const elapsed = timestamp - spinStartTimeRef.current;
    const startRotation = spinStartRotationRef.current;
    const targetRotation = targetRotationRef.current;
    const totalDeltaRotation = targetRotation - startRotation;
    
    let currentFrameRotation = startRotation; 
    let timePhysicallyUp = elapsed >= spinDuration;
    let rotationNumericallyAtTarget = false;

    if (!timePhysicallyUp) {
        currentFrameRotation = easeOutQuart(elapsed, startRotation, totalDeltaRotation, spinDuration);
        rotationNumericallyAtTarget = Math.abs(currentFrameRotation - targetRotation) < EPSILON_FINISH;
    }

    if (timePhysicallyUp || (rotationNumericallyAtTarget && elapsed > 50)) { 
      currentFrameRotation = targetRotation; 
      setCurrentRotation(currentFrameRotation);
      animationFrameIdRef.current = null;

      if (activeTickSoundElement && activeSoundIsContinuous && !activeTickSoundElement.paused) {
        if (audioFadeIntervalRef.current) {
            clearInterval(audioFadeIntervalRef.current);
            audioFadeIntervalRef.current = null;
        }
        const userSetVolume = tickSoundVolume;
        activeTickSoundElement.volume = 0; 
        activeTickSoundElement.pause();
        activeTickSoundElement.currentTime = 0;
        activeTickSoundElement.loop = false; 
        activeTickSoundElement.volume = userSetVolume;
      }


      const winnerIdOrName = names[winnerIndexRef.current];
      const winnerImageAsset = imageStore[winnerIdOrName];
      const winnerDisplayName = winnerImageAsset?.fileName || winnerIdOrName;
      const trimmedWinnerDisplayName = winnerDisplayName ? winnerDisplayName.trim() : "";

      if (trimmedWinnerDisplayName.length > 0 || winnerImageAsset) {
        setSelectedName(trimmedWinnerDisplayName);
        setSelectedItem(winnerIdOrName);

        const winnerDetails: WinnerDetails = {
          id: winnerIdOrName,
          displayName: trimmedWinnerDisplayName,
          isImage: !!winnerImageAsset,
          imageDataURL: winnerImageAsset?.dataURL,
        };
        
        if (autoRemoveWinner) {
            setPendingWinnerForAutoRemoval(winnerDetails); 
        }

        if (useGiftList && winningGiftRef.current) {
          const awardedGift = winningGiftRef.current;
          setWinnerHistory(prevHistory => [
            ...prevHistory,
            {
              type: 'gift',
              giftTitle: awardedGift.title,
              giftAwardedName: awardedGift.giftName,
              winner: winnerDetails,
              timestamp: Date.now()
            }
          ]);
          setGiftList(prevGifts => prevGifts.map(gift =>
            gift.id === awardedGift.id
            ? { ...gift, quantity: gift.quantity - 1 }
            : gift
          ));
        } else {
          setWinnerHistory(prevHistory => [
            ...prevHistory,
            {
              type: 'standard',
              winner: winnerDetails,
              timestamp: Date.now()
            }
          ]);
        }
        setShowWinnerModal(true);
        setShowConfetti(true);
        if (winSoundRef.current) {
          winSoundRef.current.currentTime = 0;
          winSoundRef.current.play().catch(error => {
            console.warn("Không thể phát âm thanh chiến thắng:", error);
            addNotification("Không thể phát âm thanh. Trình duyệt có thể đã chặn tự động phát.", "info", 5000);
          });
        }
      } else {
        addNotification("Vòng quay dừng lại ở một mục không hợp lệ hoặc trống.", 'error');
        setSelectedName(null);
        setSelectedItem(null);
      }

      setIsSpinning(false);
      return;
    }

    setCurrentRotation(currentFrameRotation);
    animationFrameIdRef.current = requestAnimationFrame(animateSpin);
  }, [spinDuration, names, imageStore, useGiftList, autoRemoveWinner, addNotification, setGiftList, setWinnerHistory, activeTickSoundElement, activeSoundIsContinuous, tickSoundVolume]);


  const spinWheel = useCallback(() => {
    if (names.length === 0 || isSpinning) return;

    if (wheelWrapperRef.current) {
      const elementToScrollTo = wheelWrapperRef.current;
      requestAnimationFrame(() => {
        elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    if (audioFadeIntervalRef.current) {
        clearInterval(audioFadeIntervalRef.current);
        audioFadeIntervalRef.current = null;
        if(activeTickSoundElement) activeTickSoundElement.volume = tickSoundVolume; 
    }
    if (activeTickSoundElement && activeSoundIsContinuous) {
        activeTickSoundElement.currentTime = 0;
        activeTickSoundElement.volume = tickSoundVolume; 
        activeTickSoundElement.loop = true; 
        activeTickSoundElement.play().catch(e => console.warn("Continuous sound play failed:", e));
    }


    let currentGiftToAward: GiftItem | null = null;
    if (useGiftList) {
      currentGiftToAward = getCurrentGiftToSpinFor();
      if (!currentGiftToAward) {
        addNotification("Tất cả các phần quà đã được trao hoặc danh sách quà trống!", 'info');
        return;
      }
      setCurrentGiftForModal({ title: currentGiftToAward.title, name: currentGiftToAward.giftName });
      winningGiftRef.current = currentGiftToAward;
    } else {
      setCurrentGiftForModal(null); 
      winningGiftRef.current = null;
    }

    setIsSpinning(true);
    setSelectedName(null);
    setSelectedItem(null);
    setShowWinnerModal(false);
    setPendingWinnerForAutoRemoval(null); 

    let chosenWinnerIndex = -1;
    const wheelItemsWithDetails = names.map((nameOrId, index) => ({
      originalIdOrName: nameOrId,
      displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
      originalIndex: index,
    }));

    if (parsedPriorityNames.length > 0) {
      const validPriorityCandidatesOnWheel = wheelItemsWithDetails.filter(item =>
        parsedPriorityNames.some(priorityName => 
          item.displayName === priorityName.trim().toLowerCase()
        )
      );
      if (validPriorityCandidatesOnWheel.length > 0) {
        chosenWinnerIndex = validPriorityCandidatesOnWheel[
          Math.floor(Math.random() * validPriorityCandidatesOnWheel.length)
        ].originalIndex;
      }
    }

    if (chosenWinnerIndex === -1 && boostedParticipants.length > 0 && showBoostWinRateSectionInTab) { 
        const validBoostedOnWheel = boostedParticipants
        .map(bp => {
          const wheelItem = wheelItemsWithDetails.find(item => item.displayName === bp.name.trim().toLowerCase());
          return wheelItem ? { ...bp, originalIndex: wheelItem.originalIndex } : null;
        })
        .filter(bpOrNull => bpOrNull !== null && bpOrNull.percentage > 0 && bpOrNull.percentage < 100) as (BoostedParticipant & { originalIndex: number })[];

      const totalBoostedPercentage = validBoostedOnWheel.reduce((sum, bp) => sum + bp.percentage, 0);
      if (totalBoostedPercentage > 0 && totalBoostedPercentage < 100) {
        const randomNumber = Math.random() * 100; 
        let cumulativePercentage = 0;
        for (const boostedItem of validBoostedOnWheel) {
          cumulativePercentage += boostedItem.percentage;
          if (randomNumber < cumulativePercentage) {
            chosenWinnerIndex = boostedItem.originalIndex;
            break;
          }
        }
        if (chosenWinnerIndex === -1) { 
          const nonBoostedOnWheel = wheelItemsWithDetails.filter(item => 
            !validBoostedOnWheel.some(bp => bp.originalIndex === item.originalIndex)
          );
          if (nonBoostedOnWheel.length > 0) {
            chosenWinnerIndex = nonBoostedOnWheel[Math.floor(Math.random() * nonBoostedOnWheel.length)].originalIndex;
          } else if (validBoostedOnWheel.length > 0) { 
             chosenWinnerIndex = validBoostedOnWheel[Math.floor(Math.random() * validBoostedOnWheel.length)].originalIndex;
          }
        }
      }
    }
    
    if (chosenWinnerIndex === -1) {
      if (names.length > 0) {
        chosenWinnerIndex = Math.floor(Math.random() * names.length);
      } else {
        setIsSpinning(false);
        return;
      }
    }
    winnerIndexRef.current = chosenWinnerIndex;
    
    let effectiveProbabilities: Array<{ nameOrId: string; probability: number }> = [];
    const validBoostedForSpin = boostedParticipants
        .map(bp => {
            const wheelItem = wheelItemsWithDetails.find(item => item.displayName === bp.name.trim().toLowerCase());
            return wheelItem ? { ...bp, originalIdOrName: wheelItem.originalIdOrName } : null;
        })
        .filter(bpOrNull => bpOrNull !== null && bpOrNull.percentage > 0 && bpOrNull.percentage < 100) as Array<BoostedParticipant & { originalIdOrName: string }>;
    
    const totalBoostedPercentageForSpin = validBoostedForSpin.reduce((sum, bp) => sum + bp.percentage, 0);
    const isBoostConfigValidForSpin = totalBoostedPercentageForSpin > 0 && totalBoostedPercentageForSpin < 100 && validBoostedForSpin.length > 0 && showBoostWinRateSectionInTab; 

    if (isBoostConfigValidForSpin) {
        const remainingPercentage = 100 - totalBoostedPercentageForSpin;
        const nonBoostedOnWheel = wheelItemsWithDetails.filter(item => !validBoostedForSpin.some(bp => bp.originalIdOrName === item.originalIdOrName));
        const numNonBoosted = nonBoostedOnWheel.length;
        const probPerNonBoosted = numNonBoosted > 0 ? remainingPercentage / numNonBoosted / 100 : 0;

        names.forEach(nameOrId => {
            const boostedEntry = validBoostedForSpin.find(bp => bp.originalIdOrName === nameOrId);
            if (boostedEntry) {
                effectiveProbabilities.push({ nameOrId, probability: boostedEntry.percentage / 100 });
            } else if (nonBoostedOnWheel.some(nb => nb.originalIdOrName === nameOrId) && probPerNonBoosted > 0) {
                effectiveProbabilities.push({ nameOrId, probability: probPerNonBoosted });
            }
        });
    } else {
        const probPerSegment = names.length > 0 ? 1 / names.length : 0;
        names.forEach(nameOrId => effectiveProbabilities.push({ nameOrId, probability: probPerSegment }));
    }
    
    effectiveProbabilities = effectiveProbabilities.filter(p => p.probability > 1e-9);
    const totalProbSum = effectiveProbabilities.reduce((sum, p) => sum + p.probability, 0);
    if (effectiveProbabilities.length > 0 && totalProbSum > 0 && Math.abs(totalProbSum - 1.0) > 1e-9) {
        effectiveProbabilities = effectiveProbabilities.map(p => ({ ...p, probability: p.probability / totalProbSum }));
    }

    let cumulativeAngle = 0;
    let winnerSegmentStartAngle = 0;
    let winnerSegmentAngleSpan = Math.PI * 2 / (names.length > 0 ? names.length : 1);

    for (let i = 0; i < effectiveProbabilities.length; i++) {
      const participantProb = effectiveProbabilities[i];
      const segmentAngleSpanForThis = participantProb.probability * 2 * Math.PI;
      if (names[winnerIndexRef.current] === participantProb.nameOrId) {
        winnerSegmentStartAngle = cumulativeAngle;
        winnerSegmentAngleSpan = segmentAngleSpanForThis;
        break;
      }
      cumulativeAngle += segmentAngleSpanForThis;
    }

    const staticPointerAngle = -Math.PI / 2; 
    const randomOffsetFactor = (Math.random() * 0.7) + 0.15; 
    const targetAngleOnWheel = winnerSegmentStartAngle + winnerSegmentAngleSpan * randomOffsetFactor;
    
    let finalTargetNormalizedRotation = (staticPointerAngle - targetAngleOnWheel);
    finalTargetNormalizedRotation = (finalTargetNormalizedRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    const spinStartActual = currentRotation;
    const deltaRotationFromVelocity = (DESIRED_INITIAL_ANGULAR_VELOCITY_RAD_PER_MS * spinDuration) / 4;
    const minDeltaRotationFromSpins = ABSOLUTE_MIN_TOTAL_SPINS * 2 * Math.PI;
    const requiredDeltaRotation = Math.max(deltaRotationFromVelocity, minDeltaRotationFromSpins);

    let provisionalTargetRotation = spinStartActual + requiredDeltaRotation;
    let provisionalEndNormalized = (provisionalTargetRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    let angleAdjustment = (finalTargetNormalizedRotation - provisionalEndNormalized + 2 * Math.PI) % (2 * Math.PI);
    let finalCalculatedTargetRotation = provisionalTargetRotation + angleAdjustment;

    while (finalCalculatedTargetRotation < spinStartActual + requiredDeltaRotation - (Math.PI * 0.5) || 
           (requiredDeltaRotation > 0.1 && finalCalculatedTargetRotation <= spinStartActual + 0.1) ) { 
      finalCalculatedTargetRotation += 2 * Math.PI;
    }
    
    targetRotationRef.current = finalCalculatedTargetRotation;
    spinStartRotationRef.current = spinStartActual;
    spinStartTimeRef.current = 0; 

    animationFrameIdRef.current = requestAnimationFrame(animateSpin);
  }, [names, isSpinning, currentRotation, spinDuration, parsedPriorityNames, imageStore, useGiftList, giftList, boostedParticipants, showBoostWinRateSectionInTab, addNotification, animateSpin, activeTickSoundElement, activeSoundIsContinuous, tickSoundVolume]);


  useEffect(() => {
    if (showWinnerModal && showConfetti) {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
      }, 6000);
    } else if (!showWinnerModal && showConfetti) {
      setShowConfetti(false);
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = null;
      }
    }
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      if (audioFadeIntervalRef.current) { 
        clearInterval(audioFadeIntervalRef.current);
      }
    };
  }, [showWinnerModal, showConfetti]);


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
            if (!isSettingsPanelVisible) {
                maxHeightConstraint = availableHeight * 0.9 - verticalPadding;
            }
        } else { 
            if (isSettingsPanelVisible) {
                targetContainerWidth = window.innerWidth * 0.55; 
                maxHeightConstraint = availableHeight * 0.80 - verticalPadding; 
            } else {
                targetContainerWidth = availableHeight * 0.9;
                maxHeightConstraint = availableHeight * 0.9 - verticalPadding;
            }
        }

        let newSize = Math.min(targetContainerWidth, maxHeightConstraint);
        newSize = Math.max(minSize, newSize); 

        setWheelAreaDimension(newSize);
    };
    updateWheelAreaDimension();
    window.addEventListener('resize', updateWheelAreaDimension);
    return () => {
        window.removeEventListener('resize', updateWheelAreaDimension);
    };
  }, [isSettingsPanelVisible]);

  const handleCloseWinnerModal = useCallback(() => {
    setShowWinnerModal(false);
    let finalNamesList = [...names]; 
    let performedNameListUpdate = false;

    if (autoRemoveWinner && pendingWinnerForAutoRemoval) {
      const winnerToRemove = pendingWinnerForAutoRemoval;
      finalNamesList = names.filter(item => item !== winnerToRemove.id);
      performedNameListUpdate = true;
      
      const winnerDisplayNameNormalized = winnerToRemove.displayName.trim().toLowerCase();
      const currentPriorityList = priorityNamesInput
        .split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      const newPriorityList = currentPriorityList.filter(
        name => name.trim().toLowerCase() !== winnerDisplayNameNormalized
      );
      setPriorityNamesInput(newPriorityList.join('\n'));

      setBoostedParticipants(prevBoosted =>
        prevBoosted.filter(
          p => p.name.trim().toLowerCase() !== winnerDisplayNameNormalized
        )
      );
      
      addNotification(`Đã tự động xóa "${winnerToRemove.displayName}" khỏi tất cả danh sách.`, 'info', 4000);
      setPendingWinnerForAutoRemoval(null);
    }

    if (autoShuffle) {
      if (finalNamesList.length > 0) {
        finalNamesList = shuffleArray(finalNamesList);
        performedNameListUpdate = true;
        if (!(autoRemoveWinner && pendingWinnerForAutoRemoval)) { 
            addNotification("Đã tự động trộn danh sách.", "info", 3000);
        }
      }
    }

    if (performedNameListUpdate) {
      handleNamesUpdate(finalNamesList);
    }

  }, [
    names, 
    autoRemoveWinner, 
    pendingWinnerForAutoRemoval, 
    priorityNamesInput, 
    autoShuffle, 
    handleNamesUpdate, 
    addNotification
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showClearHistoryConfirmModal) setShowClearHistoryConfirmModal(false);
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
  }, [showWinnerModal, isImageModalOpen, handleCloseWinnerModal, showClearHistoryConfirmModal]);


  const handleRemoveWinner = () => { 
    if (selectedItem) { 
      const updatedNamesArray = names.filter(item => item !== selectedItem);
      handleNamesUpdate(updatedNamesArray); 

      if(selectedName) { 
        const winnerDisplayNameNormalized = selectedName.trim().toLowerCase();
        
        const currentPriorityList = priorityNamesInput
          .split(/[\n,]+/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
        const newPriorityList = currentPriorityList.filter(
          name => name.trim().toLowerCase() !== winnerDisplayNameNormalized
        );
        setPriorityNamesInput(newPriorityList.join('\n'));

        setBoostedParticipants(prevBoosted =>
          prevBoosted.filter(
            p => p.name.trim().toLowerCase() !== winnerDisplayNameNormalized
          )
        );
        addNotification(`Đã xóa "${selectedName}" khỏi các danh sách liên quan.`, 'info');
      } else {
         addNotification(`Đã xóa mục đã chọn khỏi danh sách quay.`, 'info');
      }
    }
    setShowWinnerModal(false);
  };
  
  const confirmClearWinnerHistory = () => {
    setWinnerHistory([]);
    addNotification("Đã xóa lịch sử kết quả.", 'info');
  };

  const handleImageSelected = (src: string) => {
    if (imageSelectionPurpose === 'centerLogo') {
      setCenterImageSrc(src);
      addNotification("Đã cập nhật logo trung tâm.", 'success');
    } else if (imageSelectionPurpose === 'wheelBackground') {
      setWheelBackgroundImageSrc(src);
      addNotification("Đã cập nhật ảnh nền vòng quay.", 'success');
    }
    setIsImageModalOpen(false);
    setImageSelectionPurpose(null);
  };

  const handleRemoveLogo = () => {
    setCenterImageSrc(null);
    addNotification("Đã xóa logo trung tâm.", 'info');
  };

  const handleRemoveWheelBackground = () => {
    setWheelBackgroundImageSrc(null);
    addNotification("Đã xóa ảnh nền vòng quay.", 'info');
  };
  
  const handleWheelDynamicBackgroundChange = (newBackground: WheelDynamicBackground) => {
    setWheelDynamicBackground(newBackground);
    if (newBackground) {
        addNotification("Đã cập nhật màu nền vòng quay.", 'success');
    } else {
        addNotification("Đã xóa màu nền tùy chỉnh của vòng quay.", 'info');
    }
  };

  const handleWheelTextColorChange = (newColor: string) => {
    setWheelTextColor(newColor);
    if (newColor === DEFAULT_WHEEL_TEXT_COLOR) {
        addNotification("Đã đặt lại màu chữ vòng quay về mặc định.", 'info');
    } else {
        addNotification("Đã cập nhật màu chữ vòng quay.", 'success');
    }
  };
  
  const handleAppGlobalBackgroundChange = (newBackground: AppGlobalBackground) => {
    setAppGlobalBackground(newBackground);
     if (newBackground) {
        addNotification("Đã cập nhật màu nền ứng dụng.", 'success');
    } else {
        addNotification("Đã khôi phục màu nền ứng dụng mặc định.", 'info');
    }
  };

  const handleTitleTextChange = (newText: string) => {
    setTitleText(newText);
    if (newText === DEFAULT_TITLE_TEXT) {
      addNotification("Đã khôi phục nội dung tiêu đề mặc định.", "info");
    } else {
      addNotification("Đã cập nhật nội dung tiêu đề.", "success");
    }
  };

  const handleTitleColorChange = (newColorConfig: AppGlobalBackground) => {
    setTitleColorConfig(newColorConfig);
    if (newColorConfig === null) {
      addNotification("Đã khôi phục màu tiêu đề mặc định.", "info");
    } else {
      addNotification("Đã cập nhật màu tiêu đề.", "success");
    }
  };

  useLayoutEffect(() => {
    const sliderElement = spinDurationSliderRef.current;
    if (!sliderElement) {
      setSliderThumbPositionStyle({ left: '0%' });
      setShowSpinDurationTooltip(false); 
      return;
    }

    const inputWidth = sliderElement.offsetWidth;

    if (inputWidth === 0) {
       setShowSpinDurationTooltip(false); 
      return;
    }
    
    const thumbWidthEstimate = parseFloat(getComputedStyle(sliderElement).getPropertyValue('--slider-thumb-size')) || 16;

    const val = spinDuration / 1000; 
    const min = parseFloat(sliderElement.min);
    const max = parseFloat(sliderElement.max);
    const valueRange = max - min;

    let valuePercentDecimal = 0;
    if (valueRange > 0) {
      valuePercentDecimal = (val - min) / valueRange;
    } else if (val >= max) { 
      valuePercentDecimal = 1;
    }
    valuePercentDecimal = Math.max(0, Math.min(1, valuePercentDecimal)); 
    
    sliderElement.style.setProperty('--value-percent', `${valuePercentDecimal * 100}%`);

    const thumbLeftEdgePx = valuePercentDecimal * (inputWidth - thumbWidthEstimate);
    const thumbCenterPx = thumbLeftEdgePx + (thumbWidthEstimate / 2);
    
    let leftPercentage = (thumbCenterPx / inputWidth) * 100;
    leftPercentage = Math.max(0, Math.min(100, leftPercentage)); 

    setSliderThumbPositionStyle({ left: `${leftPercentage}%` });
  }, [spinDuration, wheelAreaDimension, showSpinDurationTooltip, isSpinDurationLocked, selectedTickSoundUrl, customSoundDurationSeconds]); 

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

  const openImageModal = (purpose: 'centerLogo' | 'wheelBackground') => {
    setImageSelectionPurpose(purpose);
    setIsImageModalOpen(true);
  };
  
  const getSpinButtonText = () => {
    if (isSpinning) return 'Đang quay...';
    if (useGiftList) {
      const currentGift = getCurrentGiftToSpinFor();
      if (currentGift) return `QUAY CHO "${currentGift.title}"!`;
      return 'Hết Quà!';
    }
    return 'QUAY!';
  };

  const isSpinDisabled = () => {
    if (isSpinning || names.length === 0) return true;
    if (useGiftList && !getCurrentGiftToSpinFor()) return true;
    return false;
  };

  const sanitizeForTSV = (text: string | undefined): string => {
    if (text === undefined || text === null) return '';
    return text.toString().replace(/\t/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ');
  };

  const handleCopyResults = async () => {
    if (winnerHistory.length === 0) {
      addNotification("Không có kết quả để sao chép.", 'info');
      return;
    }

    const header = "Loại Giải thưởng\tTên Phần Quà\tNgười Trúng\tLà Hình Ảnh\tThời Gian\n";
    const rows = winnerHistory.map(item => {
      const timestamp = new Date(item.timestamp).toLocaleString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      });
      const isImage = item.winner.isImage ? "Có" : "Không";
      const winnerName = sanitizeForTSV(item.winner.displayName);

      if (item.type === 'gift') {
        const giftTitle = sanitizeForTSV(item.giftTitle);
        const giftAwardedName = sanitizeForTSV(item.giftAwardedName);
        return `${giftTitle}\t${giftAwardedName}\t${winnerName}\t${isImage}\t${timestamp}`;
      } else {
        return `Vòng Quay Thường\t-\t${winnerName}\t${isImage}\t${timestamp}`;
      }
    }).join('\n');

    const tsvContent = header + rows;

    try {
      await navigator.clipboard.writeText(tsvContent);
      addNotification("Đã sao chép kết quả vào clipboard!", 'success');
    } catch (err) {
      console.error('Lỗi sao chép vào clipboard:', err);
      addNotification("Lỗi: Không thể sao chép.", 'error');
    }
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
            addMultipleImagesToWheel={addMultipleImagesToWheel}
            isSpinning={isSpinning || showWinnerModal}
          />
        </>
      );
    }
    if (activeTab === 'results') {
      const groupedHistory: Record<string, GiftAwardHistoryItem[]> = {};
      const standardHistory: NonGiftWinnerHistoryItem[] = [];

      winnerHistory.forEach(item => {
        if (item.type === 'gift') {
          if (!groupedHistory[item.giftTitle]) {
            groupedHistory[item.giftTitle] = [];
          }
          groupedHistory[item.giftTitle].push(item as GiftAwardHistoryItem);
        } else {
          standardHistory.push(item as NonGiftWinnerHistoryItem);
        }
      });
      
      for (const title in groupedHistory) {
        groupedHistory[title].sort((a, b) => b.timestamp - a.timestamp);
      }
      standardHistory.sort((a, b) => b.timestamp - a.timestamp);


      return (
        <>
          <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
            <h2 className="text-2xl font-bold text-pink-400">Kết Quả Quay</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopyResults}
                disabled={winnerHistory.length === 0 || isSpinning}
                className="text-xs bg-sky-600 hover:bg-sky-500 text-white py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Sao chép kết quả quay"
              >
                Sao chép Kết quả
              </button>
              <button
                onClick={() => setShowClearHistoryConfirmModal(true)} 
                disabled={winnerHistory.length === 0 || isSpinning}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Xóa lịch sử kết quả"
              >
                Xóa Kết Quả
              </button>
            </div>
          </div>
          {winnerHistory.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 winner-history-list custom-scrollbar">
              {Object.entries(groupedHistory).map(([giftTitle, items]) => (
                <div key={giftTitle} className="mb-3">
                  <h3 className="text-lg font-semibold text-sky-400 mb-1 sticky top-0 bg-slate-800 py-1">{giftTitle}</h3>
                  <ul className="space-y-1 pl-2">
                    {items.map((item, index) => (
                      <li 
                        key={`${item.timestamp}-${index}`} 
                        className="text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md flex items-center gap-2"
                      >
                        {item.winner.isImage ? (
                          <img 
                            src={item.winner.imageDataURL} 
                            alt={item.winner.displayName} 
                            className="w-6 h-6 object-cover rounded-full flex-shrink-0"
                          />
                        ) : <span className="w-6 h-6 flex-shrink-0 text-center">👤</span>}
                        <span className="truncate flex-grow">
                          {item.winner.displayName} (<span className="italic text-slate-400">{item.giftAwardedName}</span>)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {standardHistory.length > 0 && (
                 <div className="mb-3">
                  {Object.keys(groupedHistory).length > 0 && <h3 className="text-lg font-semibold text-sky-400 mb-1 sticky top-0 bg-slate-800 py-1">Vòng quay thường</h3>}
                  <ul className="space-y-1 pl-2">
                  {standardHistory.map((item, index) => (
                     <li 
                        key={`${item.timestamp}-${index}`} 
                        className="text-sm text-slate-300 bg-slate-700/50 p-2 rounded-md flex items-center gap-2"
                      >
                        {item.winner.isImage ? (
                          <img 
                            src={item.winner.imageDataURL} 
                            alt={item.winner.displayName} 
                            className="w-6 h-6 object-cover rounded-full flex-shrink-0"
                          />
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
          <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
            ▼
          </span>
        </button>
        {isOpen && (
          <div id={contentId} className={`border-t border-slate-700 ${isTabbed ? '' : 'p-4'}`}>
            {children}
          </div>
        )}
      </div>
    );
  };
  
  const titleLines = titleText.split('\n');
  const mainTitle = titleLines[0] || "";
  const subTitle = titleLines.length > 1 ? titleLines.slice(1).join('\n') : "";


  const sliderMinVal = 5;
  const sliderMaxVal = (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds !== null)
      ? Math.floor(customSoundDurationSeconds)
      : (isSpinDurationLocked ? spinDuration / 1000 : 60);

  const calculateLeftPercent = (val: number, min: number, max: number): string => {
    if (max === min) return '50%'; 
    const percentage = ((val - min) / (max - min)) * 100;
    return `${Math.max(0, Math.min(100, percentage))}%`;
  };

  const durationLabels: { value: number; text: string }[] = [];
  durationLabels.push({ value: sliderMinVal, text: `${sliderMinVal}s`});

  const p2Value = (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds !== null) 
      ? Math.round(sliderMinVal + (sliderMaxVal - sliderMinVal) / 3) 
      : 20;
  if (p2Value > sliderMinVal && p2Value < sliderMaxVal) {
      durationLabels.push({ value: p2Value, text: `${p2Value}s`});
  }
  
  const p3Value = (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds !== null)
      ? Math.round(sliderMinVal + (sliderMaxVal - sliderMinVal) * 2 / 3) 
      : 40;
  if (p3Value > sliderMinVal && p3Value < sliderMaxVal && (!durationLabels.some(l => l.value === p3Value) || p3Value > p2Value) ) {
      if (durationLabels.some(l => l.value === p2Value) && p3Value <= p2Value) {
      } else {
        durationLabels.push({ value: p3Value, text: `${p3Value}s`});
      }
  }
  
  if (sliderMaxVal > sliderMinVal && !durationLabels.some(l=>l.value === sliderMaxVal)) {
      durationLabels.push({ value: sliderMaxVal, text: `${sliderMaxVal}s`});
  }
  const uniqueDurationLabels = durationLabels
    .sort((a, b) => a.value - b.value)
    .filter((point, index, self) => index === self.findIndex(p => p.value === point.value));


  return (
    <div 
        ref={appContainerRef} 
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-100 flex flex-col items-center p-4 space-y-6"
    >
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall { animation-name: fall; animation-timing-function: ease-out; }
        
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
          {(() => {
            const renderStyledLine = (text: string, isSub: boolean) => {
              if (!text.trim() && isSub) return null; 

              if (titleColorConfig === null) { 
                return isSub ? (
                  <span className="block text-purple-400 text-3xl mt-1">{text}</span>
                ) : (
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">{text}</span>
                );
              } else { 
                let style: React.CSSProperties = {};
                let baseClassName = "block";
                if (isSub) baseClassName += " text-3xl mt-1"; 

                if (typeof titleColorConfig === 'string') { 
                  style.color = titleColorConfig;
                } else { 
                  const sortedStops = [...titleColorConfig.stops].sort((a, b) => a.position - b.position);
                  const stopsString = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
                  
                  if (titleColorConfig.type === 'linear-gradient') {
                    style.backgroundImage = `linear-gradient(${titleColorConfig.angle}deg, ${stopsString})`;
                  } else { 
                    style.backgroundImage = `radial-gradient(${titleColorConfig.shape} at ${titleColorConfig.position}, ${stopsString})`;
                  }
                  baseClassName += " text-transparent bg-clip-text";
                  style.WebkitBackgroundClip = 'text'; 
                  style.backgroundClip = 'text';
                }
                return <span className={baseClassName} style={style}>{text}</span>;
              }
            };

            return (
              <>
                {renderStyledLine(mainTitle, false)}
                {subTitle && renderStyledLine(subTitle, true)}
              </>
            );
          })()}
        </h1>
      </header>

      <main className={`flex flex-col lg:flex-row items-start w-full max-w-screen-2xl gap-6 lg:gap-10 ${isSettingsPanelVisible ? 'lg:justify-around' : 'lg:justify-center'}`}>
        <div 
            ref={wheelWrapperRef} 
            className="relative flex-shrink-0 w-full lg:w-auto aspect-square mx-auto lg:mx-0" 
            style={{maxWidth: `${wheelAreaDimension}px`, maxHeight: `${wheelAreaDimension}px` }}
        >
          <WheelCanvas
            names={names}
            imageStore={imageStore}
            boostedParticipants={showBoostWinRateSectionInTab ? boostedParticipants : []} 
            rotationAngle={currentRotation}
            canvasSize={wheelAreaDimension * 0.9} 
            centerImageSrc={centerImageSrc}
            wheelBackgroundImageSrc={wheelBackgroundImageSrc}
            dynamicBackgroundColor={wheelDynamicBackground}
            wheelTextColor={wheelTextColor} 
            onWheelClick={spinWheel}
            tickSound={activeSoundIsContinuous ? null : activeTickSoundElement} 
            isTickSoundContinuous={activeSoundIsContinuous} 
          />
        </div>

        <div className={`flex flex-col items-center space-y-5 w-full lg:max-w-md xl:max-w-lg ${isSettingsPanelVisible ? '' : 'hidden'}`}>
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
          
          <div className="w-full p-6 bg-slate-800 rounded-b-xl shadow-2xl">
            {renderTabContent()}
          </div>
          
          <button
            onClick={spinWheel}
            disabled={isSpinDisabled()}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold text-2xl py-4 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            aria-label="Quay vòng may mắn"
          >
            {getSpinButtonText()}
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
            <>
              <div className="w-full grid grid-cols-3 border-b border-slate-700 mb-0">
                {(['beforeSpin', 'duringSpin', 'afterSpin'] as SpinOptionTab[]).map(tab => {
                    let tabLabel = '';
                    if (tab === 'beforeSpin') tabLabel = 'Trước khi quay';
                    else if (tab === 'duringSpin') tabLabel = 'Trong khi quay';
                    else if (tab === 'afterSpin') tabLabel = 'Sau khi quay';
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveSpinOptionTab(tab)}
                      aria-pressed={activeSpinOptionTab === tab}
                      className={`w-full py-2.5 px-3 text-sm font-medium text-center transition-colors duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-pink-400 
                        ${isSpinning ? 'cursor-not-allowed' : ''}
                        ${ activeSpinOptionTab === tab 
                            ? 'bg-slate-700/70 text-pink-400 border-b-2 border-pink-500' 
                            : 'bg-transparent text-slate-400 hover:text-pink-300 hover:bg-slate-700/30'
                        }`}
                      disabled={isSpinning}
                    >
                      {tabLabel}
                    </button>
                  );
                })}
              </div>
              <div className="p-4 space-y-4">
                {activeSpinOptionTab === 'beforeSpin' && (
                  <>
                    <label htmlFor="useGiftListCheckbox" className="flex items-center justify-start space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        id="useGiftListCheckbox"
                        checked={useGiftList}
                        onChange={(e) => setUseGiftList(e.target.checked)}
                        disabled={isSpinning}
                        className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800 disabled:opacity-60"
                      />
                      <span>Nhập danh sách quà</span>
                    </label>
                    {useGiftList && (
                      <GiftManagement
                        giftList={giftList}
                        setGiftList={setGiftList}
                        isSpinning={isSpinning}
                      />
                    )}

                    <label htmlFor="showBoostWinRateCheckbox" className="flex items-center justify-start space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors mt-4">
                      <input
                        type="checkbox"
                        id="showBoostWinRateCheckbox"
                        checked={showBoostWinRateSectionInTab}
                        onChange={(e) => setShowBoostWinRateSectionInTab(e.target.checked)}
                        disabled={isSpinning}
                        className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800 disabled:opacity-60"
                      />
                      <span>Tăng tỉ lệ thắng</span>
                    </label>

                    {showBoostWinRateSectionInTab && (
                      <div className="mt-2 p-3 border border-slate-600 rounded-lg bg-slate-800/40">
                        <BoostWinRateInput
                          boostedParticipants={boostedParticipants}
                          setBoostedParticipants={setBoostedParticipants}
                          isSpinning={isSpinning}
                          namesOnWheel={names}
                          imageStore={imageStore}
                        />
                      </div>
                    )}
                  </>
                )}
                {activeSpinOptionTab === 'duringSpin' && (
                  <>
                    <div className="my-2"> 
                      <label htmlFor="spinDurationSlider" className="block text-sm font-medium text-slate-300 mb-2 text-center">
                        Thời gian quay (<span className="font-bold text-blue-400">{spinDuration / 1000}</span> giây)
                        {isSpinDurationLocked && <span className="text-xs text-yellow-400"> (Bị khóa bởi âm thanh đặt trước)</span>}
                        {selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds &&
                         <span className="text-xs text-green-400"> (Tối đa: {customSoundDurationSeconds.toFixed(1)}s do âm thanh tùy chỉnh)</span>}
                      </label>
                      <div className="relative px-1 py-3">
                        <input
                          ref={spinDurationSliderRef}
                          type="range"
                          id="spinDurationSlider"
                          min="5" 
                          max={sliderMaxVal} 
                          value={spinDuration / 1000}
                          onChange={(e) => {
                            if (isSpinning) return;
                            const newSpinDurationSeconds = parseInt(e.target.value, 10);

                            if (isSpinDurationLocked) { 
                                const lockedDuration = AVAILABLE_TICK_SOUNDS.find(s => s.url === selectedTickSoundUrl)?.fixedDuration;
                                if (lockedDuration) {
                                    addNotification(`Thời gian quay được cố định bởi âm thanh "${AVAILABLE_TICK_SOUNDS.find(s => s.url === selectedTickSoundUrl)?.name}" (${lockedDuration}s).`, 'info');
                                }
                                return;
                            }

                            if (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds !== null) {
                                if (newSpinDurationSeconds > customSoundDurationSeconds) {
                                    addNotification(`Thời gian quay tối đa cho âm thanh này là ${customSoundDurationSeconds.toFixed(1)} giây.`, 'error');
                                    setSpinDuration(Math.round(customSoundDurationSeconds * 1000)); 
                                    return;
                                }
                            }
                            setSpinDuration(newSpinDurationSeconds * 1000);
                          }}
                          onMouseEnter={() => setShowSpinDurationTooltip(true)}
                          onMouseLeave={() => setShowSpinDurationTooltip(false)}
                          disabled={isSpinning || isSpinDurationLocked} 
                          className="w-full h-auto bg-transparent appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                          aria-label="Điều chỉnh thời gian quay vòng"
                        />
                        <div
                          className={`slider-tooltip ${showSpinDurationTooltip ? 'visible' : ''}`}
                          style={sliderThumbPositionStyle}
                          aria-hidden="true"
                        >
                          {spinDuration / 1000}s
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


                            return (
                                <span 
                                    key={`label-${label.value}`} 
                                    style={{ position: 'absolute', left: leftPos, transform: transform }}
                                    className="whitespace-nowrap"
                                >
                                    {label.text}
                                </span>
                            );
                        })}
                      </div>
                    </div>

                    <TickSoundSelector
                      availableSounds={AVAILABLE_TICK_SOUNDS}
                      currentSoundUrl={selectedTickSoundUrl}
                      customSoundName={customSoundName}
                      customSoundDataUrl={customSoundDataUrl}
                      onSoundConfigChange={handleSoundConfigChange}
                      isSpinning={isSpinning}
                      tickVolume={tickSoundVolume}
                      onTickVolumeChange={setTickSoundVolume}
                    />
                  </>
                )}
                {activeSpinOptionTab === 'afterSpin' && (
                  <div className="space-y-3">
                    <label htmlFor="autoShuffleCheckbox" className="flex items-center justify-start space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
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
                    <label htmlFor="autoRemoveWinnerCheckbox" className="flex items-center justify-start space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        id="autoRemoveWinnerCheckbox"
                        checked={autoRemoveWinner}
                        onChange={(e) => setAutoRemoveWinner(e.target.checked)}
                        disabled={isSpinning}
                        className="form-checkbox h-5 w-5 text-pink-600 bg-slate-700 border-slate-500 rounded focus:ring-pink-500 focus:ring-offset-slate-800 disabled:opacity-60"
                      />
                      <span>Tự xóa người trúng sau mỗi lần quay</span>
                    </label>
                    {autoRemoveWinner && <p className="text-xs text-yellow-400/90 text-center mt-0.5 px-2">Người thắng sẽ bị xóa khỏi danh sách quay, danh sách ưu tiên và danh sách tăng tỉ lệ.</p>}
                  </div>
                )}
              </div>
            </>
          ), true)} 
          
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
               <div className="pt-3 border-t border-slate-700/50">
                 <WheelBackgroundColorPicker
                    currentBackground={wheelDynamicBackground}
                    onBackgroundChange={handleWheelDynamicBackgroundChange}
                    isSpinning={isSpinning}
                  />
               </div>
               <div className="pt-3 border-t border-slate-700/50">
                <WheelTextColorPicker
                  currentTextColor={wheelTextColor}
                  onTextColorChange={handleWheelTextColorChange}
                  defaultTextColor={DEFAULT_WHEEL_TEXT_COLOR}
                  isSpinning={isSpinning}
                />
               </div>
            </div>
          ))}

           {renderCollapsibleSection("🎨 Tùy Chỉnh Giao Diện Chung", isAppAppearanceOpen, setIsAppAppearanceOpen, "appAppearanceContent", (
              <div className="space-y-6">
                <TitleTextEditor
                  currentTitleText={titleText}
                  onTitleTextChange={handleTitleTextChange}
                  defaultTitleText={DEFAULT_TITLE_TEXT}
                  isSpinning={isSpinning}
                />
                <div className="pt-4 border-t border-slate-700/50">
                  <TitleColorPicker
                    currentTitleColor={titleColorConfig}
                    onTitleColorChange={handleTitleColorChange}
                    activeTitleText={titleText} 
                    isSpinning={isSpinning}
                  />
                </div>
                <div className="pt-4 border-t border-slate-700/50">
                  <AppBackgroundColorPicker
                      currentBackground={appGlobalBackground}
                      onBackgroundChange={handleAppGlobalBackgroundChange}
                      isSpinning={isSpinning}
                  />
                </div>
              </div>
            ))}


        </div>
      </main>

      <button
          onClick={() => setIsSettingsPanelVisible(prev => !prev)}
          disabled={isSpinning}
          className="fixed top-1/2 -translate-y-1/2 right-0 z-30 bg-pink-600 text-white font-bold rounded-l-xl shadow-lg hover:bg-pink-700 transition-colors duration-300 ease-in-out border-2 border-pink-800 ring-1 ring-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed', 
              textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
          }}
          aria-label={isSettingsPanelVisible ? 'Ẩn thiết lập' : 'Hiện thiết lập'}
      >
          <span className="py-4 px-2 tracking-wider">{isSettingsPanelVisible ? 'Ẩn thiết lập' : 'Hiện thiết lập'}</span>
      </button>

      <InfoSection />

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
        autoRemoveWinnerActive={autoRemoveWinner} 
        giftDetails={currentGiftForModal}
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

      <ConfirmationModal
        isOpen={showClearHistoryConfirmModal}
        onClose={() => setShowClearHistoryConfirmModal(false)}
        onConfirm={confirmClearWinnerHistory}
        title="Xác nhận xóa lịch sử"
        message="Bạn có chắc chắn muốn xóa toàn bộ lịch sử kết quả quay không? Hành động này không thể hoàn tác."
        confirmButtonText="Xóa Tất Cả"
        confirmButtonVariant="danger"
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
