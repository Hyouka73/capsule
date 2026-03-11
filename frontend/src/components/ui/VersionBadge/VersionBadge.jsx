import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.5.8-snapshot-ux';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
