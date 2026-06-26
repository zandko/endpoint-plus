#!/usr/bin/env node
/**
 * Inspect a business project for endpoint-plus setup and common integration risks.
 * Uses only Node.js built-in modules so it can run in frontend projects without extra deps.
 */

const fs = require('node:fs');
const path = require('node:path');

const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.mts', '.cts']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.nuxt', '.output', 'coverage']);

function exists(filePath) {
  return fs.existsSync(filePath);
}

function readJson(filePath) {
  if (!exists(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { __error__: error.message };
  }
}

function detectPackageManager(root) {
  if (exists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(root, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(root, 'package-lock.json'))) return 'npm';
  if (exists(path.join(root, 'bun.lockb')) || exists(path.join(root, 'bun.lock'))) return 'bun';
  return 'unknown';
}

function allDependencies(pkg) {
  const result = {};
  for (const key of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (pkg[key] && typeof pkg[key] === 'object') Object.assign(result, pkg[key]);
  }
  return result;
}

function shouldSkipDir(dirName) {
  return SKIP_DIRS.has(dirName);
}

function walkFiles(root, visitor) {
  if (!exists(root)) return;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) walkFiles(fullPath, visitor);
      continue;
    }
    if (entry.isFile()) visitor(fullPath);
  }
}

function rel(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function countPattern(root, pattern) {
  let count = 0;
  const samples = [];
  const srcRoot = path.join(root, 'src');
  walkFiles(srcRoot, (filePath) => {
    if (!TEXT_EXTENSIONS.has(path.extname(filePath))) return;
    let text = '';
    try {
      text = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }
    const matches = text.match(pattern);
    if (matches && matches.length) {
      count += matches.length;
      if (samples.length < 5) samples.push(rel(root, filePath));
    }
  });
  return { count, samples };
}

function findRootGlob(root, regex) {
  const result = [];
  for (const name of fs.readdirSync(root)) {
    if (regex.test(name)) result.push(name);
  }
  return result.sort();
}

function findGeneratedTypes(root) {
  const result = [];
  const srcRoot = path.join(root, 'src');
  walkFiles(srcRoot, (filePath) => {
    const name = path.basename(filePath);
    if (name.includes('endpoint-plus') && name.endsWith('.d.ts')) result.push(rel(root, filePath));
  });
  return result.sort();
}

function printList(label, items) {
  console.log(`- ${label}: ${items.length ? items.join(', ') : 'none'}`);
}

function main() {
  const root = path.resolve(process.argv[2] || '.');
  if (!exists(root)) {
    console.error(`ERROR: project root does not exist: ${root}`);
    process.exitCode = 2;
    return;
  }

  const pkg = readJson(path.join(root, 'package.json'));
  const deps = allDependencies(pkg);
  const endpointCalls = countPattern(root, /\bendpoint\.(?:get|post|put|patch|delete|request)\s*\(/g);
  const axiosUses = countPattern(root, /from\s+['"]axios['"]|require\(['"]axios['"]\)|\baxios\./g);
  const apiPrefixCalls = countPattern(
    root,
    /endpoint\.(?:get|post|put|patch|delete)\s*\(\s*['"`]\/api\/v\d+\//g,
  );
  const localStorageUses = countPattern(root, /\blocalStorage\b/g);

  const viteConfigs = findRootGlob(root, /^vite\.config\./);
  const generatedTypes = findGeneratedTypes(root);

  console.log('# endpoint-plus Project Inspection');
  console.log('');
  console.log(`- Project root: ${root}`);
  console.log(`- Package manager: ${detectPackageManager(root)}`);
  console.log(`- Has package.json: ${Object.keys(pkg).length > 0}`);
  if (pkg.__error__) console.log(`- package.json parse error: ${pkg.__error__}`);
  console.log('');

  console.log('## Dependencies');
  for (const name of ['@yw/endpoint-plus', '@yw/endpoint-plus-devtools', 'quicktype-core', 'axios', 'vite']) {
    console.log(`- ${name}: ${deps[name] || 'not installed'}`);
  }
  console.log('');

  console.log('## Project Signals');
  printList('Vite configs', viteConfigs);
  printList('Generated endpoint-plus .d.ts files', generatedTypes);
  console.log(`- endpoint.* calls in src: ${endpointCalls.count}`);
  if (endpointCalls.samples.length) console.log(`  - sample files: ${endpointCalls.samples.join(', ')}`);
  console.log(`- axios usage in src: ${axiosUses.count}`);
  if (axiosUses.samples.length) console.log(`  - sample files: ${axiosUses.samples.join(', ')}`);
  console.log(`- endpoint calls with /api/vN prefix: ${apiPrefixCalls.count}`);
  if (apiPrefixCalls.samples.length) console.log(`  - sample files: ${apiPrefixCalls.samples.join(', ')}`);
  console.log(`- localStorage usage in src: ${localStorageUses.count}`);
  if (localStorageUses.samples.length) console.log(`  - sample files: ${localStorageUses.samples.join(', ')}`);
  console.log('');

  console.log('## Recommendations');
  const recommendations = [];
  if (!deps['@yw/endpoint-plus']) recommendations.push('Install @yw/endpoint-plus before adding endpoint wrappers.');
  if (viteConfigs.length && !deps['@yw/endpoint-plus-devtools']) {
    recommendations.push('For route scanning/typegen in Vite, install @yw/endpoint-plus-devtools and quicktype-core as dev dependencies.');
  }
  if (deps['@yw/endpoint-plus-devtools'] && !deps['quicktype-core']) {
    recommendations.push('Install quicktype-core as a dev dependency for better sample-based type generation.');
  }
  if (axiosUses.count) recommendations.push('Axios is used; read references/migration.md before replacing interceptors or response handling.');
  if (apiPrefixCalls.count) {
    recommendations.push('Calls include /api/vN. Route keys must include the same prefix unless /api/vN is moved into baseURL.');
  }
  if (!generatedTypes.length && deps['@yw/endpoint-plus-devtools']) {
    recommendations.push('DevTools is installed but no generated endpoint-plus .d.ts file was found under src/. Verify typegen.outputFile.');
  }
  if (endpointCalls.count && deps['@yw/endpoint-plus']) {
    recommendations.push('Endpoint calls found; verify YwEndpoint.Routes keys match call paths and tsconfig includes generated/manual .d.ts files.');
  }
  if (localStorageUses.count && /next|nuxt|ssr/i.test(JSON.stringify(deps))) {
    recommendations.push('localStorage appears in a possible SSR project. Ensure token access is browser-only or request-scoped.');
  }

  if (!recommendations.length) console.log('- No obvious endpoint-plus risks detected.');
  for (const recommendation of recommendations) console.log(`- ${recommendation}`);
}

main();
