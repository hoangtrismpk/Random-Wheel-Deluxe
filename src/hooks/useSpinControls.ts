
import { useState, useEffect } from 'react';
import type { SoundOption } from '../types'; // Corrected import
import { CUSTOM_SOUND_URL_PLACEHOLDER } from '../App'; // Adjust path

const DEFAULT_SPIN_DURATION_MS_HOOK = 10000;

export const useSpinControls = (
    selectedTickSoundUrl: string,
    customSoundDurationSeconds: number | null,
    availableTickSounds: SoundOption[]
) => {
  const [spinDuration, setSpinDuration] = useState<number>(DEFAULT_SPIN_DURATION_MS_HOOK);
  const [isSpinDurationLocked, setIsSpinDurationLocked] = useState<boolean>(false);
  
  const [autoShuffle, setAutoShuffle] = useState<boolean>(false);
  const [autoRemoveWinner, setAutoRemoveWinner] = useState<boolean>(false);
  const [useGiftList, setUseGiftList] = useState<boolean>(false); // Also part of spin options

  useEffect(() => {
    let newDuration = DEFAULT_SPIN_DURATION_MS_HOOK;
    let newLockedState = false;
    let durationChangedBySound = false;

    if (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDurationSeconds !== null) {
        newDuration = Math.round(customSoundDurationSeconds * 1000);
        newLockedState = false; // User can adjust down from custom sound's duration
        durationChangedBySound = true;
    } else {
        const soundOption = availableTickSounds.find(s => s.url === selectedTickSoundUrl);
        if (soundOption?.fixedDuration) {
            newDuration = soundOption.fixedDuration * 1000;
            newLockedState = true;
            durationChangedBySound = true;
        } else {
             // If not locked by predefined or set by custom, keep user's current duration
             // unless the lock state itself is changing (e.g. from locked to unlocked)
             if(isSpinDurationLocked) { // Was locked, now isn't
                newDuration = DEFAULT_SPIN_DURATION_MS_HOOK; // Revert to default if becoming unlocked
                durationChangedBySound = true;
             } else { // Was not locked, and still not locked by new sound
                newDuration = spinDuration; // Keep current
             }
             newLockedState = false;
        }
    }
    
    if (durationChangedBySound && (newDuration !== spinDuration || newLockedState !== isSpinDurationLocked)) {
        setSpinDuration(newDuration);
    }
    // Always update lock state if it changes, regardless of duration value
    if (newLockedState !== isSpinDurationLocked) {
      setIsSpinDurationLocked(newLockedState);
      if (newLockedState) { // If it became locked, ensure duration matches
        setSpinDuration(newDuration);
      }
    }


  }, [selectedTickSoundUrl, customSoundDurationSeconds, availableTickSounds, spinDuration, isSpinDurationLocked]);


  return {
    spinDuration, setSpinDuration, // Expose setter for direct UI manipulation
    isSpinDurationLocked, // For UI display
    autoShuffle, setAutoShuffle,
    autoRemoveWinner, setAutoRemoveWinner,
    useGiftList, setUseGiftList,
    DEFAULT_SPIN_DURATION_MS_HOOK
  };
};
