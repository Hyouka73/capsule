import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.6.16-wrapped-logic-fix';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
