import React from 'react';

const base = {
    width: "56",
    height: "56",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
};

export const CouponIcons = {

    // 🍿 Noche de películas → palomitas
    movie: (props) => (
        <svg {...base} {...props}>
            <path d="M8 10h8l-1.5 9h-5L8 10z"></path>
            <line x1="12" y1="10" x2="12" y2="19"></line>
            <line x1="10" y1="10" x2="9.5" y2="19"></line>
            <line x1="14" y1="10" x2="14.5" y2="19"></line>
            <circle cx="9" cy="7" r="2"></circle>
            <circle cx="12" cy="6" r="2"></circle>
            <circle cx="15" cy="7" r="2"></circle>
        </svg>
    ),

    // 🍕 Pizza night → rebanada de pizza
    pizza: (props) => (
        <svg {...base} {...props}>
            <path d="M12 2L3 20h18L12 2z"></path>
            <path d="M5.5 16.5q6.5 3 13 0"></path>
            <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none"></circle>
            <circle cx="9.5" cy="16" r="1" fill="currentColor" stroke="none"></circle>
            <circle cx="14.5" cy="16" r="1" fill="currentColor" stroke="none"></circle>
        </svg>
    ),

    // 🤲 Masaje → dos manos
    massage: (props) => (
        <svg {...base} {...props}>
            <path d="M7 14V9.5a1.5 1.5 0 0 1 3 0V13"></path>
            <path d="M10 13V8.5a1.5 1.5 0 0 1 3 0V13"></path>
            <path d="M13 13V9.5a1.5 1.5 0 0 1 3 0V14"></path>
            <path d="M7 14c0 3 1.5 5 5 6"></path>
            <path d="M16 14c0 3-1.5 5-5 6"></path>
            <path d="M7 9.5c0-1 .5-2.5 2-3"></path>
        </svg>
    ),

    // ☕ Desayuno en cama → taza humeante con corazón
    breakfast: (props) => (
        <svg {...base} {...props}>
            <path d="M4 13h12v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4z"></path>
            <path d="M16 14h1a2 2 0 0 1 0 4h-1"></path>
            <path d="M8 10c0-1.5 2-1.5 2-3"></path>
            <path d="M12 10c0-1.5 2-1.5 2-3"></path>
            <path d="M9 16.5c.4.5 1 .8 1.5.5.5.3 1.1 0 1.5-.5"></path>
        </svg>
    ),

    // 🛁 Baño de burbujas → tina con burbujas
    bath: (props) => (
        <svg {...base} {...props}>
            <path d="M5 17h14l-1 3H6l-1-3z"></path>
            <path d="M3 13h18v4H3z" rx="1"></path>
            <line x1="7" y1="20" x2="7" y2="22"></line>
            <line x1="17" y1="20" x2="17" y2="22"></line>
            <circle cx="8" cy="9" r="1.5"></circle>
            <circle cx="13" cy="8" r="2"></circle>
            <circle cx="18" cy="9" r="1"></circle>
            <circle cx="11" cy="6" r="1"></circle>
        </svg>
    ),

    // 🧳 Escapada → maleta
    travel: (props) => (
        <svg {...base} {...props}>
            <rect x="3" y="9" width="18" height="12" rx="2"></rect>
            <path d="M8 9V7a4 4 0 0 1 8 0v2"></path>
            <line x1="3" y1="15" x2="21" y2="15"></line>
            <line x1="12" y1="12" x2="12" y2="18"></line>
            <circle cx="8" cy="21" r="0.8" fill="currentColor" stroke="none"></circle>
            <circle cx="16" cy="21" r="0.8" fill="currentColor" stroke="none"></circle>
        </svg>
    ),

    // 🍷 Noche romántica → dos copas de vino con corazón
    romantic: (props) => (
        <svg {...base} {...props}>
            <path d="M5 3h4l1.5 7H3.5L5 3z"></path>
            <line x1="7" y1="10" x2="7" y2="16"></line>
            <line x1="5" y1="20" x2="9" y2="20"></line>
            <path d="M15 3h4l1.5 7h-7L15 3z"></path>
            <line x1="17" y1="10" x2="17" y2="16"></line>
            <line x1="15" y1="20" x2="19" y2="20"></line>
            <path d="M12 8c0-1 .7-1.5 1.2-.8.5-.7 1.3-.7 1.3.3 0 .8-1.3 1.8-1.5 2.2-.2-.4-1.5-1.4-1.5-2.2 0-1 .8-1 1.2-.3A1 1 0 0 0 12 8z" fill="currentColor" stroke="none"></path>
        </svg>
    ),

    // 🥒 Spa → cara relajada con pepinos
    spa: (props) => (
        <svg {...base} {...props}>
            <circle cx="12" cy="14" r="6"></circle>
            <ellipse cx="9.5" cy="12" rx="2" ry="1.2"></ellipse>
            <ellipse cx="14.5" cy="12" rx="2" ry="1.2"></ellipse>
            <line x1="9.5" y1="10.8" x2="9.5" y2="13.2"></line>
            <line x1="14.5" y1="10.8" x2="14.5" y2="13.2"></line>
            <path d="M10 16.5c.5.7 3.5.7 4 0"></path>
            <path d="M12 8C12 6 14 4 16 4c0 2-1.5 3.5-4 4z" fill="currentColor" stroke="none"></path>
        </svg>
    ),

    // 🎂 Postre → pastel con velita
    dessert: (props) => (
        <svg {...base} {...props}>
            <rect x="3" y="13" width="18" height="8" rx="2"></rect>
            <path d="M3 16h18"></path>
            <path d="M3 13c2-2 4 0 6-2s4 0 6-2 4 0 6 2H3z" fill="currentColor" stroke="none"></path>
            <line x1="12" y1="13" x2="12" y2="8"></line>
            <path d="M12 8c0-2 1.5-2 1.5-4C13.5 2.5 12 3 12 4c0-1-1.5-.5-1.5 1C10.5 6.5 12 6 12 8z" fill="currentColor" stroke="none"></path>
        </svg>
    ),

    // 🧺 Picnic → manta a cuadros con canasta
    picnic: (props) => (
        <svg {...base} {...props}>
            <rect x="2" y="12" width="20" height="8" rx="1"></rect>
            <line x1="2" y1="16" x2="22" y2="16"></line>
            <line x1="9" y1="12" x2="9" y2="20"></line>
            <line x1="15" y1="12" x2="15" y2="20"></line>
            <path d="M7 12V9a5 5 0 0 1 10 0v3"></path>
            <path d="M7 9.5c2.5-1 7.5-1 10 0"></path>
            <line x1="12" y1="6" x2="12" y2="9"></line>
        </svg>
    ),

    // ☕ Café
    coffee: (props) => (
        <svg {...base} {...props}>
            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"></path>
            <path d="M7 3c0 1 .5 1.5 1 2s1 1 1 2"></path>
            <path d="M11 3c0 1 .5 1.5 1 2s1 1 1 2"></path>
        </svg>
    ),

    // 🎁 Regalo
    gift: (props) => (
        <svg {...base} {...props}>
            <rect x="3" y="9" width="18" height="12" rx="2"></rect>
            <path d="M3 13h18"></path>
            <path d="M12 9v12"></path>
            <path d="M12 9c0-2 1.5-4 3-4a2 2 0 0 1 0 4H9a2 2 0 0 1 0-4c1.5 0 3 2 3 4z"></path>
        </svg>
    ),

    // 🎮 Gaming
    gaming: (props) => (
        <svg {...base} {...props}>
            <rect x="2" y="7" width="20" height="12" rx="4"></rect>
            <path d="M7 13h4"></path>
            <path d="M9 11v4"></path>
            <circle cx="15" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="17" cy="14" r="1" fill="currentColor"></circle>
        </svg>
    ),

    // 🎵 Canción dedicada
    music: (props) => (
        <svg {...base} {...props}>
            <circle cx="8" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
            <path d="M11 18V6l10-2v12"></path>
        </svg>
    ),

    // 📚 Lectura
    reading: (props) => (
        <svg {...base} {...props}>
            <path d="M2 4h8a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H2V4z"></path>
            <path d="M22 4h-8a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h8V4z"></path>
            <path d="M6 8h4"></path>
            <path d="M6 12h4"></path>
            <path d="M14 8h4"></path>
            <path d="M14 12h4"></path>
        </svg>
    ),

    // ⭐ Sorpresa libre
    surprise: (props) => (
        <svg {...base} {...props}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
    ),
};
