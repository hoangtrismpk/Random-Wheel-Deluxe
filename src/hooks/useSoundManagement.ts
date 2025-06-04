
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNotification } from '../components/NotificationContext';
import type { SoundOption } from '../types'; // Corrected import
import { CUSTOM_SOUND_URL_PLACEHOLDER } from '../App'; // Adjust path

export const useSoundManagement = (
    availableTickSounds: SoundOption[],
    defaultTickSoundUrl: string
) => {
  const [selectedTickSoundUrl, setSelectedTickSoundUrl] = useState<string>(defaultTickSoundUrl);
  const [customSoundDataUrl, setCustomSoundDataUrl] = useState<string | null>(null);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);
  const [customSoundDurationSeconds, setCustomSoundDurationSeconds] = useState<number | null>(null);
  
  const [activeTickSoundElement, setActiveTickSoundElement] = useState<HTMLAudioElement | null>(null);
  const [tickSoundVolume, setTickSoundVolume] = useState<number>(1);
  const [activeSoundIsContinuous, setActiveSoundIsContinuous] = useState<boolean>(false);
  
  const audioFadeIntervalRef = useRef<number | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const { addNotification } = useNotification();

  useEffect(() => {
    const sound = new Audio("https://irace.vn/wp-content/uploads/2025/05/vo-tay.mp3");
    sound.preload = "auto";
    sound.onerror = () => { console.error("Error loading win sound."); };
    winSoundRef.current = sound;
    return () => {
        sound.pause(); // Ensure cleanup if component unmounts quickly
    }
  }, []);

  const handleSoundConfigChange = useCallback((config: { url: string; dataUrl?: string; fileName?: string }) => {
    setSelectedTickSoundUrl(config.url);
    if (config.url === CUSTOM_SOUND_URL_PLACEHOLDER && config.dataUrl && config.fileName) {
      setCustomSoundDataUrl(config.dataUrl);
      setCustomSoundName(config.fileName);
      setCustomSoundDurationSeconds(null); // Reset duration, will be validated by useEffect
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

    let newAudioToSet: HTMLAudioElement | null = null;
    let soundIsContinuousForThisEffect = false;

    if (selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDataUrl) {
      soundIsContinuousForThisEffect = true; // Custom sounds are treated as continuous

      if (customSoundDurationSeconds === null) { // Needs validation
        setActiveTickSoundElement(null); // Clear current while validating
        setActiveSoundIsContinuous(true); // Assume true during validation
        
        const audioForValidation = new Audio(customSoundDataUrl);
        audioForValidation.onloadedmetadata = () => {
          const duration = audioForValidation.duration;
          if (!isFinite(duration) || duration < 5 || duration > 60) {
            addNotification(
              !isFinite(duration) ? "Không thể xác định thời lượng âm thanh tùy chỉnh." :
              duration < 5 ? "Âm thanh tùy chỉnh quá ngắn (tối thiểu 5 giây)." : "Âm thanh tùy chỉnh quá dài (tối đa 60 giây).",
              'error', 5000
            );
            handleSoundConfigChange({ url: defaultTickSoundUrl }); // Revert
            return; 
          }
          setCustomSoundDurationSeconds(duration); // This will trigger a re-run
        };
        audioForValidation.onerror = () => {
          addNotification("Lỗi khi tải siêu dữ liệu cho âm thanh tùy chỉnh. Tệp có thể bị hỏng.", 'error');
          handleSoundConfigChange({ url: defaultTickSoundUrl }); // Revert
        };
        return; // Exit: wait for validation and re-run
      }
      
      // If here, custom sound is validated (customSoundDurationSeconds is not null)
      newAudioToSet = new Audio(customSoundDataUrl);
      newAudioToSet.loop = true; 
    } else {
      // Predefined sound
      const soundOption = availableTickSounds.find(s => s.url === selectedTickSoundUrl);
      if (soundOption) {
        newAudioToSet = new Audio(soundOption.url);
        soundIsContinuousForThisEffect = !!soundOption.isContinuous;
        newAudioToSet.loop = soundIsContinuousForThisEffect;
      }
    }

    if (newAudioToSet) {
      newAudioToSet.preload = "auto";
      newAudioToSet.volume = tickSoundVolume;
      newAudioToSet.onerror = () => {
        const soundName = selectedTickSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER ? customSoundName : availableTickSounds.find(s=>s.url === selectedTickSoundUrl)?.name;
        addNotification(<>{"Lỗi tải âm thanh"}: {soundName || 'không rõ'}</>, 'error');
        setActiveTickSoundElement(null); 
      };
    }
    
    setActiveTickSoundElement(newAudioToSet);
    setActiveSoundIsContinuous(soundIsContinuousForThisEffect);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTickSoundUrl, customSoundDataUrl, customSoundDurationSeconds, tickSoundVolume, defaultTickSoundUrl, availableTickSounds, handleSoundConfigChange, addNotification]);


  useEffect(() => {
    if (activeTickSoundElement) {
      activeTickSoundElement.volume = tickSoundVolume;
    }
  }, [tickSoundVolume, activeTickSoundElement]);

  const playWinSound = useCallback(() => {
    if (winSoundRef.current) {
      winSoundRef.current.currentTime = 0;
      winSoundRef.current.play().catch(error => {
        console.warn("Không thể phát âm thanh chiến thắng:", error);
        addNotification("Không thể phát âm thanh. Trình duyệt có thể đã chặn tự động phát.", "info", 5000);
      });
    }
  }, [addNotification, winSoundRef]);

  const playTickSoundContinuousStart = useCallback(() => {
    if (audioFadeIntervalRef.current) {
        clearInterval(audioFadeIntervalRef.current);
        audioFadeIntervalRef.current = null;
    }
    if (activeTickSoundElement && activeSoundIsContinuous) {
        activeTickSoundElement.currentTime = 0;
        activeTickSoundElement.volume = tickSoundVolume; 
        activeTickSoundElement.loop = true; 
        activeTickSoundElement.play().catch(e => console.warn("Continuous sound play failed:", e));
    }
  }, [activeTickSoundElement, activeSoundIsContinuous, tickSoundVolume, audioFadeIntervalRef]);

  const playTickSoundContinuousStop = useCallback(() => {
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
  }, [activeTickSoundElement, activeSoundIsContinuous, tickSoundVolume, audioFadeIntervalRef]);


  return {
    selectedTickSoundUrl,
    customSoundDataUrl,
    customSoundName,
    customSoundDurationSeconds,
    activeTickSoundElement,
    tickSoundVolume,
    setTickSoundVolume,
    activeSoundIsContinuous,
    handleSoundConfigChange,
    playWinSound,
    playTickSoundContinuousStart,
    playTickSoundContinuousStop,
    audioFadeIntervalRef
  };
};