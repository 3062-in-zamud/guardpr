// False positive: test fixture data with fake keys

export const TEST_USERS = [
  {
    id: "user-001",
    name: "Test User",
    apiKey: "test-api-key-000000000000000000000000",
    token: "fake-token-for-unit-tests-only",
  },
  {
    id: "user-002",
    name: "Mock Admin",
    apiKey: "mock-api-key-111111111111111111111111",
    token: "mock-token-for-integration-tests",
  },
];

export const MOCK_CREDENTIALS = {
  username: "testuser",
  password: "P@ssw0rd",
};
