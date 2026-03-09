import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.2.3-mapcn-white';
// Storage Opt & LatLng Fix

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
