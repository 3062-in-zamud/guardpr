// True positive: hardcoded GitHub personal access token
const GITHUB_PAT = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef1234";

export function authenticate() {
  return fetch("https://api.github.com/user", {
    headers: { Authorization: `token ${GITHUB_PAT}` },
  });
}
