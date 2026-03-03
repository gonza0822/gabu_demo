'use client';

import React, { useState } from 'react';

export type ToggleSwitchProps = {
  on: boolean;
  onClick: () => void;
};

export default function ToggleSwitch({ on: isOn, onClick }: ToggleSwitchProps) {
  const [animatingTo, setAnimatingTo] = useState<boolean | null>(null);
  const displayOn = animatingTo !== null ? animatingTo : isOn;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (animatingTo !== null) return;
    const target = !isOn;
    setAnimatingTo(target);
    window.setTimeout(() => {
      onClick();
      setAnimatingTo(null);
    }, 300);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={handleClick}
      className="relative inline-flex items-center justify-center cursor-pointer select-none"
    >
      <div className="w-11 h-5 bg-gabu-100 rounded-full flex items-center p-1">
        <span
          className={`inline-block w-4 h-4 rounded-full transform transition-all duration-300 ease-out ${
            displayOn ? 'translate-x-5 bg-gabu-700' : 'translate-x-0 bg-gabu-500'
          }`}
        />
      </div>
    </button>
  );
}
