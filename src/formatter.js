const { c, padRight, padLeft } = require('./utils');

function header(title) {
  const line = '─'.repeat(56);
  return `\n${c('cyan', `  ┌${line}┐`)}\n${c('cyan', '  │')} ${c('bold', padRight(title, 55))}${c('cyan', '│')}\n${c('cyan', `  └${line}┘`)}\n`;
}

function riskBadge(score) {
  if (score >= 60) return c('red', `  ██ RISK SCORE: ${score}/100 — HIGH `);
  if (score >= 30) return c('yellow', `  ▓▓ RISK SCORE: ${score}/100 — MEDIUM `);
  return c('green', `  ░░ RISK SCORE: ${score}/100 — LOW `);
}

function versionBadge(status) {
  switch (status) {
    case 'major': return c('red', 'MAJOR');
    case 'minor': return c('yellow', 'MINOR');
    case 'patch': return c('green', 'PATCH');
    case 'up-to-date': return c('green', '  OK ');
    default: return c('gray', '  ?  ');
  }
}

function licenseBadge(cls) {
  switch (cls) {
    case 'permissive': return c('green', 'OK  ');
    case 'restrictive': return c('red', 'WARN');
    case 'unknown': return c('yellow', ' ?  ');
    default: return c('gray', ' -  ');
  }
}

function printSummary(summary) {
  console.log(header(`Scan: ${summary.name}@${summary.version}`));
  console.log(riskBadge(summary.riskScore));
  console.log();

  const rows = [
    ['Total dependencies', c('bold', String(summary.totalDeps))],
    ['  Production', String(summary.prodDeps)],
    ['  Development', String(summary.devDeps)],
    ['Outdated packages', summary.outdated > 0 ? c('yellow', String(summary.outdated)) : c('green', '0')],
    ['  Major updates', summary.majorOutdated > 0 ? c('red', String(summary.majorOutdated)) : '0'],
    ['Deprecated', summary.deprecated > 0 ? c('red', String(summary.deprecated)) : c('green', '0')],
    ['Restrictive licenses', summary.restrictiveLicenses > 0 ? c('red', String(summary.restrictiveLicenses)) : c('green', '0')],
    ['Unknown licenses', summary.unknownLicenses > 0 ? c('yellow', String(summary.unknownLicenses)) : '0'],
  ];

  for (const [label, value] of rows) {
    console.log(`  ${padRight(label, 24)} ${value}`);
  }
  console.log();
}

function printDepsTable(deps, title) {
  if (deps.length === 0) return;

  console.log(header(title));
  console.log(`  ${c('gray', padRight('Package', 30))}${c('gray', padRight('Current', 14))}${c('gray', padRight('Latest', 14))}${c('gray', padRight('Status', 8))}${c('gray', padRight('License', 16))}${c('gray', 'Lic')}`);
  console.log(`  ${c('gray', '─'.repeat(90))}`);

  for (const dep of deps) {
    const name = padRight(dep.name.length > 29 ? dep.name.slice(0, 28) + '…' : dep.name, 30);
    const current = padRight(dep.currentVersion, 14);
    const latest = padRight(dep.latestVersion, 14);
    const status = versionBadge(dep.versionStatus);
    const license = padRight(typeof dep.license === 'object' ? dep.license.type : dep.license, 16);
    const licBadge = licenseBadge(dep.licenseClass);

    let line = `  ${name}${current}${latest}${status}   ${license}${licBadge}`;

    if (dep.deprecated) {
      line += `\n  ${c('red', `  ⚠ DEPRECATED: ${dep.deprecated.slice(0, 70)}`)}`;
    }

    console.log(line);
  }
  console.log();
}

function printOutdated(all) {
  const outdated = all.filter(d => d.versionStatus !== 'up-to-date' && d.versionStatus !== 'unknown');
  if (outdated.length === 0) {
    console.log(header('Outdated Packages'));
    console.log(`  ${c('green', 'All packages are up to date!')}\n`);
    return;
  }

  // Sort: major first, then minor, then patch
  const order = { major: 0, minor: 1, patch: 2 };
  outdated.sort((a, b) => (order[a.versionStatus] ?? 3) - (order[b.versionStatus] ?? 3));

  console.log(header(`Outdated Packages (${outdated.length})`));

  for (const dep of outdated) {
    const badge = versionBadge(dep.versionStatus);
    const arrow = c('gray', '→');
    console.log(`  ${badge}  ${padRight(dep.name, 30)} ${c('red', padRight(dep.currentVersion, 12))} ${arrow} ${c('green', dep.latestVersion)}`);
  }
  console.log();
}

function printLicenses(all) {
  console.log(header('License Report'));

  const groups = { permissive: [], restrictive: [], unknown: [], other: [] };
  for (const dep of all) {
    const cls = dep.licenseClass;
    (groups[cls] || groups.other).push(dep);
  }

  if (groups.restrictive.length > 0) {
    console.log(`  ${c('red', '⚠ Restrictive Licenses:')}`);
    for (const dep of groups.restrictive) {
      console.log(`    ${c('red', '●')} ${padRight(dep.name, 30)} ${dep.license}`);
    }
    console.log();
  }

  if (groups.unknown.length > 0) {
    console.log(`  ${c('yellow', '? Unknown Licenses:')}`);
    for (const dep of groups.unknown) {
      console.log(`    ${c('yellow', '●')} ${padRight(dep.name, 30)} ${dep.license}`);
    }
    console.log();
  }

  if (groups.permissive.length > 0) {
    console.log(`  ${c('green', '✓ Permissive Licenses:')} (${groups.permissive.length} packages)`);
    const byLicense = {};
    for (const dep of groups.permissive) {
      const lic = typeof dep.license === 'object' ? dep.license.type : dep.license;
      if (!byLicense[lic]) byLicense[lic] = [];
      byLicense[lic].push(dep.name);
    }
    for (const [lic, names] of Object.entries(byLicense)) {
      console.log(`    ${c('green', '●')} ${padRight(lic, 16)} ${c('gray', names.join(', '))}`);
    }
    console.log();
  }
}

module.exports = { printSummary, printDepsTable, printOutdated, printLicenses };
