const express = require('express');
const mongoose = require('mongoose');
const DatabaseInspector = require('./src/utils/dbInspector');
const { ReplenishmentOrder, Inventory, Store, Warehouse } = require('./src/models');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple HTML template for the database viewer
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Sentry - Database Viewer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #333; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .nav { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .nav button { padding: 10px 20px; border: none; background: #007acc; color: white; border-radius: 4px; cursor: pointer; transition: background 0.3s; }
        .nav button:hover { background: #005a99; }
        .nav button.active { background: #28a745; }
        .content { min-height: 400px; }
        .loading { text-align: center; color: #666; font-style: italic; }
        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .success { color: #155724; background: #d4edda; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .data-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #007acc; }
        .data-item h4 { margin: 0 0 10px 0; color: #007acc; }
        .data-item .meta { font-size: 0.9em; color: #666; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: linear-gradient(135deg, #007acc, #28a745); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card .number { font-size: 2em; font-weight: bold; }
        .stat-card .label { font-size: 0.9em; opacity: 0.9; }
        .search-box { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Project Sentry - Database Viewer</h1>
            <p>Real-time MongoDB Database Inspector</p>
        </div>
        
        <div class="nav">
            <button onclick="loadStats()">📊 Statistics</button>
            <button onclick="loadCollections()">📋 Collections</button>
            <button onclick="loadOrders()">🔄 Orders</button>
            <button onclick="loadInventory()">📦 Inventory</button>
            <button onclick="showSearch()">🔍 Search</button>
            <button onclick="loadRaw()">🔧 Raw Query</button>
        </div>
        
        <div class="content" id="content">
            <div class="loading">Click a button above to start exploring your database...</div>
        </div>
    </div>

    <script>
        let currentView = null;
        
        function setLoading() {
            document.getElementById('content').innerHTML = '<div class="loading">Loading...</div>';
        }
        
        function setActive(buttonText) {
            document.querySelectorAll('.nav button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.nav button').forEach(btn => {
                if(btn.textContent.includes(buttonText)) btn.classList.add('active');
            });
        }
        
        async function loadStats() {
            setLoading();
            setActive('Statistics');
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('content').innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
                    return;
                }
                
                document.getElementById('content').innerHTML = \`
                    <h2>📈 Database Statistics</h2>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="number">\${data.stats.replenishmentOrders}</div>
                            <div class="label">Replenishment Orders</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">\${data.stats.inventoryItems}</div>
                            <div class="label">Inventory Items</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">\${data.stats.stores}</div>
                            <div class="label">Stores</div>
                        </div>
                        <div class="stat-card">
                            <div class="number">\${data.stats.warehouses}</div>
                            <div class="label">Warehouses</div>
                        </div>
                    </div>
                    <div class="data-item">
                        <h4>Database Information</h4>
                        <p><strong>Database:</strong> \${data.dbInfo.name}</p>
                        <p><strong>Collections:</strong> \${data.dbInfo.collections}</p>
                        <p><strong>Total Documents:</strong> \${data.dbInfo.objects}</p>
                        <p><strong>Data Size:</strong> \${data.dbInfo.dataSize} MB</p>
                        <p><strong>Connection Status:</strong> <span style="color: green;">✅ Connected</span></p>
                    </div>
                \`;
            } catch (error) {
                document.getElementById('content').innerHTML = \`<div class="error">Connection Error: \${error.message}</div>\`;
            }
        }
        
        async function loadOrders() {
            setLoading();
            setActive('Orders');
            try {
                const response = await fetch('/api/orders');
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('content').innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
                    return;
                }
                
                let html = '<h2>🔄 Replenishment Orders</h2>';
                
                if (data.orders.length === 0) {
                    html += '<div class="data-item">No replenishment orders found</div>';
                } else {
                    data.orders.forEach(order => {
                        html += \`
                            <div class="data-item">
                                <h4>\${order.replenishment_id}</h4>
                                <p><strong>Product:</strong> \${order.product_name} (\${order.product_id})</p>
                                <p><strong>Store:</strong> \${order.store_id}</p>
                                <p><strong>Status:</strong> <span style="color: #007acc;">\${order.status}</span></p>
                                <p><strong>Stock:</strong> \${order.current_stock}/\${order.reorder_threshold}</p>
                                <div class="meta">Created: \${new Date(order.created_at).toLocaleString()}</div>
                            </div>
                        \`;
                    });
                }
                
                document.getElementById('content').innerHTML = html;
            } catch (error) {
                document.getElementById('content').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        async function loadInventory() {
            setLoading();
            setActive('Inventory');
            try {
                const response = await fetch('/api/inventory-data');
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('content').innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
                    return;
                }
                
                let html = '<h2>📦 Inventory Items</h2>';
                
                if (data.inventory.length === 0) {
                    html += '<div class="data-item">No inventory items found</div>';
                } else {
                    data.inventory.forEach(item => {
                        const lowStock = item.current_stock <= item.reorder_threshold;
                        html += \`
                            <div class="data-item" style="border-left-color: \${lowStock ? '#dc3545' : '#007acc'}">
                                <h4>\${item.product_name} \${lowStock ? '⚠️' : ''}</h4>
                                <p><strong>Product ID:</strong> \${item.product_id}</p>
                                <p><strong>Store:</strong> \${item.store_id}</p>
                                <p><strong>Stock:</strong> \${item.current_stock} (threshold: \${item.reorder_threshold})</p>
                                <p><strong>Unit Cost:</strong> $\${item.unit_cost}</p>
                                <div class="meta">Updated: \${new Date(item.last_updated).toLocaleString()}</div>
                            </div>
                        \`;
                    });
                }
                
                document.getElementById('content').innerHTML = html;
            } catch (error) {
                document.getElementById('content').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        async function loadCollections() {
            setLoading();
            setActive('Collections');
            try {
                const response = await fetch('/api/collections');
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('content').innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
                    return;
                }
                
                let html = '<h2>📋 Database Collections</h2>';
                
                if (data.collections.length === 0) {
                    html += '<div class="data-item">No collections found (database is empty)</div>';
                } else {
                    data.collections.forEach(collection => {
                        html += \`
                            <div class="data-item">
                                <h4>📁 \${collection.name}</h4>
                                <p><strong>Documents:</strong> \${collection.count}</p>
                                <p><strong>Type:</strong> Collection</p>
                            </div>
                        \`;
                    });
                }
                
                document.getElementById('content').innerHTML = html;
            } catch (error) {
                document.getElementById('content').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        function showSearch() {
            setActive('Search');
            document.getElementById('content').innerHTML = \`
                <h2>🔍 Search Database</h2>
                <input type="text" class="search-box" id="searchInput" placeholder="Enter search query (e.g., STORE-NYC-001, PROD-JEANS-001, etc.)" onkeypress="if(event.key==='Enter') performSearch()">
                <button onclick="performSearch()" style="padding: 12px 24px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0;">Search</button>
                <div id="searchResults"></div>
            \`;
            document.getElementById('searchInput').focus();
        }
        
        async function performSearch() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) return;
            
            document.getElementById('searchResults').innerHTML = '<div class="loading">Searching...</div>';
            
            try {
                const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`);
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('searchResults').innerHTML = \`<div class="error">Error: \${data.error}</div>\`;
                    return;
                }
                
                let html = '<h3>Search Results:</h3>';
                
                if (data.orders.length === 0 && data.inventory.length === 0) {
                    html += '<div class="data-item">No results found</div>';
                } else {
                    if (data.orders.length > 0) {
                        html += '<h4>🔄 Replenishment Orders:</h4>';
                        data.orders.forEach(order => {
                            html += \`
                                <div class="data-item">
                                    <h4>\${order.replenishment_id}</h4>
                                    <p>\${order.product_name} - \${order.status}</p>
                                </div>
                            \`;
                        });
                    }
                    
                    if (data.inventory.length > 0) {
                        html += '<h4>📦 Inventory Items:</h4>';
                        data.inventory.forEach(item => {
                            html += \`
                                <div class="data-item">
                                    <h4>\${item.product_name}</h4>
                                    <p>\${item.store_id} - Stock: \${item.current_stock}</p>
                                </div>
                            \`;
                        });
                    }
                }
                
                document.getElementById('searchResults').innerHTML = html;
            } catch (error) {
                document.getElementById('searchResults').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        function loadRaw() {
            setActive('Raw Query');
            document.getElementById('content').innerHTML = \`
                <h2>🔧 Raw Database Query</h2>
                <p>Execute custom MongoDB queries (be careful!)</p>
                <textarea id="rawQuery" style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;" placeholder="Enter MongoDB query (JSON format)">
{
  "collection": "replenishmentorders",
  "operation": "find",
  "query": {},
  "limit": 10
}</textarea>
                <button onclick="executeRawQuery()" style="padding: 12px 24px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 10px 0;">Execute Query</button>
                <div id="rawResults"></div>
            \`;
        }
        
        async function executeRawQuery() {
            const query = document.getElementById('rawQuery').value.trim();
            if (!query) return;
            
            document.getElementById('rawResults').innerHTML = '<div class="loading">Executing query...</div>';
            
            try {
                const response = await fetch('/api/raw-query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: query
                });
                const data = await response.json();
                
                document.getElementById('rawResults').innerHTML = \`
                    <h3>Query Results:</h3>
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                document.getElementById('rawResults').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
            }
        }
        
        // Auto-refresh every 30 seconds if viewing dynamic data
        setInterval(() => {
            if (currentView === 'stats') loadStats();
            else if (currentView === 'orders') loadOrders();
            else if (currentView === 'inventory') loadInventory();
        }, 30000);
    </script>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
  res.send(htmlTemplate);
});

// API Routes
app.get('/api/stats', async (req, res) => {
  try {
    await DatabaseInspector.connect();
    
    const stats = await mongoose.connection.db.stats();
    const replenishmentOrders = await ReplenishmentOrder.countDocuments();
    const inventoryItems = await Inventory.countDocuments();
    const stores = await Store.countDocuments();
    const warehouses = await Warehouse.countDocuments();
    
    res.json({
      stats: {
        replenishmentOrders,
        inventoryItems,
        stores,
        warehouses
      },
      dbInfo: {
        name: mongoose.connection.name,
        collections: stats.collections,
        objects: stats.objects,
        dataSize: (stats.dataSize / 1024 / 1024).toFixed(2)
      }
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/collections', async (req, res) => {
  try {
    await DatabaseInspector.connect();
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const count = await mongoose.connection.db.collection(collection.name).countDocuments();
        return { name: collection.name, count };
      })
    );
    
    res.json({ collections: collectionsWithCounts });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    await DatabaseInspector.connect();
    const orders = await ReplenishmentOrder.find()
      .sort({ created_at: -1 })
      .limit(20);
    
    res.json({ orders });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/inventory-data', async (req, res) => {
  try {
    await DatabaseInspector.connect();
    const inventory = await Inventory.find()
      .sort({ last_updated: -1 })
      .limit(20);
    
    res.json({ inventory });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json({ error: 'No search query provided' });
    }
    
    await DatabaseInspector.connect();
    
    const orders = await ReplenishmentOrder.find({
      $or: [
        { replenishment_id: { $regex: query, $options: 'i' } },
        { store_id: { $regex: query, $options: 'i' } },
        { product_id: { $regex: query, $options: 'i' } },
        { product_name: { $regex: query, $options: 'i' } },
        { status: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);
    
    const inventory = await Inventory.find({
      $or: [
        { store_id: { $regex: query, $options: 'i' } },
        { product_id: { $regex: query, $options: 'i' } },
        { product_name: { $regex: query, $options: 'i' } },
        { product_category: { $regex: query, $options: 'i' } }
      ]
    }).limit(10);
    
    res.json({ orders, inventory });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post('/api/raw-query', async (req, res) => {
  try {
    await DatabaseInspector.connect();
    
    const { collection, operation, query, limit } = req.body;
    
    if (!collection || !operation) {
      return res.json({ error: 'Collection and operation are required' });
    }
    
    const coll = mongoose.connection.db.collection(collection);
    let result;
    
    switch (operation.toLowerCase()) {
      case 'find':
        result = await coll.find(query || {}).limit(limit || 10).toArray();
        break;
      case 'count':
        result = await coll.countDocuments(query || {});
        break;
      case 'aggregate':
        result = await coll.aggregate(query || []).toArray();
        break;
      default:
        return res.json({ error: `Unsupported operation: ${operation}` });
    }
    
    res.json({ result, count: Array.isArray(result) ? result.length : 1 });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Connect to database and start server
async function startServer() {
  try {
    require('dotenv').config();
    
    console.log('🔍 Starting Project Sentry Database Viewer...');
    
    app.listen(PORT, () => {
      console.log(`🌐 Database Viewer running at: http://localhost:${PORT}`);
      console.log('📊 Features available:');
      console.log('   • Real-time database statistics');
      console.log('   • Collection browser');
      console.log('   • Replenishment order viewer');
      console.log('   • Inventory inspector');
      console.log('   • Database search');
      console.log('   • Raw query executor');
      console.log('');
      console.log('🚀 Open your browser and navigate to the URL above!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start database viewer:', error.message);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;