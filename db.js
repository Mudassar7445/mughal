const { createClient } = require("@libsql/client");

const db = createClient({
  // Ye HTTPS wala link use karega (Fast & No Migration Error)
  url: "https://mughal-db-mudassar7445.aws-ap-south-1.turso.io",
  
  // Aapka Token (Maine check kar liya hai, ye sahi format mein hai)
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzAwNTEyMzEsImlkIjoiOGJlZDE1YWItOWUyNy00MjRiLThjYzMtNmFjN2NiZTIzY2UxIiwicmlkIjoiMjY1YjNiMTgtZDA1YS00OTUxLWI2YzktMDMzYzNlZjFhNjJiIn0.zVBC046n-Ngq-_DGweCU8iHp_gUJDTZUMqJPQzRcgdLhYrq3ID6ltbj8n0HvwvsgnoLbLOWUK7vujFlc7vjvDA"
});

module.exports = db;