// ==================== DAILY-REPORT 연동 ====================
// DAILY-REPORT → MONEY 엑셀 불러오기

function importFromDailyReport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            // 첫 번째 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // JSON으로 변환
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

            console.log('📊 DAILY-REPORT 엑셀 데이터:', jsonData);

            if (jsonData.length < 2) {
                alert('❌ 엑셀 파일에 데이터가 없습니다!');
                return;
            }

            // 헤더 확인 (첫 번째 행)
            const headers = jsonData[0];
            console.log('📋 헤더:', headers);

            // 데이터 파싱 (두 번째 행부터)
            const importedData = {};
            let successCount = 0;
            let skipCount = 0;
            const processedEmployees = new Set();

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length < 7) {
                    console.log(`⏭️ 스킵: 빈 행 또는 데이터 부족 [${i}]`);
                    continue;
                }

                const date = row[0];              // 날짜 (YYYY-MM-DD)
                const moneyDateKey = row[1];      // MONEY용 날짜키 (YYYY-M-D)
                const employeeName = row[2];       // 직원명
                const totalHours = row[3];         // 총 근무시간
                const dayOfWeek = row[4];          // 요일
                const overtimeHours = row[5];      // 야근시간
                const sundayHours = row[6];        // 특근시간

                console.log(`🔍 [${i}] ${employeeName} | ${date} (${dayOfWeek}) | 총:${totalHours}h | 야근:${overtimeHours}h | 특근:${sundayHours}h`);

                // 직원 찾기 (이름으로 매칭)
                let employeeId = null;
                for (const id in employees) {
                    if (employees[id].name === employeeName) {
                        employeeId = id;
                        break;
                    }
                }

                if (!employeeId) {
                    console.log(`  ⚠️ 직원을 찾을 수 없음: ${employeeName}`);
                    skipCount++;
                    continue;
                }

                // 직원 데이터 초기화 (첫 번째 데이터인 경우)
                if (!importedData[employeeId]) {
                    importedData[employeeId] = {
                        name: employeeName,
                        overtimeData: {},
                        sundayData: {}
                    };
                }

                // 야근/특근 데이터 저장
                if (overtimeHours > 0) {
                    importedData[employeeId].overtimeData[moneyDateKey] = overtimeHours;
                }

                if (sundayHours > 0) {
                    importedData[employeeId].sundayData[moneyDateKey] = sundayHours;
                }

                processedEmployees.add(employeeName);
                successCount++;
            }

            if (successCount === 0) {
                alert('❌ 불러올 수 있는 데이터가 없습니다!\n\n직원 이름이 MONEY 프로그램에 등록되어 있는지 확인하세요.');
                return;
            }

            // 확인 메시지
            const employeeNames = Array.from(processedEmployees).join(', ');
            const confirmMsg = `📥 DAILY-REPORT 데이터를 불러옵니다.\n\n` +
                             `✅ 성공: ${successCount}건\n` +
                             `⚠️ 스킵: ${skipCount}건\n` +
                             `👥 대상 직원: ${employeeNames}\n\n` +
                             `기존 야근/특근 데이터에 추가됩니다.\n계속하시겠습니까?`;

            if (!confirm(confirmMsg)) {
                return;
            }

            // 데이터 적용
            Object.keys(importedData).forEach(employeeId => {
                const empData = importedData[employeeId];

                // 기존 데이터와 병합
                if (!employees[employeeId].overtimeData) {
                    employees[employeeId].overtimeData = {};
                }
                if (!employees[employeeId].sundayData) {
                    employees[employeeId].sundayData = {};
                }

                Object.assign(employees[employeeId].overtimeData, empData.overtimeData);
                Object.assign(employees[employeeId].sundayData, empData.sundayData);

                console.log(`✅ ${empData.name} 데이터 적용 완료`);
            });

            // 저장
            saveEmployeesToStorage();

            // 현재 선택된 직원이 업데이트된 경우 다시 로드
            if (currentEmployeeId && importedData[currentEmployeeId]) {
                loadEmployee(currentEmployeeId);
            }

            alert(`✅ DAILY-REPORT 데이터를 성공적으로 불러왔습니다!\n\n` +
                  `✅ ${successCount}건 적용\n` +
                  `⚠️ ${skipCount}건 스킵\n\n` +
                  `달력에서 확인하세요!`);

            // 파일 입력 초기화
            event.target.value = '';

        } catch (error) {
            console.error('❌ 엑셀 읽기 오류:', error);
            alert('❌ 엑셀 파일을 읽는 중 오류가 발생했습니다.\n\n' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}
