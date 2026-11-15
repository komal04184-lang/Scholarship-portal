/**
 * ApexScholar Microservices Unified Launcher
 * Starts all 5 microservices + the React client simultaneously with prefixed output.
 */
const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;

const services = [
  {
    name: 'Gateway',
    port: 3000,
    color: '\x1b[36m', // Cyan
    cwd: path.join(rootDir, 'api-gateway'),
    cmd: 'node',
    args: ['src/server.js'],
  },
  {
    name: 'Identity',
    port: 3001,
    color: '\x1b[35m', // Magenta
    cwd: path.join(rootDir, 'services', 'identity_student_service', 'backend'),
    cmd: 'node',
    args: ['server.js'],
  },
  {
    name: 'Scholarship',
    port: 3002,
    color: '\x1b[32m', // Green
    cwd: path.join(rootDir, 'services', 'scholarship-service'),
    cmd: 'node',
    args: ['src/server.js'],
  },
  {
    name: 'Application',
    port: 3003,
    color: '\x1b[33m', // Yellow
    cwd: path.join(rootDir, 'services', 'application-service'),
    cmd: 'node',
    args: ['src/server.js'],
  },
  {
    name: 'Review',
    port: 3004,
    color: '\x1b[34m', // Blue
    cwd: path.join(rootDir, 'services', 'review-service'),
    cmd: 'node',
    args: ['src/server.js'],
  },
  {
    name: 'Client',
    port: 5173,
    color: '\x1b[32;1m', // Bright Green
    cwd: path.join(rootDir, 'client'),
    cmd: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['run', 'dev'],
  },
];

const resetColor = '\x1b[0m';

console.log('\x1b[1m\x1b[34m' + '='.repeat(70) + resetColor);
console.log('\x1b[1m  🎓 Starting ApexScholar Microservices Architecture...\x1b[0m');
console.log('\x1b[1m\x1b[34m' + '='.repeat(70) + resetColor);
console.log('  • API Gateway       : http://localhost:3000');
console.log('  • Identity Service  : http://localhost:3001');
console.log('  • Scholarship Serv. : http://localhost:3002');
console.log('  • Application Serv. : http://localhost:3003');
console.log('  • Review Service    : http://localhost:3004');
console.log('  • React Vite Client : http://localhost:5173');
console.log('='.repeat(70) + '\n');

const runningProcesses = [];

services.forEach((svc) => {
  const prefix = `${svc.color}[${svc.name.padEnd(11)}]${resetColor} `;
  console.log(`${prefix}Starting on port ${svc.port}...`);

  const proc = spawn(svc.cmd, svc.args, {
    cwd: svc.cwd,
    shell: true,
    env: { ...process.env, PORT: svc.port },
  });

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) console.log(`${prefix}${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      if (line.trim()) console.error(`${prefix}\x1b[31m${line}${resetColor}`);
    });
  });

  proc.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  runningProcesses.push(proc);
});

function cleanup() {
  console.log('\n\x1b[33mShutting down all ApexScholar services...\x1b[0m');
  runningProcesses.forEach((p) => {
    try {
      p.kill();
    } catch (_) {}
  });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
