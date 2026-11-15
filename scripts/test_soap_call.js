const http = require('http');

const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://apexscholar.local/soap/scholarship">
   <soapenv:Header/>
   <soapenv:Body>
      <sch:CheckEligibilityRequest>
         <sch:scholarshipId>1</sch:scholarshipId>
         <sch:cgpa>8.5</sch:cgpa>
         <sch:familyIncome>150000</sch:familyIncome>
      </sch:CheckEligibilityRequest>
   </soapenv:Body>
</soapenv:Envelope>`;

const req = http.request({
  hostname: 'localhost',
  port: 3002,
  path: '/soap/eligibility',
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    'Content-Length': Buffer.byteLength(xml),
  }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('SOAP Status:', res.statusCode, '\nBody:\n', data));
});
req.write(xml);
req.end();
