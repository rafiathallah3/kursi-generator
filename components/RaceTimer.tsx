'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface RaceTimerProps {
  timeRemaining: number | null;
  totalDurationSeconds: number | null;
  racingAspraks: string[];
  winnerIndex: number | null;
}

export default function RaceTimer({
  timeRemaining,
  totalDurationSeconds,
  racingAspraks,
  winnerIndex,
}: RaceTimerProps) {

  const [packPositions, setPackPositions] = useState<number[]>([]);
  const [endgameStartPositions, setEndgameStartPositions] = useState<number[]>([]);
  const [finalOffsets, setFinalOffsets] = useState<number[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const ENDGAME_SECONDS = 15;
  const isEndgame = timeRemaining !== null && timeRemaining <= ENDGAME_SECONDS;

  useEffect(() => {
    if (racingAspraks.length > 0) {
      setPackPositions(racingAspraks.map(() => 0.15 + Math.random() * 0.5));
      setFinalOffsets(racingAspraks.map(() => 0.2 + Math.random() * 0.6));
    }
  }, [racingAspraks]);

  useEffect(() => {
    if (racingAspraks.length === 0 || isEndgame) return;

    const interval = setInterval(() => {
      setPackPositions(racingAspraks.map(() => 0.15 + Math.random() * 0.5));
    }, 60000);

    return () => clearInterval(interval);
  }, [isEndgame, racingAspraks.length]);

  useEffect(() => {
    if (isEndgame && endgameStartPositions.length === 0 && packPositions.length > 0) {
      setEndgameStartPositions(packPositions);
    }
  }, [isEndgame, packPositions, endgameStartPositions.length]);

  if (racingAspraks.length === 0 || timeRemaining === null || totalDurationSeconds === null) {
    return null;
  }

  const customCSS = `
    @keyframes walkingWobble {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25% { transform: translateY(-4px) rotate(3deg); }
      50% { transform: translateY(0px) rotate(0deg); }
      75% { transform: translateY(-2px) rotate(-3deg); }
    }
    @keyframes moveClouds {
      0% { left: 110%; }
      100% { left: -30%; }
    }
  `;

  return (
    <div className="w-full h-48 md:h-64 relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm my-2 select-none group">
      <style>{customCSS}</style>

      <div className="absolute inset-0 bg-gradient-to-b from-blue-400 to-[#E0F6FF] dark:from-sky-900 dark:to-zinc-900" />

      <div className="absolute top-4 right-10 w-12 h-12 bg-yellow-300 dark:bg-zinc-200 rounded-full shadow-[0_0_20px_rgba(253,224,71,0.6)] dark:shadow-[0_0_20px_rgba(228,228,231,0.2)]"></div>

      <div className="absolute top-4 w-24 h-8 bg-white/90 dark:bg-white/20 rounded-full blur-[1px] shadow-sm" style={{ animation: 'moveClouds 30s linear infinite', left: '-20%' }}></div>
      <div className="absolute top-12 w-32 h-10 bg-white/80 dark:bg-white/10 rounded-full blur-[1px] shadow-sm" style={{ animation: 'moveClouds 45s linear infinite 5s', left: '-30%' }}></div>
      <div className="absolute top-2 w-16 h-6 bg-white/70 dark:bg-white/10 rounded-full blur-[2px]" style={{ animation: 'moveClouds 25s linear infinite 15s', left: '-10%' }}></div>
      <div className="absolute top-20 w-40 h-12 bg-white/90 dark:bg-white/20 rounded-full blur-[1px] shadow-sm" style={{ animation: 'moveClouds 50s linear infinite 2s', left: '-40%' }}></div>
      <div className="absolute top-8 w-20 h-6 bg-white/60 dark:bg-white/20 rounded-full blur-[2px]" style={{ animation: 'moveClouds 35s linear infinite 25s', left: '-20%' }}></div>

      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#228B22] to-[#32CD32] dark:from-[#0f3b18] dark:to-[#1b5e20] shadow-[inset_0_5px_15px_rgba(0,0,0,0.1)]"></div>

      <div
        className="absolute right-[2%] md:right-[5%] top-[50%] bottom-0 w-4 flex flex-col transition-all duration-[3000ms]"
        style={{
          opacity: isEndgame ? 1 : 0,
          transform: `translateX(${isEndgame ? '0' : '50px'})`
        }}
      >
        <div className="h-full w-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.7),rgba(255,255,255,0.7)_5px,rgba(0,0,0,0.7)_5px,rgba(0,0,0,0.7)_10px)] opacity-50 block md:opacity-100 border-x border-black/10"></div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full">
        {racingAspraks.map((name, idx) => {
          let currentPosPercent = 0;
          const isWinner = winnerIndex === idx;

          if (!isEndgame) {
            currentPosPercent = (packPositions[idx] || 0.4) * 100;
          } else {
            const endgameProgress = Math.min(1, Math.max(0, (ENDGAME_SECONDS - timeRemaining) / ENDGAME_SECONDS));
            const easeSprint = Math.pow(endgameProgress, 2);

            const startPos = endgameStartPositions[idx] || (packPositions[idx] || 0.4);
            const targetPos = isWinner ? 0.96 : (finalOffsets[idx] || 0.5);

            let pos = startPos + (targetPos - startPos) * easeSprint;
            if (pos > 0.96 && isWinner) pos = 0.96;

            currentPosPercent = pos * 100;
          }

          if (timeRemaining <= 0 && isWinner) currentPosPercent = 95;

          const zIndex = racingAspraks.length - idx;
          const charImage = `/char${idx + 1}.png`;

          const bottomRange = 50;
          const laneHeight = racingAspraks.length > 1 ? bottomRange / (racingAspraks.length - 1) : 0;
          const bottomPercent = 2 + ((racingAspraks.length - 1 - idx) * laneHeight);

          const animationPlayState = timeRemaining > 0 ? "running" : "paused";

          return (
            <div
              key={idx}
              className={`absolute flex flex-col items-center justify-end transition-all ease-linear`}
              style={{
                left: `${currentPosPercent}%`,
                bottom: `${bottomPercent}%`,
                transform: 'translateX(-50%)',
                zIndex: zIndex,
                transitionDuration: !isEndgame ? '10000ms' : '1000ms'
              }}
            >
              <div
                className="flex flex-col items-center"
                style={{
                  animation: `walkingWobble ${0.4 + (idx * 0.1)}s infinite alternate ease-in-out`,
                  animationPlayState: animationPlayState
                }}
              >
                <div className="bg-black/50 text-white text-[9px] md:text-xs px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap mb-1 backdrop-blur-sm truncate max-w-[80px]">
                  {name}
                </div>
                <div className="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center relative">
                  {!imageErrors[idx] ? (
                    <img
                      src={charImage}
                      alt={name}
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                      onError={() => setImageErrors(prev => ({ ...prev, [idx]: true }))}
                    />
                  ) : (
                    <div className="w-full h-full bg-red-400 rounded-lg shadow-sm border-2 border-white flex items-center justify-center text-xl font-bold text-white uppercase drop-shadow-md">
                      {name.substring(0, 1)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
