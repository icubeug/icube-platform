import { useState, useEffect } from 'react';

export type Device = 'mobile' | 'tablet' | 'desktop';

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>('desktop');

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 768)  setDevice('mobile');
      else if (w < 1280) setDevice('tablet');
      else          setDevice('desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return device;
}
