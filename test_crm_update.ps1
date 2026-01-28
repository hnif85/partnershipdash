# PowerShell script untuk test update CRM fields
# Jalankan: .\test_crm_update.ps1

Write-Host "=== Testing CRM Field Updates ===" -ForegroundColor Green

# Test 1: Update partner 1 dengan notes dan progress
Write-Host "1. Updating Partner BUMN (ID: 1)..." -ForegroundColor Yellow
$body1 = @{
    notes = "Partner BUMN dengan Yayasan BUMN. Sudah ada komunikasi awal dengan Syaufan. Perlu di-follow up untuk program CSR."
    progressPercentage = 25
    priority = "medium"
    lastContactDate = "2026-01-15"
    expectedCompletionDate = "2026-03-15"
    updatedBy = "Mas Erik"
} | ConvertTo-Json

try {
    $response1 = Invoke-WebRequest -Uri "http://localhost:3000/api/partners/1" -Method PUT -Body $body1 -ContentType "application/json"
    Write-Host "✓ Success: $($response1.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Update partner 2 dengan high priority
Write-Host "2. Updating WPMI (ID: 2)..." -ForegroundColor Yellow
$body2 = @{
    notes = "WPMI - training 75 orang sudah disetujui. Kompak Tangsel visit sudah dijadwalkan 21 Januari."
    progressPercentage = 60
    priority = "high"
    lastContactDate = "2026-01-10"
    expectedCompletionDate = "2026-01-25"
    updatedBy = "Mas Dimas"
} | ConvertTo-Json

try {
    $response2 = Invoke-WebRequest -Uri "http://localhost:3000/api/partners/2" -Method PUT -Body $body2 -ContentType "application/json"
    Write-Host "✓ Success: $($response2.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Cek hasil update
Write-Host "3. Checking updated data for Partner 1..." -ForegroundColor Yellow
try {
    $checkResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/partners/1" -Method GET
    $partnerData = $checkResponse.Content | ConvertFrom-Json
    Write-Host "✓ Partner 1 Data:" -ForegroundColor Green
    Write-Host "  Notes: $($partnerData.notes)" -ForegroundColor White
    Write-Host "  Progress: $($partnerData.progressPercentage)%" -ForegroundColor White
    Write-Host "  Priority: $($partnerData.priority)" -ForegroundColor White
    Write-Host "  Last Contact: $($partnerData.lastContactDate)" -ForegroundColor White
    Write-Host "  Expected Completion: $($partnerData.expectedCompletionDate)" -ForegroundColor White
} catch {
    Write-Host "✗ Error checking data: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green
Write-Host "Silakan refresh halaman activity untuk melihat perubahan di CRM table!" -ForegroundColor Cyan
