// Copper Lite Worker (works on any static host). Scramjet/Ultraviolet need the Node server (node/server.js).
window.COPPER_LITE = 'https://copperlite.zeoghost.workers.dev';

// Google Analytics 4 Measurement ID, e.g. 'G-ABC123XYZ'. Leave empty to turn analytics off completely.
window.COPPER_GA = 'G-37P1LM9FVV';

// Your own movie API (the movies-api/ folder in this project). Set it to the deployed
// origin, e.g. 'https://movies-api.example.workers.dev', and the shelf, its rows, search
// and a single film all come from there — the TMDB key below only answers when it is down.
// Leave empty to use TMDB directly, as before.
window.COPPER_MOVIES_API = 'https://movies-api.gghh.workers.dev';

// Free TMDB API key (themoviedb.org/settings/api) for the movies page. Leave empty to show only the free classics.
window.COPPER_TMDB = '0c22ee2775077bb20cf5675d3c3795be';
// Analytics counts every visit automatically (visitors can switch it off in settings > data).
// Set to true to count visits without cookies (less detail, friendlier to EU privacy rules).
window.COPPER_GA_COOKIELESS = false;
// Shown in settings > credit. Example: 'contact: you@example.com'
window.COPPER_CONTACT = '';
// Chat (Supabase). Put your own values in config.local.js, not here:
// window.COPPER_SUPABASE = { url: 'https://YOUR-PROJECT.supabase.co', key: 'YOUR-ANON-OR-PUBLISHABLE-KEY' };
// (optional) emailDomain: 'members.copper-chat.app' is the default hidden login domain. Only change it together with the 'email_domain' row in bot_config, and before anyone signs up.
// Use the anon / publishable key only. NEVER the service_role / secret key.
