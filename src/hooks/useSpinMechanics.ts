import { useState, useRef, useCallback } from 'react';
import { easeOutQuart } from '../utils';
import type { ImageStore } from '../App'; // Adjust path
import type { GiftItem, BoostedParticipant, WinnerDetails } from '../types';
import { useWinnerManagement } from './useWinnerManagement'; // To call addWinnerToHistoryAndDisplay


// Constants for spin animation (can be tuned)
const DESIRED_INITIAL_ANGULAR_VELOCITY_RAD_PER_MS_SPIN = 0.025;
const ABSOLUTE_MIN_TOTAL_SPINS_SPIN = 4;
const EPSILON_FINISH_SPIN = 0.001; // Tolerance for rotation comparison

interface SpinMechanicsProps {
  names: string[];
  imageStore: ImageStore;
  boostedParticipants: BoostedParticipant[];
  parsedPriorityNames: string[];
  showBoostWinRateSectionInTab: boolean;
  
  spinDuration: number;
  
  useGiftList: boolean;
  giftList: GiftItem[];
  
  activeTickSoundElement: HTMLAudioElement | null;
  activeSoundIsContinuous: boolean;
  playTickSoundContinuousStart: () => void;
  playTickSoundContinuousStop: () => void;
  playWinSound: () => void;

  onSpinComplete: (winnerData: WinnerDataParam) => void; // Callback to useWinnerManagement
  
  wheelWrapperRef: React.RefObject<HTMLDivElement>; // For scrolling into view
}

export interface WinnerDataParam {
  id: string; // original nameOrId
  displayName: string;
  isImage: boolean;
  imageDataURL?: string;
  giftAwarded?: { title: string; name: string };
}


export const useSpinMechanics = ({
  names, imageStore, boostedParticipants, parsedPriorityNames, showBoostWinRateSectionInTab,
  spinDuration, useGiftList, giftList,
  activeTickSoundElement, activeSoundIsContinuous, playTickSoundContinuousStart, playTickSoundContinuousStop, playWinSound,
  onSpinComplete, wheelWrapperRef
}: SpinMechanicsProps) => {
  const [currentRotation, setCurrentRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const spinStartRotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const spinStartTimeRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const winnerIndexRef = useRef(0);
  const winningGiftRef = useRef<GiftItem | null>(null); // Stores the gift item determined at spin start

  const getCurrentGiftToSpinFor = useCallback((): GiftItem | null => {
    if (!useGiftList || giftList.length === 0) return null;
    return giftList.find(gift => gift.quantity > 0) || null;
  }, [useGiftList, giftList]);


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
      rotationNumericallyAtTarget = Math.abs(currentFrameRotation - targetRotation) < EPSILON_FINISH_SPIN;
    }

    if (timePhysicallyUp || (rotationNumericallyAtTarget && elapsed > 50)) {
      currentFrameRotation = targetRotation;
      setCurrentRotation(currentFrameRotation);
      animationFrameIdRef.current = null;

      if (activeSoundIsContinuous) {
        playTickSoundContinuousStop();
      }
      
      const winnerIdOrName = names[winnerIndexRef.current];
      const winnerImageAsset = imageStore[winnerIdOrName];
      const winnerDisplayName = winnerImageAsset?.fileName || winnerIdOrName;
      
      const winnerData: WinnerDataParam = {
        id: winnerIdOrName,
        displayName: winnerDisplayName ? winnerDisplayName.trim() : "",
        isImage: !!winnerImageAsset,
        imageDataURL: winnerImageAsset?.dataURL,
        giftAwarded: winningGiftRef.current ? { title: winningGiftRef.current.title, name: winningGiftRef.current.giftName } : undefined
      };
      
      onSpinComplete(winnerData); // This will call addWinnerToHistoryAndDisplay from useWinnerManagement
      playWinSound();
      setIsSpinning(false);
      return;
    }

    setCurrentRotation(currentFrameRotation);
    animationFrameIdRef.current = requestAnimationFrame(animateSpin);
  }, [
      spinDuration, names, imageStore, 
      activeSoundIsContinuous, playTickSoundContinuousStop, 
      onSpinComplete, playWinSound
    ]);


  const spinWheel = useCallback(() => {
    if (names.length === 0 || isSpinning) return;

    if (wheelWrapperRef.current) {
      wheelWrapperRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    if (activeSoundIsContinuous) {
      playTickSoundContinuousStart();
    }

    let currentGiftToAward: GiftItem | null = null;
    if (useGiftList) {
      currentGiftToAward = getCurrentGiftToSpinFor();
      if (!currentGiftToAward) {
        // Notification handled by App.tsx or parent component that calls spinWheel
        return false; // Indicate spin cannot proceed
      }
      winningGiftRef.current = currentGiftToAward;
    } else {
      winningGiftRef.current = null;
    }

    setIsSpinning(true);
    // Resetting winner display state is handled by useWinnerManagement or onSpinComplete call path

    let chosenWinnerIndex = -1;
    const wheelItemsWithDetails = names.map((nameOrId, index) => ({
      originalIdOrName: nameOrId,
      displayName: (imageStore[nameOrId]?.fileName || nameOrId).trim().toLowerCase(),
      originalIndex: index,
    }));

    // Priority Names Logic
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

    // Boosted Participants Logic (if no priority winner found)
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
        if (chosenWinnerIndex === -1) { // Fallback to non-boosted if random number didn't hit boosted
          const nonBoostedOnWheel = wheelItemsWithDetails.filter(item => 
            !validBoostedOnWheel.some(bp => bp.originalIndex === item.originalIndex)
          );
          if (nonBoostedOnWheel.length > 0) {
            chosenWinnerIndex = nonBoostedOnWheel[Math.floor(Math.random() * nonBoostedOnWheel.length)].originalIndex;
          } else if (validBoostedOnWheel.length > 0) { // Only boosted items left
             chosenWinnerIndex = validBoostedOnWheel[Math.floor(Math.random() * validBoostedOnWheel.length)].originalIndex;
          }
        }
      }
    }
    
    // Default Random Selection (if no priority or boosted winner found)
    if (chosenWinnerIndex === -1) {
      if (names.length > 0) {
        chosenWinnerIndex = Math.floor(Math.random() * names.length);
      } else {
        setIsSpinning(false);
        return false; // Spin cannot proceed
      }
    }
    winnerIndexRef.current = chosenWinnerIndex;
    
    // Calculate Target Rotation based on probabilities
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
    
    effectiveProbabilities = effectiveProbabilities.filter(p => p.probability > 1e-9); // Filter out zero-probability segments
    const totalProbSum = effectiveProbabilities.reduce((sum, p) => sum + p.probability, 0);
    if (effectiveProbabilities.length > 0 && totalProbSum > 0 && Math.abs(totalProbSum - 1.0) > 1e-9) { // Normalize if sum isn't 1
        effectiveProbabilities = effectiveProbabilities.map(p => ({ ...p, probability: p.probability / totalProbSum }));
    }

    let cumulativeAngle = 0;
    let winnerSegmentStartAngle = 0;
    let winnerSegmentAngleSpan = Math.PI * 2 / (names.length > 0 ? names.length : 1);

    for (let i = 0; i < effectiveProbabilities.length; i++) {
      const participantProb = effectiveProbabilities[i];
      const segmentAngleSpanForThis = participantProb.probability * 2 * Math.PI;
      // Find the segment corresponding to the pre-determined winnerIndexRef.current
      if (names[winnerIndexRef.current] === participantProb.nameOrId) {
        winnerSegmentStartAngle = cumulativeAngle;
        winnerSegmentAngleSpan = segmentAngleSpanForThis;
        break; 
      }
      cumulativeAngle += segmentAngleSpanForThis;
    }

    const staticPointerAngle = -Math.PI / 2; // Pointer is at the top (pointing down)
    const randomOffsetFactor = (Math.random() * 0.7) + 0.15; // Land somewhere in middle 70% of segment
    const targetAngleOnWheel = winnerSegmentStartAngle + winnerSegmentAngleSpan * randomOffsetFactor;
    
    let finalTargetNormalizedRotation = (staticPointerAngle - targetAngleOnWheel);
    finalTargetNormalizedRotation = (finalTargetNormalizedRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    const spinStartActual = currentRotation;
    const deltaRotationFromVelocity = (DESIRED_INITIAL_ANGULAR_VELOCITY_RAD_PER_MS_SPIN * spinDuration) / 4;
    const minDeltaRotationFromSpins = ABSOLUTE_MIN_TOTAL_SPINS_SPIN * 2 * Math.PI;
    const requiredDeltaRotation = Math.max(deltaRotationFromVelocity, minDeltaRotationFromSpins);

    let provisionalTargetRotation = spinStartActual + requiredDeltaRotation;
    let provisionalEndNormalized = (provisionalTargetRotation % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    let angleAdjustment = (finalTargetNormalizedRotation - provisionalEndNormalized + 2 * Math.PI) % (2 * Math.PI);
    let finalCalculatedTargetRotation = provisionalTargetRotation + angleAdjustment;

    // Ensure enough spins
    while (finalCalculatedTargetRotation < spinStartActual + requiredDeltaRotation - (Math.PI * 0.5) || 
           (requiredDeltaRotation > 0.1 && finalCalculatedTargetRotation <= spinStartActual + 0.1) ) { 
      finalCalculatedTargetRotation += 2 * Math.PI;
    }
    
    targetRotationRef.current = finalCalculatedTargetRotation;
    spinStartRotationRef.current = spinStartActual;
    spinStartTimeRef.current = 0; // Reset for animation frame

    animationFrameIdRef.current = requestAnimationFrame(animateSpin);
    return true; // Spin initiated
  }, [
    names, isSpinning, imageStore, parsedPriorityNames, boostedParticipants, showBoostWinRateSectionInTab,
    spinDuration, useGiftList, giftList, getCurrentGiftToSpinFor,
    currentRotation, animateSpin, wheelWrapperRef,
    activeSoundIsContinuous, playTickSoundContinuousStart, // activeTickSoundElement is used by animateSpin for discrete ticks via WheelCanvas if not continuous
  ]);

  return {
    currentRotation, // For WheelCanvas
    isSpinning,      // For disabling UI elements
    spinWheel,       // To trigger the spin
    animationFrameIdRef // To cancel animation on unmount if needed
  };
};
