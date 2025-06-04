import { useState, useCallback } from 'react';
import type { WheelDynamicBackground } from '../types';
import { useNotification } from '../components/NotificationContext';

const DEFAULT_WHEEL_TEXT_COLOR_HOOK = "#1F2937"; // Re-define or import if accessible

export const useWheelCustomization = () => {
  const [centerImageSrc, setCenterImageSrc] = useState<string | null>(null);
  const [wheelBackgroundImageSrc, setWheelBackgroundImageSrc] = useState<string | null>(null);
  const [wheelDynamicBackground, setWheelDynamicBackground] = useState<WheelDynamicBackground>(null);
  const [wheelTextColor, setWheelTextColor] = useState<string>(DEFAULT_WHEEL_TEXT_COLOR_HOOK);
  const { addNotification } = useNotification();

  const handleImageSelectedForWheel = useCallback((src: string, purpose: 'centerLogo' | 'wheelBackground' | null) => {
    if (purpose === 'centerLogo') {
      setCenterImageSrc(src);
      addNotification("Đã cập nhật logo trung tâm.", 'success');
    } else if (purpose === 'wheelBackground') {
      setWheelBackgroundImageSrc(src);
      addNotification("Đã cập nhật ảnh nền vòng quay.", 'success');
    }
  }, [addNotification]);

  const handleRemoveLogo = useCallback(() => {
    setCenterImageSrc(null);
    addNotification("Đã xóa logo trung tâm.", 'info');
  }, [addNotification]);

  const handleRemoveWheelBackground = useCallback(() => {
    setWheelBackgroundImageSrc(null);
    addNotification("Đã xóa ảnh nền vòng quay.", 'info');
  }, [addNotification]);

  const handleWheelDynamicBackgroundChange = useCallback((newBackground: WheelDynamicBackground) => {
    setWheelDynamicBackground(newBackground);
    if (newBackground) {
      addNotification("Đã cập nhật màu nền vòng quay.", 'success');
    } else {
      addNotification("Đã xóa màu nền tùy chỉnh của vòng quay.", 'info');
    }
  }, [addNotification]);

  const handleWheelTextColorChange = useCallback((newColor: string) => {
    setWheelTextColor(newColor);
    if (newColor === DEFAULT_WHEEL_TEXT_COLOR_HOOK) {
      addNotification("Đã đặt lại màu chữ vòng quay về mặc định.", 'info');
    } else {
      addNotification("Đã cập nhật màu chữ vòng quay.", 'success');
    }
  }, [addNotification]);

  return {
    centerImageSrc, setCenterImageSrc, // Expose setter for direct use if needed (e.g. initial load)
    wheelBackgroundImageSrc, setWheelBackgroundImageSrc,
    wheelDynamicBackground, setWheelDynamicBackground,
    wheelTextColor, setWheelTextColor,
    handleImageSelectedForWheel,
    handleRemoveLogo,
    handleRemoveWheelBackground,
    handleWheelDynamicBackgroundChange,
    handleWheelTextColorChange,
    DEFAULT_WHEEL_TEXT_COLOR_HOOK
  };
};
