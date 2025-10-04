#!/usr/bin/env node

/**
 * MongoDB Database Inspector CLI
 * Command-line tool to inspect Project Sentry database
 */

require('dotenv').config();
const DatabaseInspector = require('./src/utils/dbInspector');

const commands = {
  collections: 'Show all collections in the database',
  orders: 'Show replenishment orders (add number for limit, e.g., orders 5)',
  inventory: 'Show inventory items (add number for limit, e.g., inventory 20)',
  stats: 'Show database statistics',
  search: 'Search database (usage: search <query>)',
  help: 'Show this help message'
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    console.log('🔍 Project Sentry - Database Inspector');
    console.log('=====================================');
    console.log('Usage: node db-inspector.js <command> [options]');
    console.log('');
    console.log('Available commands:');
    Object.entries(commands).forEach(([cmd, desc]) => {
      console.log(`  ${cmd.padEnd(12)} - ${desc}`);
    });
    console.log('');
    console.log('Examples:');
    console.log('  node db-inspector.js collections');
    console.log('  node db-inspector.js orders 5');
    console.log('  node db-inspector.js inventory 10');
    console.log('  node db-inspector.js stats');
    console.log('  node db-inspector.js search "STORE-NYC-001"');
    return;
  }

  const command = args[0].toLowerCase();
  
  try {
    switch (command) {
      case 'collections':
        await DatabaseInspector.showCollections();
        break;
        
      case 'orders':
        const orderLimit = parseInt(args[1]) || 10;
        await DatabaseInspector.showReplenishmentOrders(orderLimit);
        break;
        
      case 'inventory':
        const inventoryLimit = parseInt(args[1]) || 10;
        await DatabaseInspector.showInventory(inventoryLimit);
        break;
        
      case 'stats':
        await DatabaseInspector.showStats();
        break;
        
      case 'search':
        if (args.length < 2) {
          console.error('❌ Please provide a search query');
          console.log('Usage: node db-inspector.js search <query>');
          return;
        }
        const query = args.slice(1).join(' ');
        await DatabaseInspector.search(query);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "node db-inspector.js help" for available commands');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await DatabaseInspector.disconnect();
    process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n🔌 Shutting down...');
  await DatabaseInspector.disconnect();
  process.exit(0);
});

main();