import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.8.3-import-date-fix';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
