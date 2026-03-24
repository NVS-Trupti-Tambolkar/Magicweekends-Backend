const sql = require("mssql");
const logger = require("./logger");

async function connectToSiteDatabase(siteDb) {
    const siteDbConfig = {
      server: process.env.DB_SERVER,
      database: siteDb,  // The site's specific database
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: true,
        trustServerCertificate: true,
      }
    };
  
    const sitePool = new sql.ConnectionPool(siteDbConfig);
    await sitePool.connect();
    logger.info(`Connected to site database: ${siteDb}`);
    return sitePool;
  }

async function executeSiteStoredProcedure(procedureName, params = [], pool = null) {
    try {
      const request = (pool || pool._connected).request();  // Use the passed pool or the default one
  
      // Add parameters to the request
      params.forEach(param => {
        request.input(param.name, param.type, param.value);
      });
  
      const result = await request.execute(procedureName);
      return result;
    } catch (error) {
      logger.error(`Error executing stored procedure ${procedureName}:`, error);
      throw error;
    }
  }
  
  module.exports = {
    connectToSiteDatabase,
    executeSiteStoredProcedure
  };