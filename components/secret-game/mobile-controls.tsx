"use client";

interface MobileControlsProps {
  onMoveLeft: (active: boolean) => void;
  onMoveRight: (active: boolean) => void;
  onShoot: (active: boolean) => void;
  onPowerUp: () => void;
  powerUps: number;
}

export function MobileControls({ onMoveLeft, onMoveRight, onShoot, onPowerUp, powerUps }: MobileControlsProps) {
  const handleTouch = (
    setter: (active: boolean) => void,
    e: React.TouchEvent | React.MouseEvent
  ) => {
    e.preventDefault();
    setter(true);
  };

  const handleRelease = (
    setter: (active: boolean) => void,
    e: React.TouchEvent | React.MouseEvent
  ) => {
    e.preventDefault();
    setter(false);
  };

  const handlePowerUp = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    onPowerUp();
  };

  const btnClass =
    "w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white text-3xl select-none touch-none active:bg-white/20 transition-colors backdrop-blur-sm";

  return (
    <div className="absolute bottom-6 left-0 right-0 z-30 flex items-end justify-between px-6 pointer-events-none">
      {/* D-pad */}
      <div className="flex gap-4 pointer-events-auto">
        <button
          className={btnClass}
          onTouchStart={(e) => handleTouch(onMoveLeft, e)}
          onTouchEnd={(e) => handleRelease(onMoveLeft, e)}
          onMouseDown={(e) => handleTouch(onMoveLeft, e)}
          onMouseUp={(e) => handleRelease(onMoveLeft, e)}
          onMouseLeave={(e) => handleRelease(onMoveLeft, e)}
          aria-label="Move left"
        >
          ←
        </button>
        <button
          className={btnClass}
          onTouchStart={(e) => handleTouch(onMoveRight, e)}
          onTouchEnd={(e) => handleRelease(onMoveRight, e)}
          onMouseDown={(e) => handleTouch(onMoveRight, e)}
          onMouseUp={(e) => handleRelease(onMoveRight, e)}
          onMouseLeave={(e) => handleRelease(onMoveRight, e)}
          aria-label="Move right"
        >
          →
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-end gap-3 pointer-events-auto">
        {/* Power-up */}
        <button
          className={`${btnClass} w-18 h-18 md:w-20 md:h-20 text-2xl ${
            powerUps > 0
              ? "bg-[#00f0ff]/20 border-[#00f0ff]/40 active:bg-[#00f0ff]/40"
              : "opacity-40"
          }`}
          onTouchStart={handlePowerUp}
          onMouseDown={handlePowerUp}
          aria-label="Power up"
          disabled={powerUps <= 0}
        >
          <span className="relative">
            ⚡
            {powerUps > 0 && (
              <span className="absolute -top-1 -right-2 text-[10px] font-bold text-[#00f0ff] bg-black/80 rounded-full w-4 h-4 flex items-center justify-center">
                {powerUps}
              </span>
            )}
          </span>
        </button>

        {/* Shoot */}
        <button
          className={`${btnClass} w-24 h-24 md:w-28 md:h-28 bg-[#ff006e]/20 border-[#ff006e]/40 active:bg-[#ff006e]/40 text-4xl`}
          onTouchStart={(e) => handleTouch(onShoot, e)}
          onTouchEnd={(e) => handleRelease(onShoot, e)}
          onMouseDown={(e) => handleTouch(onShoot, e)}
          onMouseUp={(e) => handleRelease(onShoot, e)}
          onMouseLeave={(e) => handleRelease(onShoot, e)}
          aria-label="Shoot"
        >
          🔥
        </button>
      </div>
    </div>
  );
}
