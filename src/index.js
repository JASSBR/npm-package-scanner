#!/usr/bin/env node

const args = process.argv.slice(2);
const command = args[0];

const HELP = `
  NPM Package Vulnerability Scanner
  CLI that scans package.json for outdated deps, known vulnerabilities, and license issues.

  Usage:
    npm-package-scanner <command> [options]

  Commands:
    help      Show this help message
    version   Show version

  Options:
    -h, --help     Show help
    -v, --version  Show version
`;

function main() {
  if (!command || command === 'help' || command === '-h' || command === '--help') {
    console.log(HELP);
    return;
  }

  if (command === 'version' || command === '-v' || command === '--version') {
    console.log('1.0.0');
    return;
  }

  // TODO: Implement commands
  console.log('Command:', command);
}

main();
