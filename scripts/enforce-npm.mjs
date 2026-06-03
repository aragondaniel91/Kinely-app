const userAgent = process.env.npm_config_user_agent || "";

if (userAgent && !userAgent.startsWith("npm/")) {
  console.error(
    "This project uses npm as its package manager. Please run npm install or npm ci."
  );
  process.exit(1);
}
