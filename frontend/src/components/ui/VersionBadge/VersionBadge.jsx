import React from 'react';
import './VersionBadge.css';

/* global __APP_VERSION__, __BUILD_HASH__ */
const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.3';
const HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev';
const CURRENT_VERSION = `v${VERSION}.${HASH}`;

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {CURRENT_VERSION}
        </div>
    );
}
