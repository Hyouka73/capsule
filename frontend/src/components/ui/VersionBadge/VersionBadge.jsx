import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.5.6-sw-fix';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
