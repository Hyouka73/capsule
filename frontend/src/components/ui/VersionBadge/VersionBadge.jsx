import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.2.7-cyber-mint-auto';
// Storage Opt & LatLng Fix

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
