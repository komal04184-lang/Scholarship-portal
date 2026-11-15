# API Demonstration Guide & Protocol Showcase
**ApexScholar — Online Scholarship Portal**  
**Course:** CS543 Web Services  

---

## 1. Overview of Multi-Protocol Demonstration
This guide contains ready-to-execute test commands showcasing **REST**, **SOAP/WSDL**, and **GraphQL** web services running on ApexScholar.

---

## 2. Protocol 1: RESTful Web Services

### Workflow A: Health Check & System Status
```bash
curl -s http://localhost:3000/health | jq .
```
**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json
```
**Expected Response:** HTTP 200 with service status and registered microservice routes.

---

### Workflow B: Student Login (Obtaining JWT & Session Cookies)
```bash
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.com","password":"Password@123"}' | jq .
```
**PowerShell:**
```powershell
$Login = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" -Method Post `
  -ContentType "application/json" `
  -Body '{"email":"student@demo.com","password":"Password@123"}'
$Token = $Login.data.token
```

---

### Workflow C: List Scholarships (REST)
```bash
curl -s http://localhost:3000/api/v1/scholarships | jq .
```
**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/scholarships" | ConvertTo-Json
```

---

## 3. Protocol 2: SOAP & WSDL Web Service

The SOAP web service provides inter-institutional eligibility verification according to a formal WSDL contract.

### Step 1: Retrieve WSDL Contract
```bash
curl -s http://localhost:3002/soap/wsdl
```
**PowerShell:**
```powershell
(Invoke-WebRequest -Uri "http://localhost:3002/soap/wsdl").Content
```

### Step 2: Invoke SOAP Eligibility Operation
```bash
curl -s -X POST http://localhost:3002/soap/eligibility \
  -H "Content-Type: text/xml; charset=utf-8" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://scholarship.portal/eligibility">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:CheckEligibilityRequest>
      <sch:scholarshipId>1</sch:scholarshipId>
      <sch:cgpa>8.5</sch:cgpa>
      <sch:family_income>250000</sch:family_income>
    </sch:CheckEligibilityRequest>
  </soapenv:Body>
</soapenv:Envelope>'
```

**PowerShell:**
```powershell
$soapXml = @"
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:sch="http://scholarship.portal/eligibility">
  <soapenv:Header/>
  <soapenv:Body>
    <sch:CheckEligibilityRequest>
      <sch:scholarshipId>1</sch:scholarshipId>
      <sch:cgpa>8.5</sch:cgpa>
      <sch:family_income>250000</sch:family_income>
    </sch:CheckEligibilityRequest>
  </soapenv:Body>
</soapenv:Envelope>
"@

Invoke-RestMethod -Uri "http://localhost:3002/soap/eligibility" -Method Post -ContentType "text/xml; charset=utf-8" -Body $soapXml
```

**Expected XML Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://apexscholar.local/eligibility">
  <soap:Body>
    <tns:CheckEligibilityResponse>
      <tns:eligible>true</tns:eligible>
      <tns:reason>Student meets all eligibility criteria</tns:reason>
      <tns:scholarshipId>1</tns:scholarshipId>
      <tns:checkedAt>2026-11-15T10:26:47.588Z</tns:checkedAt>
    </tns:CheckEligibilityResponse>
  </soap:Body>
</soap:Envelope>
```

---

## 4. Protocol 3: GraphQL Query Interface

The GraphQL endpoint allows client applications to retrieve custom scholarship catalog projections.

### Query 1: Query All Scholarships with Specific Fields
```bash
curl -s -X POST http://localhost:3002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { scholarships { id name amount status } }"}' | jq .
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/graphql" -Method Post -ContentType "application/json" `
  -Body '{"query": "query { scholarships { id name amount status } }"}' | ConvertTo-Json
```

### Query 2: Detailed Query for a Single Scholarship
```bash
curl -s -X POST http://localhost:3002/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { scholarship(id: \"1\") { id name min_cgpa max_income amount deadline status } }"}' | jq .
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3002/graphql" -Method Post -ContentType "application/json" `
  -Body '{"query": "query { scholarship(id: \"1\") { id name min_cgpa max_income amount deadline status } }"}' | ConvertTo-Json
```

**Expected GraphQL Response:**
```json
{
  "data": {
    "scholarship": {
      "id": "1",
      "name": "National Merit Scholarship",
      "min_cgpa": 6,
      "max_income": 250000,
      "amount": 25000,
      "deadline": "1798655400000",
      "status": "open"
    }
  }
}
```

---

## 5. Live Interactive Documentation (OpenAPI / Swagger)
Interactive Swagger UI instances are hosted at:
- **Identity Student Service:** `http://localhost:3001/api-docs/`
- **Scholarship Service:** `http://localhost:3002/api-docs/`
- **Application Service:** `http://localhost:3003/api-docs/`
- **Review Service:** `http://localhost:3004/api-docs/`
