// ==================== 엑셀 템플릿 다운로드/업로드 기능 ====================

// 엑셀 템플릿 다운로드
function downloadEmployeeTemplate() {
    // 템플릿 데이터 생성
    const ws_data = [
        ['이름', '입사일', '기본급', '부양가족', '연차발생', '연차조정'],
        ['Nguyễn Văn A', '2024-01-15', 6980000, 2, 12, 0],
        ['Trần Thị B', '2024-03-01', 7200000, 1, 12, 0],
        ['Lê Văn C', '2023-06-10', 8000000, 0, 12, 5]
    ];

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 20},  // 이름
        {wch: 15},  // 입사일
        {wch: 15},  // 기본급
        {wch: 12},  // 부양가족
        {wch: 12},  // 연차발생
        {wch: 12}   // 연차조정
    ];

    // 날짜 형식 설정 (B열 - 입사일)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const cell_address = XLSX.utils.encode_cell({r: R, c: 1}); // B열 (입사일)
        if (!ws[cell_address]) continue;
        ws[cell_address].t = 's'; // 문자열로 저장
        ws[cell_address].z = 'yyyy-mm-dd'; // 날짜 형식
    }

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '직원목록');

    // 파일 다운로드
    XLSX.writeFile(wb, 'employees_template.xlsx');

    alert('✅ 템플릿이 다운로드되었습니다!\n\n템플릿을 작성한 후 "엑셀 불러오기"로 업로드하세요.');
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

            // JSON으로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false});

            console.log('읽은 엑셀 데이터:', jsonData);

            // 헤더 확인 (첫 번째 행)
            const headers = jsonData[0];
            console.log('헤더:', headers);

            // 데이터 행 처리 (두 번째 행부터)
            let importCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                try {
                    const name = row[0];
                    let hireDate = row[1];
                    const basicSalary = parseInt(row[2]) || 6980000;
                    const dependents = parseInt(row[3]) || 0;
                    const annualLeavePerYear = parseInt(row[4]) || 12;
                    const annualLeaveAdjustment = parseInt(row[5]) || 0;

                    if (!name) {
                        errors.push(`${i+1}번째 행: 이름이 비어있습니다`);
                        errorCount++;
                        continue;
                    }

                    // 날짜 형식 처리
                    if (hireDate) {
                        // 엑셀 시리얼 날짜를 처리
                        if (typeof hireDate === 'number') {
                            // 엑셀 날짜 시리얼을 JavaScript Date로 변환
                            const excelEpoch = new Date(1899, 11, 30);
                            const date = new Date(excelEpoch.getTime() + hireDate * 86400000);
                            hireDate = date.toISOString().split('T')[0];
                        } else if (typeof hireDate === 'string') {
                            // 이미 문자열 형식이면 그대로 사용
                            // YYYY-MM-DD 형식으로 변환
                            const dateMatch = hireDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
                            if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                hireDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                                hireDate = new Date().toISOString().split('T')[0];
                            }
                        }
                    } else {
                        hireDate = new Date().toISOString().split('T')[0];
                    }

                    // 직원 ID 생성
                    const id = 'emp_' + Date.now() + '_' + i;

                    // 직원 데이터 생성 (모든 필수 필드 포함!)
                    employees[id] = {
                        employeeId: id,
                        name: name,
                        hireDate: hireDate,
                        basicSalary: basicSalary,
                        dependents: dependents,
                        annualLeavePerYear: annualLeavePerYear,
                        annualLeaveUsed: 0,  // ← 초기값 0
                        annualLeaveAdjustment: annualLeaveAdjustment,
                        holidays: [],  // ← 빈 배열
                        excusedAbsents: [],  // ← 빈 배열
                        absents: [],  // ← 빈 배열
                        annualLeaveDays: [],  // ← 빈 배열
                        overtimeData: {},  // ← 빈 객체
                        nightData: {},  // ← 빈 객체
                        sundayData: {},  // ← 빈 객체
                        normalHoursData: {}  // ← 빈 객체
                    };

                    importCount++;
                    console.log(`${name} 추가 완료 - 입사일: ${hireDate}`);

                } catch (err) {
                    errors.push(`${i+1}번째 행 오류: ${err.message}`);
                    errorCount++;
                    console.error(`${i+1}번째 행 처리 오류:`, err);
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
        alert('⚠️ 등록된 직원이 없습니다!');
        return;
    }

    // 헤더
    const ws_data = [
        ['이름', '입사일', '기본급', '부양가족', '연차발생', '연차조정']
    ];

    // 직원 데이터 추가
    for (const id in employees) {
        const emp = employees[id];
        ws_data.push([
            emp.name || '',
            emp.hireDate || '',
            emp.basicSalary || 0,
            emp.dependents || 0,
            emp.annualLeavePerYear || 12,
            emp.annualLeaveAdjustment || 0
        ]);
    }

    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // 컬럼 너비 설정
    ws['!cols'] = [
        {wch: 20},  // 이름
        {wch: 15},  // 입사일
        {wch: 15},  // 기본급
        {wch: 12},  // 부양가족
        {wch: 12},  // 연차발생
        {wch: 12}   // 연차조정
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '직원목록');

    // 파일 다운로드
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `employees_${today}.xlsx`);

    alert(`✅ ${Object.keys(employees).length}명의 직원 데이터가 다운로드되었습니다!`);
}
