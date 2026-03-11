import React from 'react';
import './VersionBadge.css';

const VERSION = 'v1.5.0-spa-routing'; // SPA Routing + Auto-Redirect

export default function VersionBadge() {
    return (
        <div className="version-badge">
            {VERSION}
        </div>
    );
}
