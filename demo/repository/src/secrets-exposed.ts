// Vulnerable: hardcoded credentials in source code

// AWS access key - should be detected as P0
const AWS_ACCESS_KEY_ID = "AKIAVRJTDRZ3KPWXHG94";
const AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY";

// GitHub personal access token - should be detected as P0
const GITHUB_TOKEN = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234";

// Database connection string with embedded password
const DATABASE_URL = "postgres://admin:s3cretPassw0rd@db.example.com:5432/production";

// Generic API key (hardcoded secret pattern)
const API_KEY = "my-secret-api-key-do-not-commit-a1b2c3d4e5f6";

export function getAwsCredentials() {
  return {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  };
}

export function connectToDb() {
  return DATABASE_URL;
}

export function callApi() {
  return fetch("https://api.example.com/data", {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "X-GitHub-Token": GITHUB_TOKEN,
    },
  });
}
