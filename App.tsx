
import React, { useState, useEffect, useRef, useCallback } from 'react';
import WheelCanvas from './components/WheelCanvas';
import NameInput from './components/NameInput';
import WinnerModal from './components/WinnerModal';
import ImageSelectionModal from './components/ImageSelectionModal';
import GiftManagement from './components/GiftManagement'; // Component mới
import ConfirmationModal from './components/ConfirmationModal'; // Import ConfirmationModal
import BoostWinRateInput from './components/BoostWinRateInput'; // Import BoostWinRateInput
import WheelBackgroundColorPicker from './components/WheelBackgroundColorPicker'; // Import new component
import AppBackgroundColorPicker from './components/AppBackgroundColorPicker'; // Import new component for global background
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


const App: React.FC = () => {
  const [names, setNames] = useState<string[]>(['Nguyễn Văn An', 'Trần Thị Bích', 'Lê Minh Cường', 'Phạm Thu Hà', 'Hoàng Đức Hải', 'Vũ Ngọc Lan', 'Đặng Tiến Dũng', 'Bùi Thanh Mai']);
  const [currentRotation, setCurrentRotation] = useState(0); // radians
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null); 
  const [selectedItem, setSelectedItem] = useState<string | null>(null); 
  const [showConfetti, setShowConfetti] = useState(false);
  const [spinDuration, setSpinDuration] = useState<number>(10000); 
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryItem[]>([]);
  const [wheelAreaDimension, setWheelAreaDimension] = useState(500); // Renamed from calculatedCanvasSize
  
  const [centerImageSrc, setCenterImageSrc] = useState<string | null>(null);
  const [wheelBackgroundImageSrc, setWheelBackgroundImageSrc] = useState<string | null>(null);
  const [wheelDynamicBackground, setWheelDynamicBackground] = useState<WheelDynamicBackground>(null); 
  const [appGlobalBackground, setAppGlobalBackground] = useState<AppGlobalBackground>(null); // For global app background
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSelectionPurpose, setImageSelectionPurpose] = useState<'centerLogo' | 'wheelBackground' | null>(null);

  const [priorityNamesInput, setPriorityNamesInput] = useState<string>('');
  const [parsedPriorityNames, setParsedPriorityNames] = useState<string[]>([]);
  const [showPriorityInputSection, setShowPriorityInputSection] = useState(false);

  const [imageStore, setImageStore] = useState<ImageStore>({});
  const [autoShuffle, setAutoShuffle] = useState<boolean>(false);
  const [spinJustCompletedWithAutoShuffle, setSpinJustCompletedWithAutoShuffle] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'nameInput' | 'results'>('nameInput');
  const [isSpinOptionsOpen, setIsSpinOptionsOpen] = useState<boolean>(false);
  const [isWheelCustomizationOpen, setIsWheelCustomizationOpen] = useState<boolean>(false);
  const [isAppAppearanceOpen, setIsAppAppearanceOpen] = useState<boolean>(false); // For global appearance
  const [isBoostWinRateOpen, setIsBoostWinRateOpen] = useState<boolean>(false); // State for new section

  // State cho tính năng danh sách quà
  const [useGiftList, setUseGiftList] = useState<boolean>(false);
  const [giftList, setGiftList] = useState<GiftItem[]>([]);
  const [currentGiftForModal, setCurrentGiftForModal] = useState<{ title: string; name: string } | null>(null);
  
  const { addNotification } = useNotification(); // Hook for notifications

  // State for confirmation modal for clearing history
  const [showClearHistoryConfirmModal, setShowClearHistoryConfirmModal] = useState(false);

  // State for Boost Win Rate
  const [boostedParticipants, setBoostedParticipants] = useState<BoostedParticipant[]>([]);


  const spinStartRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const winnerIndexRef = useRef(0);
  const confettiTimerRef = useRef<number | null>(null); 
  const wheelWrapperRef = useRef<HTMLDivElement>(null); // Ref for the wheel wrapper
  const appContainerRef = useRef<HTMLDivElement>(null); // Ref for the main app container
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    winSoundRef.current = new Audio("https://irace.vn/wp-content/uploads/2025/05/vo-tay.mp3");
    winSoundRef.current.preload = "auto";
    winSoundRef.current.onerror = () => {
        // console.error("Error loading win sound.");
    };
  }, []);

  // Effect to apply global background changes
  useEffect(() => {
    if (appContainerRef.current) {
      const baseClasses = "min-h-screen text-slate-100 flex flex-col items-center p-4 space-y-6";
      const defaultBgClasses = ['bg-gradient-to-br', 'from-slate-900', 'via-purple-900', 'to-slate-900'];
      
      // Remove all potential background classes first
      appContainerRef.current.classList.remove(...defaultBgClasses);
      appContainerRef.current.style.background = '';


      if (appGlobalBackground === null) {
        appContainerRef.current.classList.add(...defaultBgClasses);
        appContainerRef.current.className = `${baseClasses} ${defaultBgClasses.join(' ')}`;
      } else if (typeof appGlobalBackground === 'string') { // Solid color
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


  const addNewImageToWheel = useCallback((id: string, dataURL: string, fileName: string) => {
    setImageStore(prev => ({ ...prev, [id]: { dataURL, fileName } }));
    setNames(prevNames => [...prevNames, id]);
  }, []);

  const getCurrentGiftToSpinFor = (): GiftItem | null => {
    if (!useGiftList || giftList.length === 0) return null;
    return giftList.find(gift => gift.quantity > 0) || null;
  };

  const spinWheel = useCallback(() => {
    if (names.length === 0 || isSpinning) return;

    if (wheelWrapperRef.current) {
      const elementToScrollTo = wheelWrapperRef.current;
      requestAnimationFrame(() => {
        elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    let currentGiftToAward: GiftItem | null = null;
    if (useGiftList) {
      currentGiftToAward = getCurrentGiftToSpinFor();
      if (!currentGiftToAward) {
        addNotification("Tất cả các phần quà đã được trao hoặc danh sách quà trống!", 'info');
        return;
      }
    }

    setIsSpinning(true);
    setSelectedName(null);
    setSelectedItem(null);
    setShowWinnerModal(false);
    setCurrentGiftForModal(null);
    setSpinJustCompletedWithAutoShuffle(false); 

    let chosenWinnerIndex = -1;

    const wheelItemsWithDetails = names.map((nameOrId, index) => ({
      originalIdOrName: nameOrId,
      displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
      originalIndex: index,
    }));

    // 1. Priority Names Check
    if (parsedPriorityNames.length > 0) {
      const validPriorityCandidatesOnWheel = wheelItemsWithDetails.filter(item =>
        parsedPriorityNames.some(priorityName => 
          item.displayName === priorityName.trim().toLowerCase()
        )
      );
      if (validPriorityCandidatesOnWheel.length > 0) {
        const winningPriorityItem = validPriorityCandidatesOnWheel[
          Math.floor(Math.random() * validPriorityCandidatesOnWheel.length)
        ];
        chosenWinnerIndex = winningPriorityItem.originalIndex;
      }
    }

    // 2. Boost Win Rate Check (if no priority winner found)
    if (chosenWinnerIndex === -1 && boostedParticipants.length > 0) {
      const validBoostedOnWheel = boostedParticipants
        .map(bp => {
          const wheelItem = wheelItemsWithDetails.find(item => item.displayName === bp.name.trim().toLowerCase());
          return wheelItem ? { ...bp, originalIndex: wheelItem.originalIndex } : null;
        })
        .filter(bpOrNull => bpOrNull !== null && bpOrNull.percentage > 0 && bpOrNull.percentage < 100) as (BoostedParticipant & { originalIndex: number })[];

      const totalBoostedPercentage = validBoostedOnWheel.reduce((sum, bp) => sum + bp.percentage, 0);

      if (totalBoostedPercentage > 0 && totalBoostedPercentage < 100) {
        const randomNumber = Math.random() * 100; // 0 to 99.999...
        let cumulativePercentage = 0;

        // Assign boosted winners first
        for (const boostedItem of validBoostedOnWheel) {
          cumulativePercentage += boostedItem.percentage;
          if (randomNumber < cumulativePercentage) {
            chosenWinnerIndex = boostedItem.originalIndex;
            break;
          }
        }

        // If winner is not among boosted, pick from non-boosted
        if (chosenWinnerIndex === -1) { 
          const nonBoostedOnWheel = wheelItemsWithDetails.filter(item => 
            !validBoostedOnWheel.some(bp => bp.originalIndex === item.originalIndex)
          );
          if (nonBoostedOnWheel.length > 0) {
            chosenWinnerIndex = nonBoostedOnWheel[Math.floor(Math.random() * nonBoostedOnWheel.length)].originalIndex;
          } else if (validBoostedOnWheel.length > 0 && nonBoostedOnWheel.length === 0) {
             chosenWinnerIndex = validBoostedOnWheel[Math.floor(Math.random() * validBoostedOnWheel.length)].originalIndex;
          }
        }
      }
    }
    
    // 3. Standard Random Selection (if no priority or valid boosted winner determined by above logic)
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
    const isBoostConfigValidForSpin = totalBoostedPercentageForSpin > 0 && totalBoostedPercentageForSpin < 100 && validBoostedForSpin.length > 0;

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
    let winnerSegmentAngleSpan = 0;

    for (let i = 0; i < effectiveProbabilities.length; i++) {
        const participantProb = effectiveProbabilities[i];
        const segmentAngleSpan = participantProb.probability * 2 * Math.PI;
        if (names[winnerIndexRef.current] === participantProb.nameOrId) {
            winnerSegmentStartAngle = cumulativeAngle;
            winnerSegmentAngleSpan = segmentAngleSpan;
            break; 
        }
        cumulativeAngle += segmentAngleSpan;
    }
    
    if (winnerSegmentAngleSpan === 0 && names.length > 0) {
        const fallbackAnglePerSegment = (2 * Math.PI) / names.length;
        winnerSegmentStartAngle = winnerIndexRef.current * fallbackAnglePerSegment;
        winnerSegmentAngleSpan = fallbackAnglePerSegment;
    }

    const desiredFinalAngleOfPointer = -Math.PI / 2; 
    const segmentMiddleAngleOnWheel = winnerSegmentStartAngle + winnerSegmentAngleSpan / 2;
    let targetAngleForSegmentMiddleToAlignWithPointer = desiredFinalAngleOfPointer - segmentMiddleAngleOnWheel;
    const randomFactor = Math.random() * 0.6 + 0.2; 
    const randomOffsetWithinSegment = (randomFactor - 0.5) * winnerSegmentAngleSpan; 
    let targetAngle = targetAngleForSegmentMiddleToAlignWithPointer - randomOffsetWithinSegment;

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
            
            const winnerDetails: WinnerDetails = {
              id: winnerIdOrName,
              displayName: trimmedWinnerDisplayName,
              isImage: !!winnerImageAsset,
              imageDataURL: winnerImageAsset?.dataURL,
            };

            if (useGiftList && currentGiftToAward) {
              setCurrentGiftForModal({ title: currentGiftToAward.title, name: currentGiftToAward.giftName });
              setWinnerHistory(prevHistory => [
                ...prevHistory, 
                { 
                  type: 'gift',
                  giftTitle: currentGiftToAward.title,
                  giftAwardedName: currentGiftToAward.giftName,
                  winner: winnerDetails,
                  timestamp: Date.now()
                }
              ]);
              setGiftList(prevGifts => prevGifts.map(gift => 
                gift.id === currentGiftToAward!.id 
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
              winSoundRef.current.currentTime = 0; // Rewind if playing again quickly
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
  }, [names, isSpinning, currentRotation, spinDuration, parsedPriorityNames, imageStore, autoShuffle, useGiftList, giftList, handleNamesUpdate, boostedParticipants, addNotification]);


  useEffect(() => {
    if (spinJustCompletedWithAutoShuffle && !isSpinning) { 
      const shuffledNames = shuffleArray([...names]);
      handleNamesUpdate(shuffledNames);
      setSpinJustCompletedWithAutoShuffle(false);
    }
  }, [spinJustCompletedWithAutoShuffle, names, handleNamesUpdate, isSpinning]);


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
    };
  }, [showWinnerModal, showConfetti]);


  useEffect(() => {
    const updateWheelAreaDimension = () => {
        let targetContainerWidth;
        let maxHeightConstraint;
        const availableHeight = window.innerHeight;
        const verticalPadding = 40; 
        const minSize = 250;

        if (window.innerWidth < 1024) { // Mobile
            targetContainerWidth = window.innerWidth * 0.95;
            maxHeightConstraint = availableHeight * 0.70 - verticalPadding;
        } else { // Desktop (window.innerWidth >= 1024)
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
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
    };
  }, []);

  const handleCloseWinnerModal = useCallback(() => {
    setShowWinnerModal(false);
    setCurrentGiftForModal(null);
  }, []);

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
    setCurrentGiftForModal(null);
  };
  
  const confirmClearWinnerHistory = () => {
    setWinnerHistory([]);
    addNotification("Đã xóa lịch sử kết quả.", 'info');
    // setShowClearHistoryConfirmModal(false); // Modal closes itself on confirm
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
  
  const handleAppGlobalBackgroundChange = (newBackground: AppGlobalBackground) => {
    setAppGlobalBackground(newBackground);
     if (newBackground) {
        addNotification("Đã cập nhật màu nền ứng dụng.", 'success');
    } else {
        addNotification("Đã khôi phục màu nền ứng dụng mặc định.", 'info');
    }
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
            addNewImageToWheel={addNewImageToWheel}
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
          <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
            ▼
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
        <div 
            ref={wheelWrapperRef} 
            className="relative flex-shrink-0 w-full lg:w-auto aspect-square mx-auto lg:mx-0" 
            style={{maxWidth: `${wheelAreaDimension}px`, maxHeight: `${wheelAreaDimension}px` }}
        >
          <WheelCanvas
            names={names}
            imageStore={imageStore}
            boostedParticipants={boostedParticipants}
            rotationAngle={currentRotation}
            canvasSize={wheelAreaDimension * 0.9} 
            centerImageSrc={centerImageSrc}
            wheelBackgroundImageSrc={wheelBackgroundImageSrc}
            dynamicBackgroundColor={wheelDynamicBackground} 
            onWheelClick={spinWheel}
          />
        </div>

        <div className="flex flex-col items-center space-y-5 w-full lg:max-w-md xl:max-w-lg">
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
            <div className="space-y-4">
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
              <label htmlFor="useGiftListCheckbox" className="flex items-center justify-center space-x-2 text-slate-300 cursor-pointer p-2 rounded-md hover:bg-slate-700 transition-colors">
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
            </div>
          ))}

          {renderCollapsibleSection("Tăng tỉ lệ thắng", isBoostWinRateOpen, setIsBoostWinRateOpen, "boostWinRateContent", (
            <BoostWinRateInput
              boostedParticipants={boostedParticipants}
              setBoostedParticipants={setBoostedParticipants}
              isSpinning={isSpinning}
              namesOnWheel={names}
              imageStore={imageStore}
            />
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
               <div className="pt-3 border-t border-slate-700/50">
                 <WheelBackgroundColorPicker
                    currentBackground={wheelDynamicBackground}
                    onBackgroundChange={handleWheelDynamicBackgroundChange}
                    isSpinning={isSpinning}
                  />
               </div>
            </div>
          ))}

           {renderCollapsibleSection("🎨 Tùy Chỉnh Giao Diện Chung", isAppAppearanceOpen, setIsAppAppearanceOpen, "appAppearanceContent", (
                <AppBackgroundColorPicker
                    currentBackground={appGlobalBackground}
                    onBackgroundChange={handleAppGlobalBackgroundChange}
                    isSpinning={isSpinning}
                />
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
