// Legacy main branch: credentials must be supplied through server environment variables.
// The maintained application runs from dev. Never restore historical credential literals.
function requireEnvironment(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

export const PORT=3001
export const MONGO_URI=process.env.MONGO_URI ?? ""

export const NODEMAILER_EMAIL=process.env.NODEMAILER_EMAIL ?? ""
export const NODEMAILER_PASSWORD=process.env.NODEMAILER_PASSWORD ?? ""

export const JWT_ACCESS_SECRET=requireEnvironment("JWT_ACCESS_SECRET")
export const JWT_REFRESH_SECRET=requireEnvironment("JWT_REFRESH_SECRET")

export const ACCESS_TOKEN_EXPIRES="15m"
export const REFRESH_TOKEN_EXPIRES="7d"

export const DB_PASSWORD = process.env.DB_PASSWORD ?? ""
export const DATABASE_URL=requireEnvironment("DATABASE_URL")
