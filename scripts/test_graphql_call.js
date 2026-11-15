const http = require('http');

const query = JSON.stringify({
  query: `query {
    scholarship(id: "1") {
      id
      name
      amount
      status
      min_cgpa
      max_income
      deadline
    }
  }`
});

const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(query),
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('GraphQL Result:', res.statusCode, JSON.parse(data)));
});
req.write(query);
req.end();
