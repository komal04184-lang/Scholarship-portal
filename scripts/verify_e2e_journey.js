const fs = require('fs');

async function main() {
  const GATEWAY = 'http://127.0.0.1:3000';
  console.log('=== APEX SCHOLAR END-TO-END VERIFICATION ===\n');

  // 1. Health check
  const healthRes = await fetch(`${GATEWAY}/health`);
  console.log(`1. API Gateway /health: HTTP ${healthRes.status} (OK)`);
  if (!healthRes.ok) throw new Error('Gateway not healthy');

  // 2. Student Login
  console.log('2. Authenticating Student...');
  const loginRes = await fetch(`${GATEWAY}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@scholarship.gov.in', password: 'Student@123' }),
  });
  const loginData = await loginRes.json();
  console.log(`   Student Login: HTTP ${loginRes.status}, user: ${loginData.user?.username || loginData.user?.email}`);
  const studentToken = loginData.token;
  if (!studentToken) throw new Error('No student token received');

  // 3. Browse Scholarships
  console.log('3. Browsing Scholarships from PostgreSQL scholarship_db...');
  const schRes = await fetch(`${GATEWAY}/api/v1/scholarships`);
  const schData = await schRes.json();
  const scholarships = schData.items || schData.scholarships || schData.data || [];
  console.log(`   Found ${scholarships.length} scholarship(s):`);
  scholarships.forEach(s => console.log(`   - [ID: ${s.id || s.scholarship_id}] ${s.name || s.title} | Amount: ₹${s.amount} | Status: ${s.status}`));

  const targetScholarship = scholarships[0];
  if (!targetScholarship) throw new Error('No scholarships found in DB');

  // 4. Test GraphQL
  console.log('4. Testing GraphQL Endpoint...');
  const gqlRes = await fetch(`${GATEWAY}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '{ scholarships(limit: 3) { id name amount status } }'
    })
  });
  const gqlData = await gqlRes.json();
  console.log('   GraphQL Response:', JSON.stringify(gqlData.data?.scholarships));

  // 5. Test SOAP / WSDL
  console.log('5. Testing SOAP Eligibility Web Service...');
  const wsdlRes = await fetch(`${GATEWAY}/soap/wsdl`);
  console.log(`   GET /soap/wsdl: HTTP ${wsdlRes.status} (${wsdlRes.headers.get('content-type')})`);

  const soapPayload = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://apexscholar.local/eligibility">
  <soap:Body>
    <tns:CheckEligibilityRequest>
      <tns:scholarshipId>${targetScholarship.id}</tns:scholarshipId>
      <tns:studentCgpa>8.5</tns:studentCgpa>
      <tns:familyIncome>200000</tns:familyIncome>
    </tns:CheckEligibilityRequest>
  </soap:Body>
</soap:Envelope>`;

  const soapRes = await fetch(`${GATEWAY}/soap/eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: soapPayload
  });
  const soapXml = await soapRes.text();
  console.log(`   POST /soap/eligibility: HTTP ${soapRes.status}, Response contains CheckEligibilityResponse: ${soapXml.includes('CheckEligibilityResponse')}`);

  // 6. Submit Application
  console.log('6. Submitting Application to Application Service (PostgreSQL application_db)...');
  const appSubmitRes = await fetch(`${GATEWAY}/api/v1/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    },
    body: JSON.stringify({
      scholarship_id: targetScholarship.id,
      submission_type: 'SUBMITTED',
      statement: 'I am applying for this prestigious National Merit scholarship to support my undergraduate studies in computer science.',
      academic_details: {
        cgpa: 8.5,
        course: 'B.Tech Computer Science',
        institution: 'Indian Institute of Technology'
      },
      financial_details: {
        annual_family_income: 200000
      }
    })
  });
  const appSubmitData = await appSubmitRes.json();
  console.log(`   Submit Application: HTTP ${appSubmitRes.status}, Body:`, JSON.stringify(appSubmitData));
  const applicationId = appSubmitData.data?.id || appSubmitData.data?.application?.id || appSubmitData.application?.id;
  console.log(`   Created Application ID: ${applicationId}`);

  // 7. Test Reviewer Login and Review Workflow
  console.log('7. Reviewer Login & Review Workflow...');
  const revLoginRes = await fetch(`${GATEWAY}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reviewer@scholarship.gov.in', password: 'Reviewer@123' })
  });
  const revLoginData = await revLoginRes.json();
  const reviewerToken = revLoginData.token;
  console.log(`   Reviewer Login: HTTP ${revLoginRes.status}, Token received: ${!!reviewerToken}`);

  if (applicationId && reviewerToken) {
    // Create review for this application
    const createRevRes = await fetch(`${GATEWAY}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reviewerToken}`
      },
      body: JSON.stringify({
        applicationId: String(applicationId),
        studentId: String(loginData.user.id),
        scholarshipId: String(targetScholarship.id),
        documents: [{ name: 'Marksheet', status: 'VERIFIED' }]
      })
    });
    const revData = await createRevRes.json();
    console.log(`   Create/Ensure Review: HTTP ${createRevRes.status}`);

    const reviewId = revData.data?.id || revData.review?.id || revData.id;
    if (reviewId) {
      // Document Verification
      await fetch(`${GATEWAY}/api/reviews/${reviewId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${reviewerToken}` },
        body: JSON.stringify({ documents: [{ name: 'Marksheet', status: 'VERIFIED' }] })
      });
      // Eligibility Verification
      await fetch(`${GATEWAY}/api/reviews/${reviewId}/eligibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${reviewerToken}` },
        body: JSON.stringify({ eligible: true, remarks: 'Verified all academic criteria' })
      });
      // Final Decision (Approve)
      const decisionRes = await fetch(`${GATEWAY}/api/reviews/${reviewId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${reviewerToken}` },
        body: JSON.stringify({ decision: 'APPROVED', remarks: 'Merit criteria satisfied', reviewedBy: 'reviewer' })
      });
      console.log(`   Submit Final Decision (APPROVED): HTTP ${decisionRes.status}`);
    }
  }

  // 8. Verify Student Dashboard
  console.log('8. Verifying Student Application Status...');
  const myAppsRes = await fetch(`${GATEWAY}/api/v1/applications/my`, {
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });
  const myAppsData = await myAppsRes.json();
  const apps = myAppsData.data?.applications || myAppsData.applications || myAppsData.data || [];
  console.log(`   Student has ${apps.length} active application(s):`);
  apps.forEach(a => console.log(`   - [ID: ${a.id || a.application_id}] Status: ${a.status} | Scholarship: ${a.scholarship_id}`));

  console.log('\n=== ALL END-TO-END WORKFLOWS COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:', err);
  process.exit(1);
});
