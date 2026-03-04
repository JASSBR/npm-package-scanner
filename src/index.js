#!/usr/bin/env node

const { c, spinner } = require('./utils');
const { scan } = require('./scanner');
const { printSummary, printDepsTable, printOutdated, printLicenses } = require('./formatter');

const BANNER = `
${c('magenta', '  ╔══════════════════════════════════════════════╗')}
${c('magenta', '  ║')}  ${c('bold', 'NPM Package Vulnerability Scanner')}  ${c('gray', 'v1.0')}    ${c('magenta', '║')}
${c('magenta', '  ║')}  ${c('gray', 'Scan deps for updates, vulns & licenses')}   ${c('magenta', '║')}
${c('magenta', '  ╚══════════════════════════════════════════════╝')}
`;

function showHelp() {
  console.log(BANNER);
  console.log(`  ${c('bold', 'Usage:')} npx npm-package-scanner ${c('cyan', '<command>')} ${c('gray', '[path]')}`);
  console.log();
  console.log(`  ${c('bold', 'Commands:')}`);
  console.log(`    ${c('cyan', 'scan')}         Full scan report (default)`);
  console.log(`    ${c('cyan', 'outdated')}     Show only outdated packages`);
  console.log(`    ${c('cyan', 'licenses')}     License compatibility report`);
  console.log(`    ${c('cyan', 'help')}         Show this help`);
  console.log();
  console.log(`  ${c('bold', 'Arguments:')}`);
  console.log(`    ${c('gray', '[path]')}       Path to project dir (default: current dir)`);
  console.log();
  console.log(`  ${c('bold', 'Examples:')}`);
  console.log(`    ${c('gray', '$')} node src/index.js`);
  console.log(`    ${c('gray', '$')} node src/index.js scan ./my-project`);
  console.log(`    ${c('gray', '$')} node src/index.js outdated`);
  console.log(`    ${c('gray', '$')} node src/index.js licenses`);
  console.log();
}

async function main() {
  const args = process.argv.slice(2);
  let command = 'scan';
  let dir = '.';

  for (const arg of args) {
    if (['scan', 'outdated', 'licenses', 'help', '--help', '-h'].includes(arg)) {
      command = arg;
    } else if (!arg.startsWith('-')) {
      dir = arg;
    }
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  console.log(BANNER);

  const s = spinner('Scanning packages from npm registry...');
  let result;
  try {
    result = await scan(dir);
  } catch (err) {
    s.fail(`Scan failed: ${err.message}`);
    process.exit(1);
  }

  if (!result) {
    s.fail('No package.json found in ' + dir);
    process.exit(1);
  }

  s.stop(`Scanned ${result.all.length} packages`);

  switch (command) {
    case 'scan':
      printSummary(result.summary);
      printDepsTable(result.dependencies, `Production Dependencies (${result.dependencies.length})`);
      printDepsTable(result.devDependencies, `Dev Dependencies (${result.devDependencies.length})`);
      printOutdated(result.all);
      printLicenses(result.all);
      break;
    case 'outdated':
      printOutdated(result.all);
      break;
    case 'licenses':
      printLicenses(result.all);
      break;
    default:
      showHelp();
  }
}

main().catch(err => {
  console.error(c('red', `\n  Error: ${err.message}\n`));
  process.exit(1);
});
