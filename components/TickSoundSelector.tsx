
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNotification } from './NotificationContext';
import type { SoundOption } from '../App'; // Import SoundOption type
import { CUSTOM_SOUND_URL_PLACEHOLDER } from '../App'; // Import placeholder

interface TickSoundSelectorProps {
  availableSounds: SoundOption[];
  currentSoundUrl: string; // This will be the URL or the placeholder
  customSoundName: string | null;
  customSoundDataUrl: string | null;
  onSoundConfigChange: (config: { url: string; dataUrl?: string; fileName?: string }) => void;
  isSpinning: boolean;
  tickVolume: number; // 0.0 to 1.0
  onTickVolumeChange: (volume: number) => void; // Takes 0.0 to 1.0
}

const TickSoundSelector: React.FC<TickSoundSelectorProps> = ({
  availableSounds,
  currentSoundUrl,
  customSoundName,
  customSoundDataUrl,
  onSoundConfigChange,
  isSpinning,
  tickVolume,
  onTickVolumeChange,
}) => {
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isTestingSound, setIsTestingSound] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const volumeSliderRef = useRef<HTMLInputElement>(null);
  const [volumeTooltipStyle, setVolumeTooltipStyle] = useState({ left: '0%' });
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    // Clean up test audio when component unmounts or when selected sound changes
    const currentTestAudio = testAudioRef.current;
    if (currentTestAudio) {
      currentTestAudio.pause();
      currentTestAudio.oncanplaythrough = null;
      currentTestAudio.onerror = null;
      currentTestAudio.onended = null;
    }
    setIsTestingSound(false); // Reset testing state

    return () => {
      if (currentTestAudio) {
        currentTestAudio.pause();
      }
    };
  }, [currentSoundUrl, customSoundDataUrl]);


  useLayoutEffect(() => {
    const sliderElement = volumeSliderRef.current;
    if (!sliderElement) {
      setVolumeTooltipStyle({ left: '0%'});
      return;
    }

    const inputWidth = sliderElement.offsetWidth;
    if (inputWidth === 0) {
      return;
    }

    const thumbWidthEstimate = parseFloat(getComputedStyle(sliderElement).getPropertyValue('--slider-thumb-size')) || 16;
    
    const val = tickVolume * 100;
    const min = parseFloat(sliderElement.min) || 0;
    const max = parseFloat(sliderElement.max) || 100;
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

    setVolumeTooltipStyle({ left: `${leftPercentage}%` });
  }, [tickVolume, showVolumeTooltip]);


  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (isSpinning) return;
    const newUrl = event.target.value;
    if (newUrl === CUSTOM_SOUND_URL_PLACEHOLDER && customSoundDataUrl && customSoundName) {
        onSoundConfigChange({ url: CUSTOM_SOUND_URL_PLACEHOLDER, dataUrl: customSoundDataUrl, fileName: customSoundName });
    } else {
        // When selecting a predefined sound, clear any custom sound data from App's perspective if it's not already the active one
        onSoundConfigChange({ url: newUrl });
    }
  };

  const handleTestSoundToggle = () => {
    if (isSpinning) return;

    let soundUrlToTest = currentSoundUrl;
    if (currentSoundUrl === CUSTOM_SOUND_URL_PLACEHOLDER) {
        soundUrlToTest = customSoundDataUrl || "";
    }
    
    if (!soundUrlToTest) {
        addNotification("Không có âm thanh nào được chọn để thử.", "info");
        return;
    }

    if (testAudioRef.current && !testAudioRef.current.paused) {
      testAudioRef.current.pause();
      setIsTestingSound(false);
    } else {
      if (testAudioRef.current && testAudioRef.current.src === soundUrlToTest && testAudioRef.current.readyState >= 2) { // HTMLMediaElement.HAVE_CURRENT_DATA
         testAudioRef.current.currentTime = 0; // Restart if same sound
      } else {
        if(testAudioRef.current) testAudioRef.current.pause(); // Pause previous if different
        testAudioRef.current = new Audio(soundUrlToTest);
      }

      testAudioRef.current.volume = tickVolume;
      testAudioRef.current.loop = false; // Test sound should not loop indefinitely by default

      testAudioRef.current.oncanplaythrough = () => {
        if (testAudioRef.current) { // Check if still current
            testAudioRef.current.play()
            .then(() => setIsTestingSound(true))
            .catch(error => {
              console.warn("Test sound play failed:", error);
              addNotification(<>Lỗi khi phát thử âm thanh.</>, 'error', 4000);
              setIsTestingSound(false);
            });
        }
      };
      testAudioRef.current.onerror = () => {
        console.error("Error loading test sound:", soundUrlToTest);
        addNotification(<>Không thể tải âm thanh thử nghiệm.</>, 'error', 4000);
        setIsTestingSound(false);
        testAudioRef.current = null; // Clear faulty audio element
      };
      testAudioRef.current.onended = () => {
        setIsTestingSound(false);
      };
      // If not preloaded, load it
      if(testAudioRef.current.readyState < 2) testAudioRef.current.load();
    }
  };

  const handleVolumeSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    const newVolumePercentage = parseInt(event.target.value, 10);
    const newVolume = newVolumePercentage / 100;
    onTickVolumeChange(newVolume);
    if (testAudioRef.current) {
      testAudioRef.current.volume = newVolume;
    }
  };
  
  const handleCustomFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isSpinning) return;
    const file = event.target.files?.[0];
    if (file) {
        if (!['audio/mpeg', 'audio/wav', 'audio/ogg'].includes(file.type)) {
            addNotification('Loại tệp không hợp lệ. Chọn MP3, WAV, hoặc OGG.', 'error');
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            addNotification('Tệp quá lớn. Kích thước tối đa là 2MB.', 'error');
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataURL = reader.result as string;
            const tempAudio = new Audio(dataURL);

            tempAudio.onloadedmetadata = () => {
                const duration = tempAudio.duration;
                if (!isFinite(duration)) {
                    addNotification("Không thể xác định thời lượng âm thanh tùy chỉnh.", 'error', 5000);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }
                if (duration < 5) {
                    addNotification("Âm thanh quá ngắn (tối thiểu 5 giây). Vui lòng chọn âm thanh khác.", 'error', 5000);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }
                if (duration > 60) {
                    addNotification("Âm thanh quá dài (tối đa 60 giây). Vui lòng chọn âm thanh khác.", 'error', 5000);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                    return;
                }

                // All checks passed, proceed to update App state and notify success
                onSoundConfigChange({ url: CUSTOM_SOUND_URL_PLACEHOLDER, dataUrl: dataURL, fileName: file.name });
                addNotification(`Đã tải lên: ${file.name} (${duration.toFixed(1)}s). Âm thanh đã được chọn.`, 'success');
                if(fileInputRef.current) fileInputRef.current.value = ""; 
            };
            tempAudio.onerror = () => {
                addNotification('Lỗi khi tải siêu dữ liệu cho âm thanh tùy chỉnh. Tệp có thể bị hỏng.', 'error', 5000);
                if(fileInputRef.current) fileInputRef.current.value = "";
            };
            // tempAudio.load(); // Not always necessary if src is set, but can be explicit
        };
        reader.onerror = () => {
            addNotification('Lỗi đọc tệp âm thanh.', 'error');
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
        reader.readAsDataURL(file);
    } else {
        if(fileInputRef.current) fileInputRef.current.value = ""; // Reset if no file selected
    }
  };


  return (
    <div className="space-y-3 pt-3 border-t border-slate-700/50">
      <div>
        <label htmlFor="tickSoundSelect" className="block text-sm font-medium text-slate-300 mb-1 text-center">
          Âm thanh khi quay:
        </label>
        <div className="flex items-center space-x-2">
          <select
            id="tickSoundSelect"
            value={currentSoundUrl} 
            onChange={handleSelectChange}
            disabled={isSpinning}
            className="flex-grow p-2 text-sm border border-slate-600 rounded-md bg-slate-700 text-slate-200 focus:ring-1 focus:ring-pink-500 focus:border-pink-500 disabled:opacity-60 disabled:cursor-not-allowed custom-scrollbar"
            aria-label="Chọn âm thanh tick cho vòng quay"
          >
            {availableSounds.map(sound => (
              <option key={sound.url} value={sound.url}>
                {sound.name}
              </option>
            ))}
            {customSoundDataUrl && customSoundName && (
                <option value={CUSTOM_SOUND_URL_PLACEHOLDER}>
                    Tự chọn: {customSoundName.length > 20 ? customSoundName.substring(0,17) + '...' : customSoundName}
                </option>
            )}
          </select>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSpinning}
            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Tải lên âm thanh tùy chỉnh"
            title="Tải lên tùy chỉnh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/mpeg,audio/wav,audio/ogg"
            onChange={handleCustomFileChange}
            className="hidden"
            aria-hidden="true"
          />
          <button
            onClick={handleTestSoundToggle}
            disabled={isSpinning || (!currentSoundUrl && !customSoundDataUrl)}
            className="p-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isTestingSound ? "Tạm dừng nghe thử" : "Nghe thử âm thanh đã chọn"}
            title={isTestingSound ? "Tạm dừng" : "Nghe thử"}
          >
            {isTestingSound ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="tickVolumeSlider" className="block text-sm font-medium text-slate-300 mb-1 text-center">
          Âm lượng tick (<span className="font-bold text-blue-400">{Math.round(tickVolume * 100)}</span>%)
        </label>
        <div className="relative px-1 py-2">
          <input
            ref={volumeSliderRef}
            type="range"
            id="tickVolumeSlider"
            min="0"
            max="100"
            value={Math.round(tickVolume * 100)}
            onChange={handleVolumeSliderChange}
            onMouseEnter={() => setShowVolumeTooltip(true)}
            onMouseLeave={() => setShowVolumeTooltip(false)}
            disabled={isSpinning}
            className="w-full h-auto bg-transparent appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
            aria-label="Điều chỉnh âm lượng âm thanh tick"
          />
          <div 
            className={`slider-tooltip ${showVolumeTooltip ? 'visible' : ''}`}
            style={volumeTooltipStyle}
            aria-hidden="true"
          >
            {Math.round(tickVolume * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default TickSoundSelector;
