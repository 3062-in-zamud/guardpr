// False positive: keys mentioned in comments only, not in executable code

// The AWS access key format is AKIA followed by 16 alphanumeric characters.
// Example: AKIAIOSFODNN7EXAMPLE (this is a well-known AWS documentation example)
// Never hardcode real keys like AKIA... in your source code.
// Instead, use environment variables:
//   const key = process.env.AWS_ACCESS_KEY_ID;

/**
 * Loads AWS credentials from environment variables.
 *
 * DO NOT hardcode credentials like:
 *   const key = "AKIAIOSFODNN7EXAMPLE";  // BAD
 *
 * Instead use:
 *   const key = process.env.AWS_ACCESS_KEY_ID;  // GOOD
 */
export function loadCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not found in environment variables");
  }

  return { accessKeyId, secretAccessKey };
}
