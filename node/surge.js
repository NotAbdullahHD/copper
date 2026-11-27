/* Deploy public/ to Surge (a free .surge.sh link, useful when a filter blocks
   another domain).

   Surge has no rewrite config: it answers an unknown path with 200.html if that
   file exists, which is how /games and /settings/general survive a reload there.
   So the build copies index.html to 200.html for the length of the upload, then
   removes it again — otherwise it sits in the repo and goes stale.

   First publish asks for an email and a password and creates the account; after
   that `surge login` remembers it. Pass a different domain if this one is taken:
     npm run deploy:surge -- copper-2027.surge.sh
*/
import { copyFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const domain = process.argv[2] || 'copper-start.surge.sh';
const fallback = 'public/200.html';

copyFileSync('public/index.html', fallback);
try {
  execSync(`npx surge public ${domain}`, { stdio: 'inherit' });
} finally {
  rmSync(fallback, { force: true });
}
