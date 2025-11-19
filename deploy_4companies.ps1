# 4개 회사 폴더 생성 스크립트
# PowerShell에서 실행: .\deploy_4companies.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  4개 회사 급여 시스템 폴더 생성" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 현재 위치 확인
$currentPath = Get-Location
Write-Host "현재 위치: $currentPath" -ForegroundColor Yellow
Write-Host ""

# 회사명 입력
Write-Host "4개 회사명을 입력하세요 (Enter로 구분):" -ForegroundColor Green
Write-Host ""

$company1 = Read-Host "회사 1"
$company2 = Read-Host "회사 2"
$company3 = Read-Host "회사 3"
$company4 = Read-Host "회사 4"

Write-Host ""
Write-Host "입력하신 회사명:" -ForegroundColor Yellow
Write-Host "  1. $company1"
Write-Host "  2. $company2"
Write-Host "  3. $company3"
Write-Host "  4. $company4"
Write-Host ""

$confirm = Read-Host "진행하시겠습니까? (Y/N)"
if ($confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host "취소되었습니다." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "폴더 생성 중..." -ForegroundColor Green

# MONEY 폴더가 있는지 확인
if (-not (Test-Path "MONEY")) {
    Write-Host "❌ 오류: MONEY 폴더를 찾을 수 없습니다!" -ForegroundColor Red
    Write-Host "이 스크립트를 MONEY 폴더가 있는 위치에서 실행하세요." -ForegroundColor Yellow
    exit
}

# 부모 디렉토리로 이동
cd ..

# 폴더 생성 함수
function Copy-CompanyFolder {
    param (
        [string]$companyName,
        [int]$number
    )

    $folderName = "PAYROLL_$companyName"

    if (Test-Path $folderName) {
        Write-Host "⚠️  '$folderName' 폴더가 이미 존재합니다. 건너뜁니다." -ForegroundColor Yellow
    } else {
        Copy-Item -Path "MONEY" -Destination $folderName -Recurse
        Write-Host "✅ $number. $folderName 생성 완료" -ForegroundColor Green
    }
}

# 4개 회사 폴더 생성
Copy-CompanyFolder -companyName $company1 -number 1
Copy-CompanyFolder -companyName $company2 -number 2
Copy-CompanyFolder -companyName $company3 -number 3
Copy-CompanyFolder -companyName $company4 -number 4

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  ✅ 폴더 생성 완료!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "다음 단계:" -ForegroundColor Yellow
Write-Host "  1. 각 폴더의 settings.html을 열어서 회사 정보 입력"
Write-Host "  2. 직원 등록 (salary-input.html)"
Write-Host "  3. 테스트 (TEST_CHECKLIST.md 참고)"
Write-Host ""

Write-Host "생성된 폴더:" -ForegroundColor Yellow
Write-Host "  📁 PAYROLL_$company1"
Write-Host "  📁 PAYROLL_$company2"
Write-Host "  📁 PAYROLL_$company3"
Write-Host "  📁 PAYROLL_$company4"
Write-Host ""

# 바탕화면 바로가기 생성 옵션
Write-Host "바탕화면에 바로가기를 생성하시겠습니까? (Y/N)" -ForegroundColor Green
$createShortcuts = Read-Host

if ($createShortcuts -eq "Y" -or $createShortcuts -eq "y") {
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shell = New-Object -ComObject WScript.Shell

    $folders = @(
        "PAYROLL_$company1",
        "PAYROLL_$company2",
        "PAYROLL_$company3",
        "PAYROLL_$company4"
    )

    foreach ($folder in $folders) {
        $targetPath = Join-Path -Path (Get-Location) -ChildPath "$folder\index.html"
        $shortcutPath = Join-Path -Path $desktop -ChildPath "급여관리_$folder.lnk"

        if (Test-Path $targetPath) {
            $shortcut = $shell.CreateShortcut($shortcutPath)
            $shortcut.TargetPath = $targetPath
            $shortcut.Save()
            Write-Host "✅ 바로가기 생성: 급여관리_$folder.lnk" -ForegroundColor Green
        }
    }

    Write-Host ""
    Write-Host "바탕화면에 4개의 바로가기가 생성되었습니다!" -ForegroundColor Green
}

Write-Host ""
Write-Host "완료! 성공적인 배포를 기원합니다! 🎉" -ForegroundColor Cyan
Write-Host ""
