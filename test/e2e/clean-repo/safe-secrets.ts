// Clean: code that looks like it contains secrets but does not

// AWS example key from documentation - not a real key
const EXAMPLE_KEY = "AKIAIOSFODNN7EXAMPLE";

// Placeholder values for local development
const LOCAL_DB_URL = "postgres://localhost:5432/devdb";
const TEST_API_KEY = "test-key-not-real-1234567890";

// .env.example pattern - template, not actual secrets
const ENV_TEMPLATE = `
# Copy this file to .env and fill in real values
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
DATABASE_URL=postgres://user:password@host:5432/dbname
`;

// Test data with fake credentials
export const TEST_FIXTURES = {
  mockUser: {
    id: "test-user-001",
    token: "mock-token-for-testing-only",
    apiKey: "fake-api-key-00000000000000000000",
  },
  mockConfig: {
    region: "us-east-1",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  },
};

// Base64 encoded data (not a secret, just encoded config)
const CONFIG_BLOB = "eyJhcHAiOiJteS1hcHAiLCJlbnYiOiJkZXYifQ==";

export function getTestConfig() {
  return {
    key: EXAMPLE_KEY,
    blob: CONFIG_BLOB,
    dbUrl: LOCAL_DB_URL,
  };
}
