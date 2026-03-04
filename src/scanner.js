const fs = require('fs');
const path = require('path');
const { fetchJSON } = require('./utils');

// Known problematic licenses for commercial use
const RESTRICTIVE_LICENSES = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'SSPL-1.0', 'EUPL-1.1', 'EUPL-1.2', 'CPAL-1.0'];
const PERMISSIVE_LICENSES = ['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'Unlicense', 'CC0-1.0'];

function readPackageJson(dir) {
  const pkgPath = path.resolve(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

function parseVersion(v) {
  if (!v) return null;
  const clean = v.replace(/^[\^~>=<\s]+/, '');
  const parts = clean.split('.').map(Number);
  return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0, raw: v };
}

async function fetchPackageInfo(name) {
  try {
    const data = await fetchJSON(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
    if (!data || !data['dist-tags']) return null;

    const latest = data['dist-tags'].latest;
    const latestInfo = data.versions?.[latest] || {};

    return {
      name,
      latest,
      license: latestInfo.license || data.license || 'Unknown',
      description: data.description || '',
      deprecated: latestInfo.deprecated || null,
      homepage: data.homepage || null,
    };
  } catch {
    return null;
  }
}

function compareVersions(current, latest) {
  const cur = parseVersion(current);
  const lat = parseVersion(latest);
  if (!cur || !lat) return 'unknown';

  if (lat.major > cur.major) return 'major';
  if (lat.minor > cur.minor) return 'minor';
  if (lat.patch > cur.patch) return 'patch';
  return 'up-to-date';
}

function classifyLicense(license) {
  if (!license || license === 'Unknown') return 'unknown';
  // Handle SPDX expressions
  const id = typeof license === 'object' ? license.type : license;
  if (RESTRICTIVE_LICENSES.some(l => id.includes(l))) return 'restrictive';
  if (PERMISSIVE_LICENSES.some(l => id.includes(l))) return 'permissive';
  return 'other';
}

async function scanDependencies(deps, type) {
  const results = [];
  const names = Object.keys(deps || {});

  for (const name of names) {
    const currentVersion = deps[name];
    const info = await fetchPackageInfo(name);

    const result = {
      name,
      type,
      currentVersion,
      latestVersion: info?.latest || 'unknown',
      versionStatus: info ? compareVersions(currentVersion, info.latest) : 'unknown',
      license: info?.license || 'Unknown',
      licenseClass: classifyLicense(info?.license),
      deprecated: info?.deprecated || null,
      description: info?.description || '',
    };

    results.push(result);
  }

  return results;
}

async function scan(dir) {
  const pkg = readPackageJson(dir);
  if (!pkg) return null;

  const deps = await scanDependencies(pkg.dependencies, 'prod');
  const devDeps = await scanDependencies(pkg.devDependencies, 'dev');

  const all = [...deps, ...devDeps];

  const summary = {
    name: pkg.name || 'unknown',
    version: pkg.version || '0.0.0',
    totalDeps: all.length,
    prodDeps: deps.length,
    devDeps: devDeps.length,
    outdated: all.filter(d => d.versionStatus !== 'up-to-date' && d.versionStatus !== 'unknown').length,
    majorOutdated: all.filter(d => d.versionStatus === 'major').length,
    deprecated: all.filter(d => d.deprecated).length,
    restrictiveLicenses: all.filter(d => d.licenseClass === 'restrictive').length,
    unknownLicenses: all.filter(d => d.licenseClass === 'unknown').length,
  };

  // Risk score (0-100)
  let risk = 0;
  risk += summary.majorOutdated * 15;
  risk += summary.deprecated * 20;
  risk += summary.restrictiveLicenses * 10;
  risk += summary.unknownLicenses * 5;
  risk += all.filter(d => d.versionStatus === 'minor').length * 3;
  summary.riskScore = Math.min(100, risk);

  return { summary, dependencies: deps, devDependencies: devDeps, all };
}

module.exports = { scan, readPackageJson, classifyLicense, compareVersions };
