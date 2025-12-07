// ==================== 엑셀 템플릿 다운로드/업로드 기능 ====================

// 엑셀 템플릿 다운로드 (v20251206)
function downloadEmployeeTemplate() {
    console.log('🔥 NEW VERSION - downloadEmployeeTemplate v20251206');
    alert('템플릿 v20251206 - Code 컬럼 포함!');

    // 템플릿 데이터 생성
    const ws_data = [
        [''],
        ['STAFF LIST'],
        [''],
        ['Code', 'Name', 'Birth Date', 'Hire Date', 'Department', 'Position', 'Basic Salary', 'Dependents', 'Annual Leave', 'Adjustment', 'Insurance Exempt'],
        ['KQ-001', 'Nguyễn Văn A', '1990-05-15', '2024-01-15', 'Production', 'Worker', 6980000, 2, 12, 0, 'No'],
        ['KQ-002', 'Trần Thị B', '1995-08-20', '2024-03-01', 'Office', 'Admin', 7200000, 1, 12, 0, 'No'],
        ['KQ-003', 'Lê Văn C', '1988-12-10', '2023-06-10', 'Production', 'Supervisor', 8000000, 0, 12, 5, 'Yes']
    ];

    console.log('Headers:', ws_data[3]);

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff List');

    // 파일 다운로드
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    XLSX.writeFile(wb, `STAFF_LIST_${year}_${month}.xlsx`);

    alert('✅ Template downloaded successfully!\n\nPlease fill in the template and upload it using "Upload Excel".');
}

// 엑셀 파일 불러오기
function loadEmployeeExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});

            // 첫 번째 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // JSON으로 변환 (blankrows: true로 빈 행도 포함)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false, blankrows: true});

            console.log('읽은 엑셀 데이터:', jsonData);
            console.log('총 행 수:', jsonData.length);
            console.log('각 행 출력:');
            jsonData.forEach((row, idx) => {
                console.log(`  [${idx}]:`, row);
            });

            // 헤더 확인 (Row 4, 0-indexed로 3)
            // Row 1: 빈 줄, Row 2: 제목, Row 3: 빈 줄, Row 4: 헤더
            const headers = jsonData[3];  // Row 4 (0-indexed 3)
            console.log('헤더:', headers);

            // 데이터 행 처리 (Row 5부터, 0-indexed로 4)
            let importCount = 0;
            let errorCount = 0;
            const errors = [];

            console.log('🔍 데이터 처리 시작: index 4부터 (Row 5)');
            for (let i = 4; i < jsonData.length; i++) {  // Row 5부터 (0-indexed 4)
                const row = jsonData[i];
                console.log(`\n📋 처리 중 [index ${i}] (Row ${i+1}):`, row);

                if (!row || row.length === 0) {
                    console.log(`  ⏭️  스킵: 빈 행`);
                    continue;
                }

                try {
                    // 컬럼 구조: Code, Name, Birth Date, Hire Date, Department, Position, Basic Salary, Dependents, Annual Leave, Adjustment, Insurance Exempt
                    const employeeCode = (row[0] || '').toString().trim();
                    const name = row[1];
                    console.log(`  🏷️ 코드: "${employeeCode}", 👤 이름: "${name}"`);
                    let birthDate = row[2];
                    let hireDate = row[3];
                    const department = row[4] || '';
                    const position = row[5] || '';
                    const basicSalary = parseInt(row[6]) || 6980000;
                    const dependents = parseInt(row[7]) || 0;
                    const annualLeavePerYear = parseInt(row[8]) || 12;
                    const annualLeaveAdjustment = parseInt(row[9]) || 0;
                    const insuranceExemptValue = (row[10] || 'No').toString().trim().toLowerCase();
                    const insuranceExempt = insuranceExemptValue === 'yes' || insuranceExemptValue === 'y' || insuranceExemptValue === '1';

                    if (!name) {
                        errors.push(`Row ${i+1}: Name is empty`);
                        errorCount++;
                        continue;
                    }

                    // 날짜 형식 처리 함수
                    const processDate = (dateValue) => {
                        if (!dateValue) return new Date().toISOString().split('T')[0];

                        // 숫자 또는 숫자 문자열 (엑셀 시리얼 번호)
                        const numValue = Number(dateValue);
                        if (!isNaN(numValue) && numValue > 30000 && numValue < 100000) {
                            // 엑셀 날짜 시리얼을 JavaScript Date로 변환
                            const excelEpoch = new Date(1899, 11, 30);
                            const date = new Date(excelEpoch.getTime() + numValue * 86400000);
                            return date.toISOString().split('T')[0];
                        } else if (typeof dateValue === 'string') {
                            // YYYY-MM-DD 형식으로 변환
                            const dateMatch = dateValue.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                            if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            }
                            // DD/MM/YYYY 또는 MM/DD/YYYY 형식 시도
                            const slashMatch = dateValue.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                            if (slashMatch) {
                                const [, a, b, year] = slashMatch;
                                // 일/월/년 형식으로 가정 (베트남식)
                                return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
                            }
                            return new Date().toISOString().split('T')[0];
                        }
                        return new Date().toISOString().split('T')[0];
                    };

                    birthDate = processDate(birthDate);
                    hireDate = processDate(hireDate);

                    // 기존 직원 중복 체크 (코드 우선, 없으면 이름으로)
                    let existingId = null;

                    // 1. 코드로 검색 (코드가 있는 경우)
                    if (employeeCode) {
                        for (const empId in employees) {
                            if (employees[empId].employeeCode &&
                                employees[empId].employeeCode.toLowerCase() === employeeCode.toLowerCase()) {
                                existingId = empId;
                                break;
                            }
                        }
                    }

                    // 2. 코드로 못 찾으면 이름으로 검색
                    if (!existingId) {
                        for (const empId in employees) {
                            if (employees[empId].name &&
                                employees[empId].name.toLowerCase().trim() === name.toLowerCase().trim()) {
                                existingId = empId;
                                break;
                            }
                        }
                    }

                    if (existingId) {
                        // 기존 직원 업데이트 (근태 데이터는 유지!)
                        if (employeeCode) employees[existingId].employeeCode = employeeCode;
                        employees[existingId].name = name;
                        employees[existingId].birthDate = birthDate;
                        employees[existingId].hireDate = hireDate;
                        employees[existingId].department = department;
                        employees[existingId].position = position;
                        employees[existingId].basicSalary = basicSalary;
                        employees[existingId].dependents = dependents;
                        employees[existingId].insuranceExempt = insuranceExempt;
                        employees[existingId].annualLeavePerYear = annualLeavePerYear;
                        employees[existingId].annualLeaveAdjustment = annualLeaveAdjustment;

                        importCount++;
                        console.log(`[${employeeCode}] ${name} 업데이트 (기존 직원)`);
                    } else {
                        // 새 직원 추가
                        const id = 'emp_' + Date.now() + '_' + i;

                        employees[id] = {
                            employeeId: id,
                            employeeCode: employeeCode,
                            name: name,
                            birthDate: birthDate,
                            hireDate: hireDate,
                            department: department,
                            position: position,
                            basicSalary: basicSalary,
                            dependents: dependents,
                            insuranceExempt: insuranceExempt,
                            annualLeavePerYear: annualLeavePerYear,
                            annualLeaveUsed: 0,
                            annualLeaveAdjustment: annualLeaveAdjustment,
                            holidays: [],
                            excusedAbsents: [],
                            absents: [],
                            annualLeaveDays: [],
                            overtimeData: {},
                            nightData: {},
                            sundayData: {},
                            normalHoursData: {}
                        };

                        importCount++;
                        console.log(`[${employeeCode}] ${name} 신규 추가`);
                    }

                } catch (err) {
                    errors.push(`Row ${i+1} error: ${err.message}`);
                    errorCount++;
                    console.error(`Row ${i+1} processing error:`, err);
                }
            }

            // 저장
            if (importCount > 0) {
                saveEmployeesToStorage();
                displayEmployeeList();

                let message = `✅ ${importCount}명의 직원을 불러왔습니다!`;
                if (errorCount > 0) {
                    message += `\n\n⚠️ ${errorCount}개 행에서 오류 발생:\n` + errors.slice(0, 5).join('\n');
                    if (errors.length > 5) {
                        message += `\n... 외 ${errors.length - 5}개`;
                    }
                }
                alert(message);
            } else {
                alert('❌ 불러온 직원이 없습니다.\n\n엑셀 파일 형식을 확인하세요.');
            }

        } catch (error) {
            console.error('엑셀 읽기 오류:', error);
            alert('❌ 엑셀 파일을 읽는 중 오류가 발생했습니다.\n\n' + error.message);
        }

        // 파일 입력 초기화
        event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
}

// 직원 목록을 엑셀로 다운로드 (현재 직원 데이터)
function downloadEmployeeData() {
    if (Object.keys(employees).length === 0) {
        alert('⚠️ No registered employees!');
        return;
    }

    // 제목 + 헤더 (영어)
    const ws_data = [
        [null, null, null, null, null, null, null, null, null, null, null],  // Row 1: 빈 줄 (모든 컬럼에 null)
        ['STAFF LIST', null, null, null, null, null, null, null, null, null, null],  // Row 2: 제목
        [null, null, null, null, null, null, null, null, null, null, null],  // Row 3: 빈 줄 (모든 컬럼에 null)
        ['Code', 'Name', 'Birth Date', 'Hire Date', 'Department', 'Position', 'Basic Salary', 'Dependents', 'Annual Leave', 'Adjustment', 'Insurance Exempt']  // Row 4: 헤더
    ];

    // 직원 데이터 추가 (Row 5부터)
    for (const id in employees) {
        const emp = employees[id];
        // 날짜를 텍스트로 강제 변환 (엑셀 시리얼 번호 방지)
        const birthDate = emp.birthDate ? String(emp.birthDate) : '';
        const hireDate = emp.hireDate ? String(emp.hireDate) : '';

        ws_data.push([
            emp.employeeCode || '',
            emp.name || '',
            birthDate,
            hireDate,
            emp.department || '',
            emp.position || '',
            emp.basicSalary || 0,
            emp.dependents || 0,
            emp.annualLeavePerYear || 12,
            emp.annualLeaveAdjustment || 0,
            emp.insuranceExempt ? 'Yes' : 'No'
        ]);
    }

    // 워크시트 생성 (스타일은 사용자가 Excel에서 직접 수정)
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff List');

    // 파일 다운로드
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `STAFF_LIST_${today}.xlsx`);

    alert(`✅ ${Object.keys(employees).length} employee data downloaded successfully!`);
}
