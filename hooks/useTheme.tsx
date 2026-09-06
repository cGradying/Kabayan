import { useEffect, useState } from 'react';
import { storage, ready } from '@/utils/MMKVConfig';

const DARK_MODE_KEY = 'app_dark_mode';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return storage.getBoolean(DARK_MODE_KEY) ?? false;
  });

  useEffect(() => {
    ready.then(() => {
      const stored = storage.getBoolean(DARK_MODE_KEY);
      if (stored !== undefined) setIsDarkMode(stored);
    });
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      storage.set(DARK_MODE_KEY, next);
      return next;
    });
  };

  const t = {
    isDarkMode,
    bgPage: isDarkMode ? 'bg-[#0B1120]' : 'bg-[#F6F8FB]',
    bgCard: isDarkMode ? 'bg-[#141C2E]' : 'bg-white',
    bgSurface: isDarkMode ? 'bg-[#1A2540]' : 'bg-[#F1F5F9]',

    text: isDarkMode ? 'text-[#F0F4FF]' : 'text-[#0F172A]',
    textMuted: isDarkMode ? 'text-[#64748B]' : 'text-[#94A3B8]',
    textSubtle: isDarkMode ? 'text-[#334155]' : 'text-[#CBD5E1]',

    brand: 'text-[#2563EB]',
    brandBg: 'bg-[#2563EB]',
    brandSoft: isDarkMode ? 'bg-[#1D3461]' : 'bg-[#EFF6FF]',
    brandBorder: isDarkMode ? 'border-[#1D3461]' : 'border-[#BFDBFE]',

    price: 'text-emerald-600',
    success: 'text-[#10B981]',
    successBg: isDarkMode ? 'bg-[#064E3B]' : 'bg-[#ECFDF5]',
    danger: 'text-[#EF4444]',
    dangerBg: isDarkMode ? 'bg-[#450A0A]' : 'bg-[#FEF2F2]',
    warning: 'text-[#F59E0B]',
    warningBg: isDarkMode ? 'bg-[#451A03]' : 'bg-[#FFFBEB]',

    border: isDarkMode ? 'border-[#1E293B]' : 'border-[#E2E8F0]',
    borderStrong: isDarkMode ? 'border-[#334155]' : 'border-[#CBD5E1]',

    icon: isDarkMode ? '#64748B' : '#94A3B8',
    accent: '#2563EB',
    accentWarm: '#E45C35',

    aiBannerBg: isDarkMode ? '#183B4E' : '#1a3a50',
    aiBannerAccent: '#E45C35',
    aiBannerRing: '#276176',
    bgOverlay: isDarkMode ? 'bg-[#0B1120]/90' : 'bg-white/90',
  };

  return { t, toggleTheme };
};
