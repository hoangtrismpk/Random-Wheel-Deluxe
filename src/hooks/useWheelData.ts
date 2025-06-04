import { useState, useCallback, useEffect } from 'react';
import type { ImageStore, ImageAsset } from '../App'; // Adjust path if App moves or ImageAsset defined elsewhere
import type { GiftItem, BoostedParticipant } from '../types';

export const useWheelData = (initialNames: string[] = []) => {
  const [names, setNamesInternal] = useState<string[]>(initialNames);
  const [imageStore, setImageStoreInternal] = useState<ImageStore>({});
  const [giftList, setGiftList] = useState<GiftItem[]>([]);
  const [boostedParticipants, setBoostedParticipants] = useState<BoostedParticipant[]>([]);
  
  const [priorityNamesInput, setPriorityNamesInput] = useState<string>('');
  const [parsedPriorityNames, setParsedPriorityNames] = useState<string[]>([]);

  useEffect(() => {
    const newParsedNames = priorityNamesInput
      .split(/[\n,]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
    setParsedPriorityNames(newParsedNames);
  }, [priorityNamesInput]);

  const handleNamesUpdate = useCallback((newNamesFromInput: string[], currentIsSpinning: boolean, currentShowWinnerModal: boolean) => {
    setNamesInternal(newNamesFromInput);

    setImageStoreInternal(prevStore => {
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
    
    // This part might need to be handled by the hook that manages selectedName/Item
    // For now, let's return a signal or let App.tsx handle it based on these values.
    // if (!currentIsSpinning && !currentShowWinnerModal) {
    //   //setSelectedName(null); // Managed by useWinnerManagement
    //   //setSelectedItem(null); // Managed by useWinnerManagement
    //   //setCurrentRotation(prev => prev % (2 * Math.PI)); // Managed by useSpinMechanics
    // }
  }, []);

  const addNewImageToWheel = useCallback((id: string, dataURL: string, fileName: string) => {
    setImageStoreInternal(prev => ({ ...prev, [id]: { dataURL, fileName } }));
    setNamesInternal(prevNames => [...prevNames, id]);
  }, []);

  return {
    names,
    setNames: setNamesInternal, // Expose for direct manipulation if needed by winner removal etc.
    imageStore,
    setImageStore: setImageStoreInternal,
    giftList,
    setGiftList,
    boostedParticipants,
    setBoostedParticipants,
    priorityNamesInput,
    setPriorityNamesInput,
    parsedPriorityNames,
    handleNamesUpdate,
    addNewImageToWheel,
  };
};
