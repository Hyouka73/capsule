import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.2.5-geocoding-voyager';
// Storage Opt & LatLng Fix

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
