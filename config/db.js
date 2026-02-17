// config/db.js
const { Pool } = require('pg');
const logger = console;

// Your Neon PostgreSQL connection string
const connectionString = "postgresql://neondb_owner:npg_BCwoXK03sjYF@ep-patient-boat-a428xgfh-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize database connection
const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    logger.info('Neon PostgreSQL Database Connected Successfully');
    
    // Test query
    await client.query('SELECT 1');
    client.release();
    
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    return false;
  }
};

// Call initialize on startup
initializeDatabase();

// Event listeners
pool.on('connect', () => {
  logger.debug('New client connected to pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// MSSQL-style stored procedure execution
async function executeStoredProcedure(procedureName, params = []) {
  const client = await pool.connect();
  
  try {
    // Extract values from params array
    const paramValues = params.map(param => {
      if (typeof param === 'object' && param.value !== undefined) {
        return param.value;
      }
      return param;
    });

    // Build parameter placeholders ($1, $2, ...)
    const paramPlaceholders = paramValues.map((_, i) => `$${i + 1}`).join(', ');
    
    // Check if it's a procedure or function
    const isProcedure = procedureName.toLowerCase().startsWith('sp_') || 
                        procedureName.toLowerCase().includes('proc');
    
    let query;
    if (isProcedure) {
      query = `CALL ${procedureName}(${paramPlaceholders})`;
    } else {
      query = `SELECT * FROM ${procedureName}(${paramPlaceholders})`;
    }

    logger.debug(`Executing: ${query}`);
    const result = await client.query(query, paramValues);
    
    // Return MSSQL-compatible format
    return {
      recordset: result.rows,
      recordsets: [result.rows],
      rowsAffected: result.rowCount,
      output: {}
    };
  } catch (error) {
    logger.error(`Error in ${procedureName}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

// Alternative: Simple query execution
async function executeQuery(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    logger.error('Query error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Health check
async function healthCheck() {
  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0].health === 1;
  } catch (error) {
    return false;
  }
}

module.exports = {
  pool,
  executeStoredProcedure,
  executeQuery,
  healthCheck,
  sql: {
    Int: 'int',
    VarChar: 'varchar',
    NVarChar: 'varchar',
    DateTime: 'timestamp',
    Bit: 'bit',
    Text: 'text'
  }
};