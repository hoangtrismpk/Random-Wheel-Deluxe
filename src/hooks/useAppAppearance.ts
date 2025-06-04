import { useState, useEffect, useCallback, RefObject } from 'react';
import type { AppGlobalBackground } from '../types';
import { useNotification } from '../components/NotificationContext';

const DEFAULT_TITLE_TEXT_HOOK = "Vòng Quay May Mắn\nPhiên Bản Đặc Biệt"; // Re-define or import

export const useAppAppearance = (appContainerRef: RefObject<HTMLDivElement>) => {
  const [appGlobalBackground, setAppGlobalBackground] = useState<AppGlobalBackground>(null);
  const [titleText, setTitleText] = useState<string>(DEFAULT_TITLE_TEXT_HOOK);
  const [titleColorConfig, setTitleColorConfig] = useState<AppGlobalBackground>(null);
  const { addNotification } = useNotification();

  const handleAppGlobalBackgroundChange = useCallback((newBackground: AppGlobalBackground) => {
    setAppGlobalBackground(newBackground);
    if (newBackground) {
      addNotification("Đã cập nhật màu nền ứng dụng.", 'success');
    } else {
      addNotification("Đã khôi phục màu nền ứng dụng mặc định.", 'info');
    }
  }, [addNotification]);

  const handleTitleTextChange = useCallback((newText: string) => {
    setTitleText(newText);
    if (newText === DEFAULT_TITLE_TEXT_HOOK) {
      addNotification("Đã khôi phục nội dung tiêu đề mặc định.", "info");
    } else {
      addNotification("Đã cập nhật nội dung tiêu đề.", "success");
    }
  }, [addNotification]);

  const handleTitleColorChange = useCallback((newColorConfig: AppGlobalBackground) => {
    setTitleColorConfig(newColorConfig);
    if (newColorConfig === null) {
      addNotification("Đã khôi phục màu tiêu đề mặc định.", "info");
    } else {
      addNotification("Đã cập nhật màu tiêu đề.", "success");
    }
  }, [addNotification]);

  useEffect(() => {
    if (appContainerRef.current) {
      const container = appContainerRef.current;
      const baseClasses = "min-h-screen text-slate-100 flex flex-col items-center p-4 space-y-6";
      const defaultBgClasses = ['bg-gradient-to-br', 'from-slate-900', 'via-purple-900', 'to-slate-900'];
      
      // Remove any existing dynamic background styles
      container.className.split(' ').forEach(cls => {
        if (defaultBgClasses.includes(cls)) container.classList.remove(cls);
      });
      container.style.background = '';

      if (appGlobalBackground === null) {
        container.classList.add(...defaultBgClasses);
        container.className = `${baseClasses} ${defaultBgClasses.join(' ')}`;
      } else if (typeof appGlobalBackground === 'string') {
        container.style.background = appGlobalBackground;
         container.className = baseClasses;
      } else if (appGlobalBackground.type === 'linear-gradient') {
        const stopsString = appGlobalBackground.stops
          .sort((a, b) => a.position - b.position)
          .map(stop => `${stop.color} ${stop.position}%`)
          .join(', ');
        container.style.background = `linear-gradient(${appGlobalBackground.angle}deg, ${stopsString})`;
        container.className = baseClasses;
      } else if (appGlobalBackground.type === 'radial-gradient') {
        const stopsString = appGlobalBackground.stops
          .sort((a, b) => a.position - b.position)
          .map(stop => `${stop.color} ${stop.position}%`)
          .join(', ');
        const shape = appGlobalBackground.shape || 'circle';
        const position = appGlobalBackground.position || 'center';
        container.style.background = `radial-gradient(${shape} at ${position}, ${stopsString})`;
        container.className = baseClasses;
      }
    }
  }, [appGlobalBackground, appContainerRef]);

  return {
    appGlobalBackground, setAppGlobalBackground,
    titleText, setTitleText,
    titleColorConfig, setTitleColorConfig,
    handleAppGlobalBackgroundChange,
    handleTitleTextChange,
    handleTitleColorChange,
    DEFAULT_TITLE_TEXT_HOOK
  };
};
