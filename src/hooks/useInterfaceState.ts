
import { useState, useRef, useEffect, useCallback } from 'react';
// import type { SpinOptionTab } from '../App'; // SpinOptionTab is defined in App.tsx, if needed here, move to types.ts

// Re-define SpinOptionTab here if it's not moved to types.ts and App.tsx imports it from types.ts
type SpinOptionTab = 'beforeSpin' | 'duringSpin' | 'afterSpin';


export const useInterfaceState = () => {
  const [activeTab, setActiveTab] = useState<'nameInput' | 'results'>('nameInput');
  const [isSpinOptionsOpen, setIsSpinOptionsOpen] = useState<boolean>(false);
  const [activeSpinOptionTab, setActiveSpinOptionTab] = useState<SpinOptionTab>('beforeSpin');
  const [isWheelCustomizationOpen, setIsWheelCustomizationOpen] = useState<boolean>(false);
  const [isAppAppearanceOpen, setIsAppAppearanceOpen] = useState<boolean>(false);
  const [showPriorityInputSection, setShowPriorityInputSection] = useState(false);
  const [showBoostWinRateSectionInTab, setShowBoostWinRateSectionInTab] = useState<boolean>(false); // Added state
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageSelectionPurpose, setImageSelectionPurpose] = useState<'centerLogo' | 'wheelBackground' | null>(null);
  
  const [showClearHistoryConfirmModal, setShowClearHistoryConfirmModal] = useState(false);
  
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimerRef = useRef<number | null>(null);

  const openImageModal = useCallback((purpose: 'centerLogo' | 'wheelBackground') => {
    setImageSelectionPurpose(purpose);
    setIsImageModalOpen(true);
  }, []);

  const closeImageModal = useCallback(() => {
    setIsImageModalOpen(false);
    setImageSelectionPurpose(null);
  }, []);

  useEffect(() => {
    if (showConfetti) {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
      }, 6000); // Default confetti duration
    } else if (!showConfetti && confettiTimerRef.current) {
      clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }
    return () => {
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current);
      }
    };
  }, [showConfetti]);


  return {
    activeTab, setActiveTab,
    isSpinOptionsOpen, setIsSpinOptionsOpen,
    activeSpinOptionTab, setActiveSpinOptionTab,
    isWheelCustomizationOpen, setIsWheelCustomizationOpen,
    isAppAppearanceOpen, setIsAppAppearanceOpen,
    showPriorityInputSection, setShowPriorityInputSection,
    showBoostWinRateSectionInTab, setShowBoostWinRateSectionInTab, // Return new state and setter
    isImageModalOpen, setIsImageModalOpen, // setIsImageModalOpen was missing from return
    imageSelectionPurpose, setImageSelectionPurpose, // setImageSelectionPurpose was missing
    openImageModal, closeImageModal,
    showClearHistoryConfirmModal, setShowClearHistoryConfirmModal,
    showConfetti, setShowConfetti, 
  };
};
