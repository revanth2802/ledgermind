#!/usr/bin/env node

/**
 * Quick start script for LedgerMind
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 LedgerMind Quick Start\n');

// Check Node version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);
if (majorVersion < 20) {
  console.error('❌ Node.js 20+ required. Current version:', nodeVersion);
  process.exit(1);
}

console.log('✅ Node.js version:', nodeVersion);

// Check if database is configured
const envPath = path.join(__dirname, 'services', 'api', '.env');
if (!fs.existsSync(envPath)) {
  console.log('\n📝 Setting up environment configuration...');
  const exampleEnv = path.join(__dirname, 'services', 'api', '.env.example');
  fs.copyFileSync(exampleEnv, envPath);
  console.log('✅ Created services/api/.env from example');
  console.log('\n⚠️  IMPORTANT: Edit services/api/.env with your configuration:');
  console.log('   - DATABASE_URL');
  console.log('   - OPENAI_API_KEY');
  console.log('   - API_KEY_SECRET\n');
}

// Install dependencies
console.log('\n📦 Installing dependencies...\n');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('\n✅ Dependencies installed');
} catch (error) {
  console.error('\n❌ Failed to install dependencies');
  process.exit(1);
}

// Build packages
console.log('\n🔨 Building packages...\n');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\n✅ Build complete');
} catch (error) {
  console.error('\n❌ Build failed');
  process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('\n✨ LedgerMind is ready!\n');
console.log('Next steps:\n');
console.log('1. Set up PostgreSQL with pgvector:');
console.log('   psql -U postgres -c "CREATE DATABASE ledgermind;"');
console.log('   psql -U postgres -d ledgermind -f packages/db/schema.sql\n');
console.log('2. Configure services/api/.env with your settings\n');
console.log('3. Start the API:');
console.log('   npm run dev --workspace=@ledgermind/api\n');
console.log('4. Run examples:');
console.log('   cd examples');
console.log('   npm run invoice\n');
console.log('Documentation: ./DEVELOPMENT.md');
console.log('\n' + '='.repeat(70) + '\n');
