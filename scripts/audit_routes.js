const fs = require('fs');
const path = require('path');

function inspectDir(dir) {
  const routes = [];
  if (!fs.existsSync(dir)) return routes;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') {
      routes.push(...inspectDir(full));
    } else if (f.isFile() && f.name.endsWith('.js') && (full.includes('routes') || full.includes('app.js') || full.includes('server.js'))) {
      const content = fs.readFileSync(full, 'utf8');
      // match router.get/post/put/patch/delete with possible whitespace/newlines
      const regex = /(router|app)\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gis;
      let match;
      while ((match = regex.exec(content)) !== null) {
        routes.push({
          file: full.replace(/\\/g, '/'),
          method: match[2].toUpperCase(),
          path: match[3]
        });
      }
    }
  }
  return routes;
}

const services = ['api-gateway', 'services/identity_student_service', 'services/scholarship-service', 'services/application-service', 'services/review-service'];
for (const s of services) {
  const r = inspectDir(path.resolve(s));
  console.log(`\n=== ${s} (${r.length} endpoints) ===`);
  r.forEach(x => {
    const relFile = x.file.split(s)[1] || x.file;
    console.log(`  ${x.method.padEnd(7)} ${x.path.padEnd(45)} (${relFile})`);
  });
}
