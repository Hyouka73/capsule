import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.3.3';
const RELEASE_DATE = 'Mar 9, 2026';
// Final Map Polish & Storage Standards

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
