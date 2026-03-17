import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.8.26-24hr-format';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
