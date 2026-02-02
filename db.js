const { createClient } = require("@libsql/client");

// Hum Vercel ki settings use nahi kar rahe, direct yahan likh rahe hain
const db = createClient({
  // Maine aapka URL 'https' kar diya hai taake connection foran jurr jaye
  url: "https://mughal-db-mudassar7445.aws-ap-south-1.turso.io",
  
  // Aapka diya hua Token
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAwNTEyMzEsImlkIjoiOGJlZDE1YWItOWUyNy00MjRiLThjYzMtNmFjN2NiZTIzY2UxIiwicmlkIjoiMjY1YjNiMTgtZDA1YS00OTUxLWI2YzktMDMzYzNlZjFhNjJiIn0.zVBC046n-Ngq-_DGweCU8iHp_gUJDTZUMqJPQzRcgdLhYrq3ID6ltbj8n0HvwvsgnoLbLOWUK7vujFlc7vjvDA"
});

module.exports = db;