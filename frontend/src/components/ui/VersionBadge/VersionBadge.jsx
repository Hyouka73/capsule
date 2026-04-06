import React from 'react';
import './VersionBadge.css';

/* global __APP_VERSION__ */
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? (
    __APP_VERSION__.startsWith('v') ? __APP_VERSION__ : `v${__APP_VERSION__}`
) : 'v0.0.25-debug';

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {CURRENT_VERSION}
        </div>
    );
}
