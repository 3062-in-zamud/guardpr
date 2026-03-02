// True positive: hardcoded AWS access key
const accessKeyId = "AKIAVRJTDRZ3KPWXHG94";
const secretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY";

export function getCredentials() {
  return { accessKeyId, secretAccessKey };
}
