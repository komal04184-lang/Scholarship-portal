# ApexScholar Multi-Terminal Launcher
# Opens each microservice in its own PowerShell window

Write-Host "Launching ApexScholar Microservices in separate windows..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\api-gateway'; `$host.UI.RawUI.WindowTitle='API Gateway (3000)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\services\identity_student_service\backend'; `$host.UI.RawUI.WindowTitle='Identity Service (3001)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\services\scholarship-service'; `$host.UI.RawUI.WindowTitle='Scholarship Service (3002)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\services\application-service'; `$host.UI.RawUI.WindowTitle='Application Service (3003)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\services\review-service'; `$host.UI.RawUI.WindowTitle='Review Service (3004)'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\projects\scholarship\client'; `$host.UI.RawUI.WindowTitle='Client Frontend (5173)'; npm run dev"

Write-Host "All 6 services launched!" -ForegroundColor Green
Write-Host "Access the application at: http://localhost:5173" -ForegroundColor Yellow
Write-Host "API Gateway at: http://localhost:3000" -ForegroundColor Yellow
