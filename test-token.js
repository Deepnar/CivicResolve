const jwt = require('jsonwebtoken');

// Test the same token validation as middleware
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjMsImVtYWlsIjoiYWRtaW5AdGVzdC5jb20iLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3NTYxODQxNzYsImV4cCI6MTc1Njc4ODk3Nn0.M2E8Cc6NMqGIHlcCVNFqj9JvssJszvzlS2wk4v0yARw';

// Use the same logic as AuthUtils
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

console.log('JWT_SECRET:', JWT_SECRET);
console.log('JWT_SECRET === "your-secret-key":', JWT_SECRET === 'your-secret-key');

try {
  const payload = jwt.verify(token, JWT_SECRET);
  console.log('Payload:', payload);
  console.log('Role:', payload.role);
  console.log('Role === "ADMIN":', payload.role === "ADMIN");
} catch (error) {
  console.error('Verification failed:', error.message);
}
