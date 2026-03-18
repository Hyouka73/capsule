import React from 'react';

/**
 * High-fidelity Tulip SVG Icon
 * Designed to look premium with subtle gradients and organic shapes.
 */
const TulipIcon = ({ size = 24 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <linearGradient id="tulipGradient" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF8FAB" />
                <stop offset="100%" stopColor="#FFB7B2" />
            </linearGradient>
            <filter id="tulipShadow" x="0" y="0" width="100%" height="100%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" />
            </filter>
        </defs>

        {/* Main Petal (Center) */}
        <path
            d="M16 28C16 28 8 26 8 14C8 6 16 4 16 4C16 4 24 6 24 14C24 26 16 28 16 28Z"
            fill="url(#tulipGradient)"
            filter="url(#tulipShadow)"
        />

        {/* Left Petal Overlay */}
        <path
            d="M16 28C10 26 7 20 7 14C7 8 11 6 12 5C10 8 10 12 11 16C12 20 16 24 16 28"
            fill="rgba(255, 255, 255, 0.3)"
        />

        {/* Right Petal Overlay */}
        <path
            d="M16 28C22 26 25 20 25 14C25 8 21 6 20 5C22 8 22 12 21 16C20 20 16 24 16 28"
            fill="rgba(255, 255, 255, 0.2)"
        />

        {/* Top Detail */}
        <path
            d="M13 5.5C14.5 4 17.5 4 19 5.5"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.6"
        />
    </svg>
);

export default TulipIcon;
