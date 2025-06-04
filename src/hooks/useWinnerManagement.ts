
import React, { useState, useCallback } from 'react';
import type { WinnerHistoryItem, WinnerDetails, GiftItem, BoostedParticipant } from '../types'; // Added BoostedParticipant
import { useNotification } from '../components/NotificationContext';
import { shuffleArray } from '../utils'; // Assuming utils.ts is created

export interface WinnerData {
  id: string;
  displayName: string;
  isImage: boolean;
  imageDataURL?: string;
  giftAwarded?: {
    title: string;
    name: string;
  };
}


export const useWinnerManagement = (
  // Props from other hooks / App state that this hook needs
  getNames: () => string[], // To get current names list for removal/shuffling
  updateNames: (newNames: string[]) => void,
  getImageStore: () => Record<string, { dataURL: string; fileName: string }>, // For display
  getPriorityNamesInput: () => string,
  updatePriorityNamesInput: (newInput: string) => void,
  getBoostedParticipants: () => BoostedParticipant[],
  updateBoostedParticipants: React.Dispatch<React.SetStateAction<BoostedParticipant[]>>, // Corrected type
  getGiftList: () => GiftItem[],
  updateGiftList: (updater: (prevGifts: GiftItem[]) => GiftItem[]) => void,
  getAutoRemoveWinner: () => boolean,
  getAutoShuffle: () => boolean,
  getUseGiftList: () => boolean,
  setShowConfetti: (show: boolean) => void // From useInterfaceState
) => {
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistoryItem[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null); // Winner display name
  const [selectedItem, setSelectedItem] = useState<string | null>(null); // Winner ID or text
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [pendingWinnerForAutoRemoval, setPendingWinnerForAutoRemoval] = useState<WinnerDetails | null>(null);
  const [currentGiftForModal, setCurrentGiftForModal] = useState<{ title: string; name: string } | null>(null);
  
  const { addNotification } = useNotification();

  const addWinnerToHistoryAndDisplay = useCallback((winnerData: WinnerData) => {
    const { id, displayName, isImage, imageDataURL, giftAwarded } = winnerData;
    
    setSelectedName(displayName);
    setSelectedItem(id); // This is the original nameOrId from the wheel

    const winnerDetails: WinnerDetails = { id, displayName, isImage, imageDataURL };

    if (getAutoRemoveWinner()) {
      setPendingWinnerForAutoRemoval(winnerDetails);
    }

    if (getUseGiftList() && giftAwarded) {
      const awardedGiftEntry = getGiftList().find(g => g.title === giftAwarded.title && g.giftName === giftAwarded.name && g.quantity > 0);
      if (awardedGiftEntry) {
        setWinnerHistory(prevHistory => [
          ...prevHistory,
          {
            type: 'gift',
            giftTitle: awardedGiftEntry.title,
            giftAwardedName: awardedGiftEntry.giftName,
            winner: winnerDetails,
            timestamp: Date.now()
          }
        ]);
        updateGiftList(prevGifts => prevGifts.map(gift =>
          gift.id === awardedGiftEntry.id
          ? { ...gift, quantity: gift.quantity - 1 }
          : gift
        ));
        setCurrentGiftForModal({ title: awardedGiftEntry.title, name: awardedGiftEntry.giftName });
      } else {
        // Fallback to standard if gift somehow became unavailable (should be rare)
         addNotification("Quà đã chọn không còn khả dụng, ghi nhận như vòng quay thường.", "warning");
         setWinnerHistory(prevHistory => [ ...prevHistory, { type: 'standard', winner: winnerDetails, timestamp: Date.now() }]);
         setCurrentGiftForModal(null);
      }
    } else {
      setWinnerHistory(prevHistory => [ ...prevHistory, { type: 'standard', winner: winnerDetails, timestamp: Date.now() }]);
      setCurrentGiftForModal(null);
    }
    
    setShowWinnerModal(true);
    setShowConfetti(true); // Trigger confetti
  }, [
      getAutoRemoveWinner, getUseGiftList, getGiftList, updateGiftList, 
      addNotification, setShowConfetti, setWinnerHistory, setSelectedItem, setSelectedName, setPendingWinnerForAutoRemoval, setCurrentGiftForModal
    ]);

  const clearWinnerHistory = useCallback(() => {
    setWinnerHistory([]);
    addNotification("Đã xóa lịch sử kết quả.", 'info');
  }, [addNotification]);


  const handleCloseWinnerModalLogic = useCallback(() => {
    setShowWinnerModal(false);
    let finalNamesList = [...getNames()];
    let performedNameListUpdate = false;

    if (getAutoRemoveWinner() && pendingWinnerForAutoRemoval) {
      const winnerToRemove = pendingWinnerForAutoRemoval;
      finalNamesList = finalNamesList.filter(item => item !== winnerToRemove.id);
      performedNameListUpdate = true;
      
      const winnerDisplayNameNormalized = winnerToRemove.displayName.trim().toLowerCase();
      
      // Remove from priority list
      const currentPriorityList = getPriorityNamesInput()
        .split(/[\n,]+/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      const newPriorityList = currentPriorityList.filter(
        name => name.trim().toLowerCase() !== winnerDisplayNameNormalized
      );
      updatePriorityNamesInput(newPriorityList.join('\n'));

      // Remove from boosted list
      updateBoostedParticipants(prevBoosted =>
        prevBoosted.filter(
          p => p.name.trim().toLowerCase() !== winnerDisplayNameNormalized
        )
      );
      
      addNotification(`Đã tự động xóa "${winnerToRemove.displayName}" khỏi tất cả danh sách.`, 'info', 4000);
      setPendingWinnerForAutoRemoval(null);
    }

    if (getAutoShuffle()) {
      if (finalNamesList.length > 0) {
        finalNamesList = shuffleArray(finalNamesList);
        performedNameListUpdate = true;
        if (!(getAutoRemoveWinner() && pendingWinnerForAutoRemoval)) {
          addNotification("Đã tự động trộn danh sách.", "info", 3000);
        }
      }
    }

    if (performedNameListUpdate) {
      updateNames(finalNamesList);
    }
  }, [
    getNames, updateNames, getAutoRemoveWinner, pendingWinnerForAutoRemoval, 
    getPriorityNamesInput, updatePriorityNamesInput, updateBoostedParticipants, 
    getAutoShuffle, addNotification, setPendingWinnerForAutoRemoval
  ]);


  const handleRemoveWinnerManually = useCallback(() => {
    if (selectedItem) {
      const updatedNamesArray = getNames().filter(item => item !== selectedItem);
      updateNames(updatedNamesArray);

      if (selectedName) {
        const winnerDisplayNameNormalized = selectedName.trim().toLowerCase();
        
        const currentPriorityList = getPriorityNamesInput()
          .split(/[\n,]+/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
        const newPriorityList = currentPriorityList.filter(
          name => name.trim().toLowerCase() !== winnerDisplayNameNormalized
        );
        updatePriorityNamesInput(newPriorityList.join('\n'));

        updateBoostedParticipants(prevBoosted =>
          prevBoosted.filter(
            p => p.name.trim().toLowerCase() !== winnerDisplayNameNormalized
          )
        );
        addNotification(`Đã xóa "${selectedName}" khỏi các danh sách liên quan.`, 'info');
      } else {
        addNotification(`Đã xóa mục đã chọn khỏi danh sách quay.`, 'info');
      }
    }
    setShowWinnerModal(false); // Also close modal after manual removal
  }, [
    selectedItem, selectedName, getNames, updateNames, getPriorityNamesInput, 
    updatePriorityNamesInput, updateBoostedParticipants, addNotification
  ]);


  return {
    winnerHistory,
    selectedName,
    selectedItem,
    showWinnerModal,
    setShowWinnerModal, // Expose for direct control if needed
    pendingWinnerForAutoRemoval, // For WinnerModal UI
    currentGiftForModal, // For WinnerModal UI
    addWinnerToHistoryAndDisplay,
    clearWinnerHistory,
    handleCloseWinnerModalLogic,
    handleRemoveWinnerManually,
  };
};
