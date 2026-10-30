// Copper Lite Worker (works on any static host). Scramjet/Ultraviolet need the Node server (node/server.js).
window.COPPER_LITE = 'https://copperlite.zeoghost.workers.dev';

// Google Analytics 4 Measurement ID, e.g. 'G-ABC123XYZ'. Leave empty to turn analytics off completely.
window.COPPER_GA = '';

// Free TMDB API key (themoviedb.org/settings/api) for the movies page. Leave empty to show only the free classics.
window.COPPER_TMDB = '0c22ee2775077bb20cf5675d3c3795be';
// Where-to-watch links on the movies page: add a secret named WATCHMODE_KEY to the Lite Worker (never put the key in this file).
// Analytics counts every visit automatically (visitors can switch it off in settings > data).
// Set to true to count visits without cookies (less detail, friendlier to EU privacy rules).
window.COPPER_GA_COOKIELESS = false;
// Shown in settings > credit. Example: 'contact: you@example.com'
window.COPPER_CONTACT = '';
