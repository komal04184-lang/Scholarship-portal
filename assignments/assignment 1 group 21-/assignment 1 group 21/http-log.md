# HTTP Verification Logs

### Request 1:
**Command:**
```bash
curl -i http://localhost:3000/api/ping

### Response:
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 52

{
  "status": "alive",
  "timestamp": "2026-10-13T10:15:00.000Z"
}


### Request 2:
curl -i -X POST http://localhost:3000/api/students/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarav Sharma","email":"aarav@example.com","phone":"9876543210"}'

### Response:
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 104

{
  "message": "Student registered successfully",
  "student": {
    "student_id": 1,
    "name": "Aarav Sharma",
    "email": "aarav@example.com",
    "phone": "9876543210"
  }
}


### Request 3:
curl -i -X POST http://localhost:3000/api/eligibility/check \
  -H "Content-Type: application/json" \
  -d '{"scholarship_id": 1, "cgpa": 8.8, "annual_income": 400000}'

### Response:
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 78

{
  "scholarship_id": 1,
  "eligible": true,
  "reason": "Criteria matched"
}

### Request 4:
curl -i -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"student_id": 1, "scholarship_id": 1}'

### Response:
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 118

{
  "message": "Application submitted",
  "application": {
    "application_id": 1,
    "student_id": 1,
    "scholarship_id": 1,
    "status": "SUBMITTED",
    "submitted_at": "2026-10-13T10:18:00.000Z"
  }
}

### Request 5:
curl -i http://localhost:3000/api/non-existent-endpoint

### Response:
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
Content-Length: 30

{
  "error": "Endpoint not found"
}