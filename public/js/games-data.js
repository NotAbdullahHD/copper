/* copper game library: one file, curated by hand.
   [title, folder in ShadowDevLabs/files (or a full url), category, hue, tag, keywords, icon file]
   Pages come from githack's cached host, icons from jsDelivr. The icon name is the file that folder
   actually ships (logo.png, splash.png, <name>.png, …), checked one by one, so cards show real artwork
   and only fall back to initials where a folder has no image at all. */
const GAMES=[
/* the viral hits students actually search for */
["1v1.LOL", "1v1lol", "action", 30, "hot", "shooter build battle royale", "logo.png"],
["Drive Mad", "drive-mad", "racing", 24, "hot", "monster truck physics", "logo.jpg"],
["Drift Hunters", "drift-hunters", "racing", 200, "hot", "car drift tuning 3d", "drift-hunters.png"],
["Drift Boss", "drift-boss", "racing", 280, "hot", "one button drift", ""],
["Cluster Rush", "cluster-rush", "arcade", 110, "hot", "truck parkour jumping", "splash.png"],
["BitLife", "bitlife", "sandbox", 268, "hot", "life sim bit life text", "logo.png"],
["Cookie Clicker", "cookie-clicker", "sandbox", 38, "hot", "idle incremental cookie", "logo.png"],
["Crossy Road", "crossyroad", "arcade", 96, "hot", "hopper chicken endless", "crossyroad.png"],
["Death Run 3D", "death-run-3d", "racing", 300, "hot", "tunnel runner slope", ""],
["Slope 2", "slope-2", "arcade", 195, "hot", "ball roll", ""],
/* sports and local two-player */
["Basketball Stars", "basketball-stars", "sports", 18, "", "hoops 1v1 2v2", ""],
["BasketBros", "basketbros-io", "sports", 12, "", "dunk basketball io", "favicon.png"],
["Basket Random", "basket-random", "sports", 44, "hot", "2 player ragdoll", ""],
["Boxing Random", "boxing-random", "sports", 350, "hot", "2 player ragdoll fight", ""],
/* classics, idle and puzzle */
["A Dance of Fire and Ice", "a-dance-of-fire-and-ice", "arcade", 320, "", "rhythm one button", "splash.png"],
["10 Minutes Till Dawn", "10-minutes-till-dawn", "action", 258, "hot", "roguelike survival shooter", "icon.png"],
["Among Us", "among-us", "action", 250, "", "impostor crewmate", ""],
["Baldi's Basics", "baldis-basics", "action", 60, "", "horror school baldi", "splash.png"],
["Backrooms", "backrooms", "action", 45, "", "horror explore liminal", "img/icon.png"],
["Bloxorz", "bloxors", "puzzle", 170, "", "block rolling logic", "favicon.ico"],
["Core Ball", "core-ball", "arcade", 210, "", "timing pin shoot", ""],
["Cut the Rope", "ctr", "puzzle", 120, "", "rope candy", "logo.png"],
["Cut the Rope: Holiday", "ctr-holiday", "puzzle", 190, "", "rope candy christmas", "favicon.ico"],
["Cut the Rope: Time Travel", "ctr-tr", "puzzle", 55, "", "rope candy history", "logo.png"],
["Doodle Jump", "doodle-jump", "arcade", 88, "", "platform jumper", ""],
["2048", "2048", "puzzle", 45, "", "numbers merge tiles", "2048.png"],
["Cupcake 2048", "cupcake2048", "puzzle", 335, "", "numbers merge cupcakes", "favicon.png"],
/* nostalgia and series packs */
["Duck Life", "ducklife1", "arcade", 52, "", "duck train race", "ducklife.png"],
["Duck Life 2", "ducklife2", "arcade", 58, "", "duck train race", "ducklife2.png"],
["Duck Life 3", "ducklife3", "arcade", 64, "", "duck train race", "favicon.ico"],
["Duck Life 4", "ducklife4", "arcade", 70, "", "duck train race", "splash.jpg"],
["Breaking the Bank", "breakingthebank", "classic", 265, "", "henry stickmin comedy", "breakingthebank.png"],
["Escaping the Prison", "escapingtheprison", "classic", 20, "", "henry stickmin comedy", "escapingtheprison.jpg"],
["Bad Ice Cream", "bad-ice-cream", "arcade", 200, "", "2 player maze nitrome", "bad-ice-cream.png"],
["Bad Ice Cream 2", "bad-ice-cream-2", "arcade", 206, "", "2 player maze nitrome", "bad-ice-cream-2.png"],
["Bad Ice Cream 3", "bad-ice-cream-3", "arcade", 212, "", "2 player maze nitrome", "bad-ice-cream-3.png"],
["Bloons TD", "bloonstd", "strategy", 140, "", "tower defense monkeys", "bloonstd.jpg"],
["Bloons TD 2", "bloonstd2", "strategy", 146, "", "tower defense monkeys", "bloonstd2.png"],
/* kept from the old list, because they are still the first thing people open */
["Geometry Dash", "geodash", "arcade", 275, "hot", "gd rhythm jump", ""],
["Fruit Ninja", "fruitninja", "arcade", 340, "", "slice fruit", ""],
["Papa's Pizzeria", "papaspizzaria", "sandbox", 20, "", "papa cooking restaurant", "papaspizzaria.jpg"],
["Minecraft 1.12.2", "https://rawcdn.githack.com/sslightly/Html5-games/main/minecraft_1_12_2.html", "sandbox", 118, "hot", "mc eaglercraft block", ""],
["Retro Bowl", "https://rawcdn.githack.com/sslightly/Html5-games/main/retro_bowl.html", "sports", 8, "", "football nfl", ""],
["Friday Night Funkin'", "https://rawcdn.githack.com/sslightly/Html5-games/main/friday_night_funkin.html", "arcade", 300, "", "fnf rhythm rap", ""],
["Sprunki", "https://rawcdn.githack.com/sslightly/Html5-games/main/sprunki.html", "arcade", 285, "", "incredibox music", ""],
["Red Ball 4", "https://rawcdn.githack.com/sslightly/Html5-games/main/red_ball_4_vol__2.html", "arcade", 0, "", "redball platformer", ""]
];
