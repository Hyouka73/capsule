import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.6.7-permissions-fixed';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
