import React from 'react';
import { Waypoint } from '../types';

interface GolfFairwayVisualProps {
  waypoints: Waypoint[];
  currentBallT?: number;
  onOpenAction?: (wp: Waypoint) => void;
  onSelectWaypoint?: (wp: Waypoint) => void;
}

export const GolfFairwayVisual: React.FC<GolfFairwayVisualProps> = ({
  waypoints,
  onOpenAction,
  onSelectWaypoint,
}) => {
  // Find payment / blocked waypoint
  const paymentWp = waypoints.find((w) => w.status === 'blocked-on-you') || waypoints[2];

  // Fairway ribbon smooth path coordinates matching IMG_3932.png
  const ribbonPath =
    'M 168 40 C 168 70 218 85 218 120 C 218 160 140 175 134 215 C 128 250 120 275 134 310 C 154 345 218 355 212 390 C 206 425 168 435 168 448';

  return (
    <div className="relative w-full overflow-hidden select-none bg-[#F4F1EA] py-1 flex justify-center">
      <div className="relative w-[340px] h-[480px] shrink-0">
        {/* SVG background track: Fairway ribbon, Start dot, Terracotta dot, Finish flag */}
        <svg
          id="fairway-svg"
          viewBox="0 0 340 480"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {/* Fairway Ribbon Track */}
          <path
            d={ribbonPath}
            fill="none"
            stroke="#DDD6C6"
            strokeWidth="38"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Start Point Label & Dot */}
          <text
            x="168"
            y="23"
            textAnchor="middle"
            className="text-[11px] fill-[#7E7971] font-sans font-normal select-none"
          >
            Start
          </text>
          <circle cx="168" cy="40" r="4.5" fill="#1F1E1B" />

          {/* Terracotta dot on fairway at Payment milestone */}
          <circle
            cx="124"
            cy="274"
            r="5"
            fill="#BA593E"
            stroke="#F4F1EA"
            strokeWidth="2"
          />

          {/* FINISH: Flag & Text */}
          <g>
            {/* Flagstick */}
            <line
              x1="168"
              y1="448"
              x2="168"
              y2="416"
              stroke="#1F1E1B"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Terracotta triangular flag waving right */}
            <polygon
              points="168,418 182,426 168,434"
              fill="#BA593E"
            />
            {/* Finish label */}
            <text
              x="168"
              y="466"
              textAnchor="middle"
              className="text-[11px] fill-[#7E7971] font-sans font-normal select-none"
            >
              Finish
            </text>
          </g>
        </svg>

        {/* CALLOUT 1: Hardware install done — Jul 18 (Right Side) */}
        <div
          id="callout-hardware-install"
          className="absolute left-[174px] top-[74px] bg-[#1D1D1F] text-white rounded-[7px] px-3 py-1.5 shadow-sm cursor-pointer hover:bg-black transition-transform hover:scale-[1.02] z-10 select-none text-left"
          onClick={() => {
            const wp = waypoints.find((w) => w.id === 'wp-1');
            if (wp && onSelectWaypoint) onSelectWaypoint(wp);
          }}
        >
          <div className="text-[12px] font-medium leading-[15px] tracking-tight whitespace-nowrap">
            Hardware install done
          </div>
          <div className="text-[12px] font-medium leading-[15px] tracking-tight text-white/95 whitespace-nowrap mt-0.5">
            — Jul 18
          </div>
          {/* Beak tail on bottom-left pointing down-left towards the fairway */}
          <svg
            className="absolute -bottom-[7px] left-3 w-3 h-2"
            viewBox="0 0 12 8"
            fill="none"
          >
            <polygon points="2,0 12,0 0,8" fill="#1D1D1F" />
          </svg>
        </div>

        {/* CALLOUT 2: Integration testing — Aug 5 (Left Side) */}
        <div
          id="callout-integration-testing"
          className="absolute left-[20px] top-[168px] bg-[#1D1D1F] text-white rounded-[7px] px-3 py-1.5 shadow-sm cursor-pointer hover:bg-black transition-transform hover:scale-[1.02] z-10 select-none text-left"
          onClick={() => {
            const wp = waypoints.find((w) => w.id === 'wp-2');
            if (wp && onSelectWaypoint) onSelectWaypoint(wp);
          }}
        >
          <div className="text-[12px] font-medium leading-[15px] tracking-tight whitespace-nowrap">
            Integration testing —
          </div>
          <div className="text-[12px] font-medium leading-[15px] tracking-tight text-white/95 whitespace-nowrap mt-0.5">
            Aug 5
          </div>
          {/* Beak tail on bottom-right pointing down-right towards fairway */}
          <svg
            className="absolute -bottom-[7px] right-4 w-3 h-2"
            viewBox="0 0 12 8"
            fill="none"
          >
            <polygon points="0,0 10,0 12,8" fill="#1D1D1F" />
          </svg>
        </div>

        {/* CALLOUT 3: Payment due — Aug 30 before we proceed (Left Side / Terracotta) */}
        <div
          id="callout-payment-due"
          className="absolute left-[20px] top-[244px] bg-[#BA593E] text-white rounded-[7px] px-3 py-1.5 shadow-sm cursor-pointer hover:bg-[#A84F36] transition-all hover:scale-[1.02] z-10 select-none text-left"
          onClick={() => {
            if (paymentWp && onOpenAction) onOpenAction(paymentWp);
            else if (paymentWp && onSelectWaypoint) onSelectWaypoint(paymentWp);
          }}
        >
          <div className="text-[12px] font-medium leading-[15px] tracking-tight whitespace-nowrap">
            Payment due — Aug 30
          </div>
          <div className="text-[12px] font-medium leading-[15px] tracking-tight text-white/95 whitespace-nowrap mt-0.5">
            before we proceed
          </div>
          {/* Beak tail on bottom pointing directly to the terracotta fairway dot */}
          <svg
            className="absolute -bottom-[7px] right-[40px] w-3 h-2"
            viewBox="0 0 12 8"
            fill="none"
          >
            <polygon points="0,0 10,0 12,8" fill="#BA593E" />
          </svg>
        </div>

        {/* CALLOUT 4: Final sign-off — Sep 25 (Right Side) */}
        <div
          id="callout-final-signoff"
          className="absolute left-[174px] top-[346px] bg-[#1D1D1F] text-white rounded-[7px] px-3.5 py-1.5 shadow-sm cursor-pointer hover:bg-black transition-transform hover:scale-[1.02] z-10 select-none text-left"
          onClick={() => {
            const wp = waypoints.find((w) => w.id === 'wp-4');
            if (wp && onSelectWaypoint) onSelectWaypoint(wp);
          }}
        >
          <div className="text-[12px] font-medium leading-[15px] tracking-tight whitespace-nowrap">
            Final sign-off — Sep 25
          </div>
          {/* Beak tail on bottom-left pointing down-left towards the fairway */}
          <svg
            className="absolute -bottom-[7px] left-3 w-3 h-2"
            viewBox="0 0 12 8"
            fill="none"
          >
            <polygon points="2,0 12,0 0,8" fill="#1D1D1F" />
          </svg>
        </div>
      </div>
    </div>
  );
};
