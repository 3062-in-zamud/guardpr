// True positive: database connection strings with embedded passwords
const POSTGRES_URL = "postgres://admin:SuperSecret123!@prod-db.example.com:5432/myapp";
const MYSQL_URL = "mysql://root:r00tP@ssw0rd@mysql.internal:3306/production";
const MONGO_URL = "mongodb://appuser:M0ng0Pass@mongo.cluster.example.com:27017/maindb";

export function getDatabaseUrl(db: string) {
  switch (db) {
    case "postgres":
      return POSTGRES_URL;
    case "mysql":
      return MYSQL_URL;
    case "mongo":
      return MONGO_URL;
    default:
      throw new Error(`Unknown database: ${db}`);
  }
}
