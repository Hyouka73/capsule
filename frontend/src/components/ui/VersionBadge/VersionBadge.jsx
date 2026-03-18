import React from 'react';
import './VersionBadge.css';

const APP_VERSION = 'v0.0.15';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {APP_VERSION}
        </div>
    );
}
