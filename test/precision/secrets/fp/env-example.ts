// False positive: .env.example template content

export const ENV_TEMPLATE = `
# Application Configuration
# Copy this file to .env and replace placeholder values

# AWS credentials (get from AWS IAM console)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# Database
DATABASE_URL=postgres://user:password@localhost:5432/mydb

# GitHub
GITHUB_TOKEN=your-github-token-here

# API Keys
STRIPE_KEY=sk_test_your_stripe_key
SENDGRID_KEY=SG.your_sendgrid_key
`;

export function generateEnvExample(): string {
  return ENV_TEMPLATE;
}
