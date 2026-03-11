import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.4.8-super-mega-update'; // Map Filter (Only visited places)

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
