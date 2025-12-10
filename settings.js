// ==================== 설정 페이지 JavaScript ====================

// 현재 관리 연도
let currentSettingsYear = new Date().getFullYear();

// 숫자 포맷팅 (회사 설정에 따라)
function formatNumber(num) {
    const rounded = Math.round(num);

    // 현재 회사 설정 가져오기
    const currentCompanyId = localStorage.getItem('currentCompanyId');
    const companyProfiles = JSON.parse(localStorage.getItem('companyProfiles') || '{}');
    const company = companyProfiles[currentCompanyId] || {};

    const numberFormat = company.numberFormat || 'comma';

    let locale;
    if (numberFormat === 'comma') {
        locale = 'en-US';  // 1,234,567
    } else if (numberFormat === 'dot') {
        locale = 'de-DE';  // 1.234.567
    } else {
        locale = 'fr-FR';  // 1 234 567
    }

    return new Intl.NumberFormat(locale).format(rounded);
}

// 초기화
function init() {
    console.log('=== init() 시작 ===');

    // 연도 드롭다운 생성 (2024 ~ 2030)
    const yearSelect = document.getElementById('settingsYear');
    const currentYear = new Date().getFullYear();
    for (let year = 2024; year <= 2030; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '년';
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    currentSettingsYear = currentYear;

    // 직원 데이터 불러오기
    const stored = localStorage.getItem('vietnamPayrollEmployees');
    if (stored) {
        employees = JSON.parse(stored);
    }

    // 현재 연도 설정 불러오기 (마이그레이션 포함)
    loadSettingsForYear(currentSettingsYear);
    console.log('설정 로드 완료, allowances:', companySettings.allowances);

    // UI 업데이트
    displayEmployeeList();
    loadSettingsToForm();
    renderAllowancesList();

    console.log('=== init() 완료 ===');
}

// 연도별 설정 불러오기
function loadSettingsForYear(year) {
    const storedSettings = localStorage.getItem(`vietnamPayrollSettings_${year}`);
    if (storedSettings) {
        companySettings = JSON.parse(storedSettings);
    } else {
        // 해당 연도 설정이 없으면 기본값 사용
        companySettings = {
            lunchMeal: 25000,
            dinnerMeal: 25000,
            weekdayLunchAuto: true,
            weekdayDinnerHours: 4,
            sundayLunchHours: 4,
            sundayDinnerHours: 12,
            annualLeaveLunchMeal: false,
            excusedAbsenceLunchMeal: false,
            sickLeaveLunchMeal: false,
            specialLeaveLunchMeal: false,
            attendanceBonus: 300000,
            transportBonus: 200000,
            riskBonus: 100000,
            employeeSocialRate: 8,
            employeeHealthRate: 1.5,
            employeeUnemployRate: 1,
            companySocialRate: 17.5,
            companyHealthRate: 3,
            companyUnemployRate: 1
        };
    }

    // 기존 데이터에 새 필드가 없으면 기본값 추가 (하위 호환성)
    if (companySettings.lunchMeal === undefined && companySettings.dailyMeal !== undefined) {
        // 기존 dailyMeal을 점심/저녁으로 동일하게 적용
        companySettings.lunchMeal = companySettings.dailyMeal;
        companySettings.dinnerMeal = companySettings.dailyMeal;
        console.log(`마이그레이션: dailyMeal ${companySettings.dailyMeal}đ → lunchMeal & dinnerMeal`);
    }
    if (companySettings.weekdayLunchAuto === undefined) {
        companySettings.weekdayLunchAuto = true;
    }
    if (companySettings.weekdayDinnerHours === undefined) {
        companySettings.weekdayDinnerHours = 4;
    }
    if (companySettings.sundayLunchHours === undefined) {
        companySettings.sundayLunchHours = 4;
    }
    if (companySettings.sundayDinnerHours === undefined) {
        companySettings.sundayDinnerHours = 12;
    }
    if (companySettings.annualLeaveLunchMeal === undefined) {
        companySettings.annualLeaveLunchMeal = false;
    }
    if (companySettings.excusedAbsenceLunchMeal === undefined) {
        companySettings.excusedAbsenceLunchMeal = false;
    }
    if (companySettings.sickLeaveLunchMeal === undefined) {
        companySettings.sickLeaveLunchMeal = false;
    }
    if (companySettings.specialLeaveLunchMeal === undefined) {
        companySettings.specialLeaveLunchMeal = false;
    }

    // 기존 수당을 새 시스템으로 마이그레이션 (최초 1회만)
    if (!companySettings.allowances) {
        console.log('마이그레이션 시작...');
        companySettings.allowances = [];

        // 개근수당
        if (companySettings.attendanceBonus) {
            companySettings.allowances.push({
                id: 'allowance_attendance',
                name: '개근수당',
                amount: companySettings.attendanceBonus,
                enabled: true,
                onAbsence: 'zero',
                onExcusedAbsence: 'proportional',
                onAnnualLeave: 'proportional',
                isTaxable: true,
                description: '출근율 100% 달성 시 지급'
            });
        }

        // 교통비
        if (companySettings.transportBonus) {
            companySettings.allowances.push({
                id: 'allowance_transport',
                name: '교통비',
                amount: companySettings.transportBonus,
                enabled: true,
                onAbsence: 'zero',
                onExcusedAbsence: 'proportional',
                onAnnualLeave: 'proportional',
                isTaxable: true,
                description: '교통비 지원'
            });
        }

        // 위험수당
        if (companySettings.riskBonus) {
            companySettings.allowances.push({
                id: 'allowance_risk',
                name: '위험수당',
                amount: companySettings.riskBonus,
                enabled: true,
                onAbsence: 'zero',
                onExcusedAbsence: 'proportional',
                onAnnualLeave: 'proportional',
                isTaxable: true,
                description: '위험 업무 수행 시 지급'
            });
        }

        // 마이그레이션 후 저장
        if (companySettings.allowances.length > 0) {
            console.log(`마이그레이션 완료: ${companySettings.allowances.length}개 수당`, companySettings.allowances);
            localStorage.setItem(`vietnamPayrollSettings_${year}`, JSON.stringify(companySettings));
        }
    } else {
        console.log(`기존 수당 ${companySettings.allowances.length}개 로드됨`);
    }

    // 기존 수당에 isTaxable, description 속성 추가 (하위 호환성)
    if (companySettings.allowances) {
        let updated = false;
        companySettings.allowances = companySettings.allowances.map(allowance => {
            if (allowance.isTaxable === undefined) {
                allowance.isTaxable = true;  // 기본값: 과세
                updated = true;
            }
            if (!allowance.description) {
                allowance.description = '';
                updated = true;
            }
            return allowance;
        });

        if (updated) {
            console.log('수당에 isTaxable/description 속성 추가 완료');
            localStorage.setItem(`vietnamPayrollSettings_${year}`, JSON.stringify(companySettings));
        }
    }
}

// 연도 변경
window.changeSettingsYear = function() {
    currentSettingsYear = parseInt(document.getElementById('settingsYear').value);
    console.log(`연도 변경: ${currentSettingsYear}`);

    loadSettingsForYear(currentSettingsYear);
    loadSettingsToForm();
    renderAllowancesList();
    updatePayrollInfo();

    console.log(`연도 변경 완료, allowances:`, companySettings.allowances);
}

// 탭 전환
window.switchTab = function(tabIndex) {
    // 모든 탭 비활성화
    document.querySelectorAll('.tab').forEach((tab, index) => {
        tab.classList.remove('active');
        document.getElementById(`tab${index}`).classList.remove('active');
    });

    // 선택한 탭 활성화
    document.querySelectorAll('.tab')[tabIndex].classList.add('active');
    document.getElementById(`tab${tabIndex}`).classList.add('active');

    // 급여 규정 탭(tab3) 선택 시 동적으로 설정값 업데이트
    if (tabIndex === 3) {
        updatePayrollInfo();
    }
}

// 급여 규정 탭의 설정값 동적 업데이트
function updatePayrollInfo() {
    // 연도 표시
    document.getElementById('ruleYear').textContent = currentSettingsYear + '년';

    // 보험료
    document.getElementById('info-emp-social').textContent = companySettings.employeeSocialRate || 8;
    document.getElementById('info-emp-health').textContent = companySettings.employeeHealthRate || 1.5;
    document.getElementById('info-emp-unemploy').textContent = companySettings.employeeUnemployRate || 1;

    const empTotal = (companySettings.employeeSocialRate || 8) +
                     (companySettings.employeeHealthRate || 1.5) +
                     (companySettings.employeeUnemployRate || 1);
    document.getElementById('info-emp-total').textContent = empTotal;
    document.getElementById('info-final-emp-total').textContent = empTotal;

    document.getElementById('info-comp-social').textContent = companySettings.companySocialRate || 17.5;
    document.getElementById('info-comp-health').textContent = companySettings.companyHealthRate || 3;
    document.getElementById('info-comp-unemploy').textContent = companySettings.companyUnemployRate || 1;

    const compTotal = (companySettings.companySocialRate || 17.5) +
                      (companySettings.companyHealthRate || 3) +
                      (companySettings.companyUnemployRate || 1);
    document.getElementById('info-comp-total').textContent = compTotal;

    // 식대
    document.getElementById('info-daily-meal').textContent = formatNumber(companySettings.lunchMeal || 25000);
    document.getElementById('info-dinner-meal').textContent = formatNumber(companySettings.dinnerMeal || 25000);
    document.getElementById('info-sunday-meal').textContent = formatNumber(companySettings.lunchMeal || 25000);
    document.getElementById('info-sunday-dinner-meal').textContent = formatNumber(companySettings.dinnerMeal || 25000);

    // 식대 지급 조건 시간
    document.getElementById('info-dinner-hours').textContent = companySettings.weekdayDinnerHours || 4;
    document.getElementById('info-sunday-lunch-hours').textContent = companySettings.sundayLunchHours || 4;
    document.getElementById('info-sunday-dinner-hours').textContent = companySettings.sundayDinnerHours || 12;

    // 식대 시간 표시
    const lunchTimeStart = companySettings.lunchTimeStart || '12:00';
    const lunchTimeEnd = companySettings.lunchTimeEnd || '13:00';
    const dinnerTimeStart = companySettings.dinnerTimeStart || '22:00';
    const dinnerTimeEnd = companySettings.dinnerTimeEnd || '23:00';

    const infoLunchTime = document.getElementById('info-lunch-time');
    const infoDinnerTime = document.getElementById('info-dinner-time');
    if (infoLunchTime) infoLunchTime.textContent = `${lunchTimeStart}~${lunchTimeEnd}`;
    if (infoDinnerTime) infoDinnerTime.textContent = `${dinnerTimeStart}~${dinnerTimeEnd}`;

    // 야간조 식대 조건 표시 (야간 설정 활성화 시만)
    const nightShiftMealInfo = document.getElementById('info-night-shift-meal');
    if (nightShiftMealInfo) {
        nightShiftMealInfo.style.display = companySettings.nightShiftEnabled ? 'block' : 'none';
    }

    // 동적 수당 목록 렌더링
    const allowancesContainer = document.getElementById('dynamicAllowancesInfo');
    if (allowancesContainer) {
        const allowances = companySettings.allowances || [];

        if (allowances.length === 0) {
            allowancesContainer.innerHTML = '<p style="color: #999;">등록된 수당이 없습니다. "수당 관리" 탭에서 수당을 추가하세요.</p>';
        } else {
            let html = '';
            allowances.forEach(allowance => {
                if (allowance.enabled) {  // 활성화된 수당만 표시
                    const absenceText = allowance.onAbsence === 'zero' ? '지급안함' :
                                       allowance.onAbsence === 'proportional' ? '비율지급' : '전액지급';
                    const excusedText = (allowance.onExcusedAbsence || 'proportional') === 'zero' ? '지급안함' :
                                       (allowance.onExcusedAbsence || 'proportional') === 'proportional' ? '비율지급' : '전액지급';
                    const leaveText = allowance.onAnnualLeave === 'zero' ? '지급안함' :
                                     allowance.onAnnualLeave === 'proportional' ? '비율지급' : '전액지급';

                    html += `<p style="margin-bottom: 8px;">▪ ${allowance.name}: <span style="color: #4caf50; font-weight: bold;">${formatNumber(allowance.amount)}</span>đ</p>`;
                    html += `<p style="margin-left: 20px; font-size: 0.9em; color: #999; margin-bottom: 10px;">※ 무단결근: ${absenceText} | 사유결근: ${excusedText} | 연차: ${leaveText}</p>`;
                }
            });

            if (html === '') {
                allowancesContainer.innerHTML = '<p style="color: #999;">활성화된 수당이 없습니다. "수당 관리" 탭에서 수당을 활성화하세요.</p>';
            } else {
                html += `<div class="info-box" style="border-color: #4caf50;">
                    💡 각 수당별로 설정된 규칙에 따라 지급됩니다. "수당 관리" 탭에서 추가/수정/삭제 가능합니다.
                </div>`;
                allowancesContainer.innerHTML = html;
            }
        }
    }
}

// 직원 목록 표시 (이벤트 위임 패턴 사용)
function displayEmployeeList() {
    console.log('=== displayEmployeeList 호출 ===');
    console.log('현재 employees:', employees);

    const listEl = document.getElementById('employeeList');
    if (!listEl) {
        console.error('❌ employeeList 요소를 찾을 수 없습니다!');
        return;
    }

    // 리스트 초기화
    listEl.innerHTML = '';

    // 직원이 없는 경우
    if (!employees || Object.keys(employees).length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #999; padding: 60px; font-size: 1.2em;">등록된 직원이 없습니다.<br><br>위의 "➕ 직원 추가" 버튼을 클릭하세요.</div>';
        console.log('직원이 없음');
        return;
    }

    // 각 직원 카드 생성 (코드순 정렬)
    const sortedEmployeeIds = Object.keys(employees).sort((a, b) => {
        const codeA = employees[a].employeeCode || '';
        const codeB = employees[b].employeeCode || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
    });

    let cardCount = 0;
    for (const empId of sortedEmployeeIds) {
        const emp = employees[empId];
        console.log(`📝 직원 카드 생성 [${cardCount + 1}]:`, empId, emp.name);

        // 연차 계산 (보험 미가입자는 연차 없음)
        let leaveInfo = '';
        if (!emp.insuranceExempt) {
            const annualLeaveTotal = emp.annualLeavePerYear || 12;
            const annualLeaveAdjustment = emp.annualLeaveAdjustment || 0;
            const annualLeaveAvailable = annualLeaveTotal + annualLeaveAdjustment;

            leaveInfo = `🌴 연차: ${annualLeaveTotal}일/년`;
            if (annualLeaveAdjustment !== 0) {
                leaveInfo += ` (조정: ${annualLeaveAdjustment > 0 ? '+' : ''}${annualLeaveAdjustment}일, 사용가능: ${annualLeaveAvailable}일)`;
            }
        } else {
            leaveInfo = `🏥 보험미가입 (연차 해당없음)`;
        }

        // 카드 HTML 생성 (inline onclick 사용)
        const codeDisplay = emp.employeeCode ? `<span style="color: #ff9800; font-weight: bold;">[${emp.employeeCode}]</span> ` : '';
        const cardHTML = `
            <div class="employee-item" draggable="false">
                <div class="employee-info" draggable="false">
                    <div class="employee-name" draggable="false">${codeDisplay}👤 ${emp.name}</div>
                    <div class="employee-details" draggable="false">
                        📅 입사일: ${emp.hireDate || '미등록'} |
                        💰 기본급: ${formatNumber(emp.basicSalary)}đ |
                        👨‍👩‍👧‍👦 부양가족: ${emp.dependents || 0}명 |
                        ${leaveInfo}
                    </div>
                </div>
                <div class="employee-actions">
                    <button class="btn btn-info" onclick="window.viewEmployeeDetail('${empId}')" style="background: linear-gradient(135deg, #00bcd4 0%, #0097a7 100%);">👁️ 상세보기</button>
                    <button class="btn btn-edit" onclick="window.handleEditEmployee('${empId}')">✏️ 수정</button>
                    <button class="btn btn-delete" onclick="window.handleDeleteEmployee('${empId}')">🗑️ 삭제</button>
                </div>
            </div>
        `;

        listEl.insertAdjacentHTML('beforeend', cardHTML);
        cardCount++;
    }

    console.log(`✅ 총 ${cardCount}명의 직원 카드 생성 완료`);
}

// 현재 편집 중인 직원 ID (추가 시 null, 수정 시 직원 ID)
let editingEmployeeId = null;

// 테스트 함수 (브라우저 콘솔에서 테스트용)
window.testButtons = function() {
    console.log('=== 버튼 테스트 시작 ===');
    console.log('employees:', employees);
    console.log('handleEditEmployee 함수:', typeof window.handleEditEmployee);
    console.log('handleDeleteEmployee 함수:', typeof window.handleDeleteEmployee);

    if (Object.keys(employees).length > 0) {
        const firstId = Object.keys(employees)[0];
        console.log('첫 번째 직원 ID:', firstId);
        console.log('테스트 호출: window.handleEditEmployee("' + firstId + '")');
    } else {
        console.log('직원이 없습니다!');
    }
};

// 수정 버튼 핸들러 (window에 노출)
window.handleEditEmployee = function(employeeId) {
    console.log('✏️ handleEditEmployee 호출:', employeeId);

    if (!employees || !employees[employeeId]) {
        alert('⚠️ 직원 정보를 찾을 수 없습니다!');
        console.error('직원 ID를 찾을 수 없음:', employeeId);
        return;
    }

    const emp = employees[employeeId];
    editingEmployeeId = employeeId;

    // 모달 제목 변경
    document.getElementById('modalTitle').textContent = '✏️ 직원 정보 수정';

    // 폼에 기존 데이터 채우기
    document.getElementById('modalEmployeeCode').value = emp.employeeCode || '';
    document.getElementById('modalEmployeeName').value = emp.name;
    document.getElementById('modalBirthDate').value = emp.birthDate || '';
    document.getElementById('modalHireDate').value = emp.hireDate || new Date().toISOString().split('T')[0];
    document.getElementById('modalDepartment').value = emp.department || '';
    document.getElementById('modalPosition').value = emp.position || '';
    document.getElementById('modalBasicSalary').value = emp.basicSalary;
    document.getElementById('modalDependents').value = emp.dependents || 0;
    document.getElementById('modalAnnualLeavePerYear').value = emp.annualLeavePerYear || 12;
    document.getElementById('modalAnnualLeaveAdjustment').value = emp.annualLeaveAdjustment || 0;
    document.getElementById('modalInsuranceExempt').checked = emp.insuranceExempt || false;

    // 모달 열기 + body 스크롤 막기
    document.getElementById('employeeModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('modalEmployeeName').focus();

    console.log('✅ 수정 모달 열림:', emp.name);
}

// 삭제 버튼 핸들러 (window에 노출)
window.handleDeleteEmployee = function(employeeId) {
    console.log('🗑️ handleDeleteEmployee 호출:', employeeId);

    if (!employees || !employees[employeeId]) {
        alert('⚠️ 직원 정보를 찾을 수 없습니다!');
        console.error('직원 ID를 찾을 수 없음:', employeeId);
        return;
    }

    const emp = employees[employeeId];
    if (confirm(`⚠️ ${emp.name} 직원을 삭제하시겠습니까?\n\n• 직원 정보\n• 출퇴근 데이터\n• 급여 이력\n\n모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`)) {

        // 1. 직원 삭제
        delete employees[employeeId];
        saveEmployeesToStorage();

        // 2. 급여 이력에서 해당 직원 제거
        cleanupEmployeeFromPayrollHistory(employeeId);

        // 3. 출퇴근 데이터에서 해당 직원 제거
        cleanupEmployeeAttendanceData(employeeId);

        displayEmployeeList();
        alert('✅ 삭제되었습니다!\n\n관련 급여/출퇴근 데이터도 정리되었습니다.');
        console.log('✅ 직원 삭제 완료:', emp.name);
    } else {
        console.log('❌ 삭제 취소됨');
    }
}

// 급여 이력에서 직원 데이터 제거
function cleanupEmployeeFromPayrollHistory(employeeId) {
    // 모든 월별 급여 이력 확인
    const historyList = JSON.parse(localStorage.getItem('payrollHistoryList') || '[]');

    historyList.forEach(item => {
        const historyKey = `payrollHistory_${item.year}_${item.month}`;
        const confirmKey = `payrollConfirmed_${item.year}_${item.month}`;

        // 이력 데이터에서 제거
        let historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');
        if (historyData.data && Array.isArray(historyData.data)) {
            historyData.data = historyData.data.filter(d => d.employeeId !== employeeId && d.id !== employeeId);
        }
        if (historyData.confirmedEmployees && Array.isArray(historyData.confirmedEmployees)) {
            historyData.confirmedEmployees = historyData.confirmedEmployees.filter(id => id !== employeeId);
        }

        // 빈 데이터면 삭제, 아니면 업데이트
        if (!historyData.data || historyData.data.length === 0) {
            localStorage.removeItem(historyKey);
        } else {
            localStorage.setItem(historyKey, JSON.stringify(historyData));
        }

        // 확정 목록에서도 제거
        let confirmedList = JSON.parse(localStorage.getItem(confirmKey) || '[]');
        confirmedList = confirmedList.filter(id => id !== employeeId);
        if (confirmedList.length === 0) {
            localStorage.removeItem(confirmKey);
        } else {
            localStorage.setItem(confirmKey, JSON.stringify(confirmedList));
        }
    });

    console.log('✅ 급여 이력에서 직원 데이터 정리 완료:', employeeId);
}

// 출퇴근 데이터에서 직원 데이터 제거
function cleanupEmployeeAttendanceData(employeeId) {
    // localStorage에서 해당 직원의 출퇴근 관련 키 찾아서 삭제
    const keysToCheck = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.startsWith(`attendance_${employeeId}`) ||
            key.startsWith(`nightShiftDays_${employeeId}`) ||
            key.startsWith(`leaveDays_${employeeId}`)
        )) {
            keysToCheck.push(key);
        }
    }

    keysToCheck.forEach(key => {
        localStorage.removeItem(key);
    });

    console.log('✅ 출퇴근 데이터 정리 완료:', keysToCheck.length, '개 항목 삭제');
}

// 직원 추가 모달 열기
window.addEmployee = function() {
    editingEmployeeId = null;
    document.getElementById('modalTitle').textContent = '✨ 새 직원 추가';

    // 폼 초기화
    document.getElementById('modalEmployeeCode').value = '';
    document.getElementById('modalEmployeeName').value = '';
    document.getElementById('modalBirthDate').value = '';
    document.getElementById('modalHireDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalDepartment').value = '';
    document.getElementById('modalPosition').value = '';
    document.getElementById('modalBasicSalary').value = '6980000';
    document.getElementById('modalDependents').value = '0';
    document.getElementById('modalAnnualLeavePerYear').value = '12';
    document.getElementById('modalAnnualLeaveAdjustment').value = '0';

    // 모달 열기 + body 스크롤 막기
    document.getElementById('employeeModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('modalEmployeeName').focus();
}

// 직원 모달 닫기
window.closeEmployeeModal = function() {
    document.getElementById('employeeModal').style.display = 'none';
    document.body.style.overflow = 'auto';  // body 스크롤 복원
    editingEmployeeId = null;
}

// 직원 상세 정보 보기
window.viewEmployeeDetail = function(employeeId) {
    if (!employees || !employees[employeeId]) {
        alert('⚠️ 직원 정보를 찾을 수 없습니다!');
        return;
    }

    const emp = employees[employeeId];
    const detailContent = document.getElementById('employeeDetailContent');

    // 연차 계산 (보험 미가입자는 연차 없음)
    let annualLeaveSection = '';
    if (!emp.insuranceExempt) {
        const annualLeaveTotal = emp.annualLeavePerYear || 12;
        const annualLeaveAdjustment = emp.annualLeaveAdjustment || 0;
        const annualLeaveAvailable = annualLeaveTotal + annualLeaveAdjustment;

        annualLeaveSection = `
        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 20px; border-radius: 15px; border-left: 5px solid #4caf50;">
            <h3 style="margin: 0 0 15px 0; color: #388e3c; font-size: 1.3em;">🌴 연차 정보</h3>
            <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">연간 발생:</span>
                    <span style="color: #333;">${annualLeaveTotal}일</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">조정:</span>
                    <span style="color: ${annualLeaveAdjustment >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold;">${annualLeaveAdjustment > 0 ? '+' : ''}${annualLeaveAdjustment}일</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 8px;">
                    <span style="font-weight: bold; color: #388e3c;">사용 가능:</span>
                    <span style="color: #388e3c; font-weight: bold; font-size: 1.2em;">${annualLeaveAvailable}일</span>
                </div>
            </div>
        </div>`;
    } else {
        annualLeaveSection = `
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 15px; border-left: 5px solid #2196f3;">
            <h3 style="margin: 0 0 15px 0; color: #1976d2; font-size: 1.3em;">🏥 보험/연차 상태</h3>
            <div style="padding: 15px; background: rgba(33, 150, 243, 0.1); border-radius: 8px; text-align: center;">
                <span style="color: #1976d2; font-weight: bold; font-size: 1.1em;">사회보험 미가입자 (연차 해당없음)</span>
            </div>
        </div>`;
    }

    // 상세 정보 HTML
    detailContent.innerHTML = `
        <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px; border-radius: 15px; border-left: 5px solid #00bcd4;">
            <h3 style="margin: 0 0 15px 0; color: #0097a7; font-size: 1.3em;">👤 기본 정보</h3>
            <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">직원코드:</span>
                    <span style="color: #ff9800; font-weight: bold;">${emp.employeeCode || '미등록'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">이름:</span>
                    <span style="color: #333;">${emp.name}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">생년월일:</span>
                    <span style="color: #333;">${emp.birthDate || '미등록'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">입사일:</span>
                    <span style="color: #333;">${emp.hireDate || '미등록'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">부서:</span>
                    <span style="color: #333;">${emp.department || '미등록'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">직책:</span>
                    <span style="color: #333;">${emp.position || '미등록'}</span>
                </div>
            </div>
        </div>

        <div style="background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 20px; border-radius: 15px; border-left: 5px solid #9c27b0;">
            <h3 style="margin: 0 0 15px 0; color: #7b1fa2; font-size: 1.3em;">💰 급여 정보</h3>
            <div style="display: grid; gap: 12px;">
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                    <span style="font-weight: bold; color: #555;">기본급:</span>
                    <span style="color: #333; font-weight: bold;">${formatNumber(emp.basicSalary)}đ</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                    <span style="font-weight: bold; color: #555;">부양가족:</span>
                    <span style="color: #333;">${emp.dependents || 0}명</span>
                </div>
            </div>
        </div>

        ${annualLeaveSection}
    `;

    // 모달 열기
    document.getElementById('employeeDetailModal').style.display = 'flex';
}

// 직원 상세 모달 닫기
window.closeEmployeeDetailModal = function() {
    document.getElementById('employeeDetailModal').style.display = 'none';
}

// 모달에서 직원 저장
window.saveEmployeeFromModal = function() {
    const employeeCode = document.getElementById('modalEmployeeCode').value.trim().toUpperCase();
    const name = document.getElementById('modalEmployeeName').value.trim();
    if (!name) {
        alert('⚠️ 직원 이름을 입력하세요!');
        document.getElementById('modalEmployeeName').focus();
        return;
    }

    // 중복 체크 (코드와 이름)
    for (const empId in employees) {
        // 수정 모드일 때 자기 자신은 제외
        if (editingEmployeeId && empId === editingEmployeeId) continue;

        const emp = employees[empId];

        // 코드 중복 체크 (코드가 입력된 경우만)
        if (employeeCode && emp.employeeCode &&
            emp.employeeCode.toLowerCase() === employeeCode.toLowerCase()) {
            alert(`⚠️ 이미 사용 중인 직원 코드입니다!\n\n코드: ${employeeCode}\n기존 직원: ${emp.name}`);
            document.getElementById('modalEmployeeCode').focus();
            return;
        }

        // 이름 중복 체크
        if (emp.name && emp.name.toLowerCase().trim() === name.toLowerCase().trim()) {
            alert(`⚠️ 동일한 이름의 직원이 이미 존재합니다!\n\n이름: ${name}\n기존 코드: ${emp.employeeCode || '없음'}`);
            document.getElementById('modalEmployeeName').focus();
            return;
        }
    }

    const birthDate = document.getElementById('modalBirthDate').value || '';
    const hireDate = document.getElementById('modalHireDate').value;
    const department = document.getElementById('modalDepartment').value.trim() || '';
    const position = document.getElementById('modalPosition').value.trim() || '';
    const basicSalary = parseFloat(document.getElementById('modalBasicSalary').value) || 6980000;
    const dependents = parseInt(document.getElementById('modalDependents').value) || 0;
    const annualLeavePerYear = parseInt(document.getElementById('modalAnnualLeavePerYear').value) || 12;
    const annualLeaveAdjustment = parseInt(document.getElementById('modalAnnualLeaveAdjustment').value) || 0;
    const insuranceExempt = document.getElementById('modalInsuranceExempt').checked || false;

    if (editingEmployeeId) {
        // 수정 모드
        const emp = employees[editingEmployeeId];
        emp.employeeCode = employeeCode;
        emp.name = name;
        emp.birthDate = birthDate;
        emp.hireDate = hireDate;
        emp.department = department;
        emp.position = position;
        emp.basicSalary = basicSalary;
        emp.dependents = dependents;
        emp.annualLeavePerYear = annualLeavePerYear;
        emp.annualLeaveAdjustment = annualLeaveAdjustment;
        emp.insuranceExempt = insuranceExempt;

        saveEmployeesToStorage();
        displayEmployeeList();
        closeEmployeeModal();

        const availableLeave = annualLeavePerYear + annualLeaveAdjustment;
        alert(`✅ ${name} 직원 정보가 수정되었습니다!\n\n실제 사용 가능 연차: ${availableLeave}일`);
    } else {
        // 추가 모드
        const id = 'emp_' + Date.now();
        employees[id] = {
            employeeCode: employeeCode,
            name: name,
            birthDate: birthDate,
            hireDate: hireDate,
            department: department,
            position: position,
            basicSalary: basicSalary,
            dependents: dependents,
            insuranceExempt: insuranceExempt,
            // dailyMeal은 더 이상 직원별로 저장하지 않음 (회사 설정의 lunchMeal/dinnerMeal 사용)
            annualLeavePerYear: annualLeavePerYear,
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

        saveEmployeesToStorage();
        displayEmployeeList();
        closeEmployeeModal();

        const availableLeave = annualLeavePerYear + annualLeaveAdjustment;
        alert(`✅ ${name} 직원이 추가되었습니다!\n\n실제 사용 가능 연차: ${availableLeave}일`);
    }
}

// 설정을 폼에 로드
function loadSettingsToForm() {
    // 식대 설정
    const lunchMealEl = document.getElementById('settingLunchMeal');
    const dinnerMealEl = document.getElementById('settingDinnerMeal');
    const weekdayLunchAutoEl = document.getElementById('settingWeekdayLunchAuto');
    const weekdayDinnerHoursEl = document.getElementById('settingWeekdayDinnerHours');
    const sundayLunchHoursEl = document.getElementById('settingSundayLunchHours');
    const sundayDinnerHoursEl = document.getElementById('settingSundayDinnerHours');
    const annualLeaveLunchMealEl = document.getElementById('settingAnnualLeaveLunchMeal');
    const sickLeaveLunchMealEl = document.getElementById('settingSickLeaveLunchMeal');
    const specialLeaveLunchMealEl = document.getElementById('settingSpecialLeaveLunchMeal');
    const excusedAbsenceLunchMealEl = document.getElementById('settingExcusedAbsenceLunchMeal');
    const nightShiftEnabledEl = document.getElementById('settingNightShiftEnabled');
    const nightNormalHoursEl = document.getElementById('settingNightNormalHours');
    const nightNightHoursEl = document.getElementById('settingNightNightHours');
    const nightOTRateEl = document.getElementById('settingNightOTRate');
    const nightShiftTimeSettingsEl = document.getElementById('nightShiftTimeSettings');

    if (lunchMealEl) lunchMealEl.value = companySettings.lunchMeal || 25000;
    if (dinnerMealEl) dinnerMealEl.value = companySettings.dinnerMeal || 25000;

    // 식대 시간 설정
    const lunchTimeStartEl = document.getElementById('settingLunchTimeStart');
    const lunchTimeEndEl = document.getElementById('settingLunchTimeEnd');
    const dinnerTimeStartEl = document.getElementById('settingDinnerTimeStart');
    const dinnerTimeEndEl = document.getElementById('settingDinnerTimeEnd');

    if (lunchTimeStartEl) lunchTimeStartEl.value = companySettings.lunchTimeStart || '12:00';
    if (lunchTimeEndEl) lunchTimeEndEl.value = companySettings.lunchTimeEnd || '13:00';
    if (dinnerTimeStartEl) dinnerTimeStartEl.value = companySettings.dinnerTimeStart || '22:00';
    if (dinnerTimeEndEl) dinnerTimeEndEl.value = companySettings.dinnerTimeEnd || '23:00';
    if (weekdayLunchAutoEl) weekdayLunchAutoEl.checked = companySettings.weekdayLunchAuto !== false;
    if (weekdayDinnerHoursEl) weekdayDinnerHoursEl.value = companySettings.weekdayDinnerHours || 4;
    if (sundayLunchHoursEl) sundayLunchHoursEl.value = companySettings.sundayLunchHours || 4;
    if (sundayDinnerHoursEl) sundayDinnerHoursEl.value = companySettings.sundayDinnerHours || 12;
    if (annualLeaveLunchMealEl) annualLeaveLunchMealEl.checked = companySettings.annualLeaveLunchMeal === true;
    if (sickLeaveLunchMealEl) sickLeaveLunchMealEl.checked = companySettings.sickLeaveLunchMeal === true;
    if (specialLeaveLunchMealEl) specialLeaveLunchMealEl.checked = companySettings.specialLeaveLunchMeal === true;
    if (excusedAbsenceLunchMealEl) excusedAbsenceLunchMealEl.checked = companySettings.excusedAbsenceLunchMeal === true;
    if (nightShiftEnabledEl) nightShiftEnabledEl.checked = companySettings.nightShiftEnabled === true;
    if (nightNormalHoursEl) nightNormalHoursEl.value = companySettings.nightNormalHours || 4.5;
    if (nightNightHoursEl) nightNightHoursEl.value = companySettings.nightNightHours || 3.5;
    if (nightOTRateEl) nightOTRateEl.value = companySettings.nightOTRate || 2.0;

    // 야간OT 비율 표시 업데이트
    const nightOTRateDisplay = document.getElementById('nightOTRateDisplay');
    if (nightOTRateDisplay) {
        nightOTRateDisplay.textContent = Math.round((companySettings.nightOTRate || 2.0) * 100);
    }

    // 야간OT 비율 변경 시 표시 업데이트
    if (nightOTRateEl) {
        nightOTRateEl.addEventListener('change', function() {
            if (nightOTRateDisplay) {
                nightOTRateDisplay.textContent = Math.round(parseFloat(this.value) * 100);
            }
        });
    }

    // 야간 설정 체크 상태에 따라 시간 설정 표시/숨기기
    if (nightShiftTimeSettingsEl) {
        nightShiftTimeSettingsEl.style.display = companySettings.nightShiftEnabled ? 'block' : 'none';
    }

    // 야간 체크박스 변경 시 시간 설정 표시/숨기기
    if (nightShiftEnabledEl) {
        nightShiftEnabledEl.addEventListener('change', function() {
            if (nightShiftTimeSettingsEl) {
                nightShiftTimeSettingsEl.style.display = this.checked ? 'block' : 'none';
            }
        });
    }

    // 기존 수당 필드는 동적 수당 시스템으로 대체되어 제거됨
    // (attendanceBonus, transportBonus, riskBonus는 allowances 배열에서 관리)

    // 보험료율 설정
    const empSocialEl = document.getElementById('settingEmployeeSocial');
    const empHealthEl = document.getElementById('settingEmployeeHealth');
    const empUnemployEl = document.getElementById('settingEmployeeUnemploy');
    const compSocialEl = document.getElementById('settingCompanySocial');
    const compHealthEl = document.getElementById('settingCompanyHealth');
    const compUnemployEl = document.getElementById('settingCompanyUnemploy');

    if (empSocialEl) empSocialEl.value = companySettings.employeeSocialRate || 8;
    if (empHealthEl) empHealthEl.value = companySettings.employeeHealthRate || 1.5;
    if (empUnemployEl) empUnemployEl.value = companySettings.employeeUnemployRate || 1;
    if (compSocialEl) compSocialEl.value = companySettings.companySocialRate || 17.5;
    if (compHealthEl) compHealthEl.value = companySettings.companyHealthRate || 3;
    if (compUnemployEl) compUnemployEl.value = companySettings.companyUnemployRate || 1;

    // 보험료율 합계 업데이트
    if (typeof updateInsuranceTotals === 'function') {
        updateInsuranceTotals();
    }
}

// 설정 저장
window.saveSettings = function() {
    // 기존 allowances 배열 보존
    const existingAllowances = companySettings.allowances || [];

    // 식대 설정
    const lunchMealEl = document.getElementById('settingLunchMeal');
    const dinnerMealEl = document.getElementById('settingDinnerMeal');
    const weekdayLunchAutoEl = document.getElementById('settingWeekdayLunchAuto');
    const weekdayDinnerHoursEl = document.getElementById('settingWeekdayDinnerHours');
    const sundayLunchHoursEl = document.getElementById('settingSundayLunchHours');
    const sundayDinnerHoursEl = document.getElementById('settingSundayDinnerHours');
    const annualLeaveLunchMealEl = document.getElementById('settingAnnualLeaveLunchMeal');
    const sickLeaveLunchMealEl = document.getElementById('settingSickLeaveLunchMeal');
    const specialLeaveLunchMealEl = document.getElementById('settingSpecialLeaveLunchMeal');
    const excusedAbsenceLunchMealEl = document.getElementById('settingExcusedAbsenceLunchMeal');
    const nightShiftEnabledEl = document.getElementById('settingNightShiftEnabled');
    const nightNormalHoursEl = document.getElementById('settingNightNormalHours');
    const nightNightHoursEl = document.getElementById('settingNightNightHours');

    if (lunchMealEl) companySettings.lunchMeal = parseFloat(lunchMealEl.value) || 25000;
    if (dinnerMealEl) companySettings.dinnerMeal = parseFloat(dinnerMealEl.value) || 25000;

    // 식대 시간 설정
    const lunchTimeStartEl = document.getElementById('settingLunchTimeStart');
    const lunchTimeEndEl = document.getElementById('settingLunchTimeEnd');
    const dinnerTimeStartEl = document.getElementById('settingDinnerTimeStart');
    const dinnerTimeEndEl = document.getElementById('settingDinnerTimeEnd');

    if (lunchTimeStartEl) companySettings.lunchTimeStart = lunchTimeStartEl.value || '12:00';
    if (lunchTimeEndEl) companySettings.lunchTimeEnd = lunchTimeEndEl.value || '13:00';
    if (dinnerTimeStartEl) companySettings.dinnerTimeStart = dinnerTimeStartEl.value || '22:00';
    if (dinnerTimeEndEl) companySettings.dinnerTimeEnd = dinnerTimeEndEl.value || '23:00';
    if (weekdayLunchAutoEl) companySettings.weekdayLunchAuto = weekdayLunchAutoEl.checked;
    if (weekdayDinnerHoursEl) companySettings.weekdayDinnerHours = parseFloat(weekdayDinnerHoursEl.value) || 4;
    if (sundayLunchHoursEl) companySettings.sundayLunchHours = parseFloat(sundayLunchHoursEl.value) || 4;
    if (sundayDinnerHoursEl) companySettings.sundayDinnerHours = parseFloat(sundayDinnerHoursEl.value) || 12;
    if (annualLeaveLunchMealEl) companySettings.annualLeaveLunchMeal = annualLeaveLunchMealEl.checked;
    if (excusedAbsenceLunchMealEl) companySettings.excusedAbsenceLunchMeal = excusedAbsenceLunchMealEl.checked;
    if (sickLeaveLunchMealEl) companySettings.sickLeaveLunchMeal = sickLeaveLunchMealEl.checked;
    if (specialLeaveLunchMealEl) companySettings.specialLeaveLunchMeal = specialLeaveLunchMealEl.checked;
    if (nightShiftEnabledEl) companySettings.nightShiftEnabled = nightShiftEnabledEl.checked;
    if (nightNormalHoursEl) companySettings.nightNormalHours = parseFloat(nightNormalHoursEl.value) || 4.5;
    if (nightNightHoursEl) companySettings.nightNightHours = parseFloat(nightNightHoursEl.value) || 3.5;

    // 야간OT 비율 저장
    const nightOTRateEl = document.getElementById('settingNightOTRate');
    if (nightOTRateEl) companySettings.nightOTRate = parseFloat(nightOTRateEl.value) || 2.0;

    // 보험료율 설정
    const empSocialEl = document.getElementById('settingEmployeeSocial');
    const empHealthEl = document.getElementById('settingEmployeeHealth');
    const empUnemployEl = document.getElementById('settingEmployeeUnemploy');
    const compSocialEl = document.getElementById('settingCompanySocial');
    const compHealthEl = document.getElementById('settingCompanyHealth');
    const compUnemployEl = document.getElementById('settingCompanyUnemploy');

    if (empSocialEl) companySettings.employeeSocialRate = parseFloat(empSocialEl.value) || 8;
    if (empHealthEl) companySettings.employeeHealthRate = parseFloat(empHealthEl.value) || 1.5;
    if (empUnemployEl) companySettings.employeeUnemployRate = parseFloat(empUnemployEl.value) || 1;
    if (compSocialEl) companySettings.companySocialRate = parseFloat(compSocialEl.value) || 17.5;
    if (compHealthEl) companySettings.companyHealthRate = parseFloat(compHealthEl.value) || 3;
    if (compUnemployEl) companySettings.companyUnemployRate = parseFloat(compUnemployEl.value) || 1;

    // 기존 수당 필드는 동적 수당 시스템으로 대체되어 더 이상 사용 안 함
    // (attendanceBonus, transportBonus, riskBonus는 allowances 배열에서 관리)

    // allowances 배열 복원 (덮어쓰지 않음!)
    companySettings.allowances = existingAllowances;

    // 연도별로 저장
    const storageKey = `vietnamPayrollSettings_${currentSettingsYear}`;
    const settingsJson = JSON.stringify(companySettings);
    
    console.log('==========================================');
    console.log('💾 설정 저장 시작');
    console.log('==========================================');
    console.log('📅 연도:', currentSettingsYear);
    console.log('🔑 localStorage 키:', storageKey);
    console.log('📦 저장할 데이터 (처음 200자):', settingsJson.substring(0, 200));
    
    localStorage.setItem(storageKey, settingsJson);
    
    // 저장 확인
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        console.log('✅ localStorage에 저장 완료!');
        console.log('🔍 저장된 데이터 확인 (처음 200자):', savedData.substring(0, 200));
    } else {
        console.error('❌ localStorage 저장 실패!');
    }
    console.log('==========================================');

    // 급여 규정 탭의 값도 업데이트
    updatePayrollInfo();

    alert(`✅ ${currentSettingsYear}년 설정이 저장되었습니다!`);
}

// 공휴일 프리셋 적용
window.applyHolidayPreset = function(preset) {
    if (preset === 'vietnam2025') {
        // 2025년 베트남 공휴일 (YYYY-MM-DD 형식)
        const vietnamHolidays = [
            '2025-01-01',   // 신정
            '2025-01-28',  // 설날 연휴
            '2025-01-29',  // 설날
            '2025-01-30',  // 설날 연휴
            '2025-01-31',  // 설날 연휴
            '2025-04-30',  // 통일기념일
            '2025-05-01',   // 노동절
            '2025-09-02',   // 국경일
        ];

        // 모든 직원에게 공휴일 추가
        let updatedCount = 0;
        for (const id in employees) {
            const emp = employees[id];
            const holidaySet = new Set(emp.holidays || []);

            for (const dateStr of vietnamHolidays) {
                holidaySet.add(dateStr);
            }

            emp.holidays = Array.from(holidaySet);
            updatedCount++;
        }

        saveEmployeesToStorage();
        alert(`✅ 베트남 2025년 공휴일이 적용되었습니다!\n\n${updatedCount}명의 직원에게 ${vietnamHolidays.length}개의 공휴일이 추가되었습니다.`);
    }
}

// 공휴일 초기화
window.clearAllHolidays = function() {
    if (confirm('⚠️ 모든 직원의 공휴일 설정을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
        let clearedCount = 0;
        for (const id in employees) {
            employees[id].holidays = [];
            clearedCount++;
        }

        saveEmployeesToStorage();
        alert(`✅ ${clearedCount}명의 직원 공휴일이 초기화되었습니다!`);
    }
}

// ==================== 수당 관리 시스템 ====================

// 현재 수정 중인 수당 ID
let editingAllowanceId = null;

// 수당 목록 렌더링
function renderAllowancesList() {
    const container = document.getElementById('allowancesList');

    // DOM이 준비되지 않았으면 종료
    if (!container) {
        console.warn('allowancesList container not found');
        return;
    }

    const allowances = companySettings.allowances || [];

    if (allowances.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">등록된 수당이 없습니다. "➕ 수당 추가" 버튼을 클릭하세요.</p>';
        return;
    }

    container.innerHTML = allowances.map(allowance => {
        const statusColor = allowance.enabled ? '#4caf50' : '#999';
        const statusText = allowance.enabled ? 'ON' : 'OFF';

        const absenceText = allowance.onAbsence === 'zero' ? '❌ 지급안함' :
                           allowance.onAbsence === 'proportional' ? '📊 비율지급' : '✅ 전액지급';
        const excusedAbsenceText = (allowance.onExcusedAbsence || 'proportional') === 'zero' ? '❌ 지급안함' :
                                  (allowance.onExcusedAbsence || 'proportional') === 'proportional' ? '📊 비율지급' : '✅ 전액지급';
        const leaveText = allowance.onAnnualLeave === 'zero' ? '❌ 지급안함' :
                         allowance.onAnnualLeave === 'proportional' ? '📊 비율지급' : '✅ 전액지급';

        return `
            <div style="border: 2px solid ${allowance.enabled ? '#ddd' : '#e0e0e0'}; border-radius: 12px; padding: 20px; background: ${allowance.enabled ? 'white' : '#f9f9f9'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: bold;">${statusText}</span>
                            <h4 style="margin: 0; font-size: 1.3em; color: #333;">${allowance.name}</h4>
                        </div>
                        <p style="font-size: 1.4em; font-weight: bold; color: #667eea; margin: 0;">${formatNumber(allowance.amount)}đ</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editAllowance('${allowance.id}')" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">수정</button>
                        <button onclick="deleteAllowance('${allowance.id}')" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">삭제</button>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 0.9em; color: #666;">
                    <div>
                        <span style="font-weight: bold;">무단결근:</span> ${absenceText}
                    </div>
                    <div>
                        <span style="font-weight: bold;">사유결근:</span> ${excusedAbsenceText}
                    </div>
                    <div>
                        <span style="font-weight: bold;">연차사용:</span> ${leaveText}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 수당 추가 모달 열기
window.openAllowanceModal = function(allowanceId = null) {
    editingAllowanceId = allowanceId;
    const modal = document.getElementById('allowanceModal');

    if (allowanceId) {
        // 수정 모드
        const allowances = companySettings.allowances || [];
        const allowance = allowances.find(a => a.id === allowanceId);

        if (allowance) {
            document.getElementById('allowanceModalTitle').textContent = '✏️ 수당 수정';
            document.getElementById('allowanceName').value = allowance.name;
            document.getElementById('allowanceAmount').value = allowance.amount;
            document.getElementById('allowanceOnAbsence').value = allowance.onAbsence;
            document.getElementById('allowanceOnExcusedAbsence').value = allowance.onExcusedAbsence || 'proportional';
            document.getElementById('allowanceOnAnnualLeave').value = allowance.onAnnualLeave;
            document.getElementById('allowanceEnabled').checked = allowance.enabled;

            if (document.getElementById('allowanceIsTaxable')) {
                document.getElementById('allowanceIsTaxable').checked = allowance.isTaxable !== false;
            }
            if (document.getElementById('allowanceDescription')) {
                document.getElementById('allowanceDescription').value = allowance.description || '';
            }
        }
    } else {
        // 추가 모드
        document.getElementById('allowanceModalTitle').textContent = '➕ 수당 추가';
        document.getElementById('allowanceName').value = '';
        document.getElementById('allowanceAmount').value = '';
        document.getElementById('allowanceOnAbsence').value = 'zero';
        document.getElementById('allowanceOnExcusedAbsence').value = 'proportional';
        document.getElementById('allowanceOnAnnualLeave').value = 'proportional';
        document.getElementById('allowanceEnabled').checked = true;

        if (document.getElementById('allowanceIsTaxable')) {
            document.getElementById('allowanceIsTaxable').checked = true;
        }
        if (document.getElementById('allowanceDescription')) {
            document.getElementById('allowanceDescription').value = '';
        }
    }

    modal.style.display = 'flex';
}

// 수당 수정
window.editAllowance = function(allowanceId) {
    openAllowanceModal(allowanceId);
}

// 수당 모달 닫기
window.closeAllowanceModal = function() {
    document.getElementById('allowanceModal').style.display = 'none';
    editingAllowanceId = null;
}

// 수당 저장
window.saveAllowance = function() {
    const name = document.getElementById('allowanceName').value.trim();
    const amount = parseFloat(document.getElementById('allowanceAmount').value);
    const onAbsence = document.getElementById('allowanceOnAbsence').value;
    const onExcusedAbsence = document.getElementById('allowanceOnExcusedAbsence').value;
    const onAnnualLeave = document.getElementById('allowanceOnAnnualLeave').value;
    const enabled = document.getElementById('allowanceEnabled').checked;
    const isTaxable = document.getElementById('allowanceIsTaxable') ?
                      document.getElementById('allowanceIsTaxable').checked : true;
    const description = document.getElementById('allowanceDescription') ?
                        document.getElementById('allowanceDescription').value.trim() : '';

    if (!name) {
        alert('⚠️ 수당 이름을 입력하세요!');
        return;
    }

    if (!amount || amount <= 0) {
        alert('⚠️ 유효한 금액을 입력하세요!');
        return;
    }

    if (!companySettings.allowances) {
        companySettings.allowances = [];
    }

    if (editingAllowanceId) {
        // 수정
        const index = companySettings.allowances.findIndex(a => a.id === editingAllowanceId);
        if (index !== -1) {
            companySettings.allowances[index] = {
                ...companySettings.allowances[index],
                name,
                amount,
                onAbsence,
                onExcusedAbsence,
                onAnnualLeave,
                enabled,
                isTaxable,
                description
            };
            console.log('수당 수정됨:', companySettings.allowances[index]);
        }
    } else {
        // 추가
        const newAllowance = {
            id: 'allowance_' + Date.now(),
            name,
            amount,
            onAbsence,
            onExcusedAbsence,
            onAnnualLeave,
            enabled,
            isTaxable,
            description
        };
        companySettings.allowances.push(newAllowance);
        console.log('수당 추가됨:', newAllowance);
    }

    // 저장
    localStorage.setItem(`vietnamPayrollSettings_${currentSettingsYear}`, JSON.stringify(companySettings));
    console.log('localStorage에 저장됨, 전체 수당:', companySettings.allowances);

    // UI 업데이트
    renderAllowancesList();
    updatePayrollInfo();  // 급여 규정 탭도 업데이트
    closeAllowanceModal();

    alert(`✅ ${name} 수당이 ${editingAllowanceId ? '수정' : '추가'}되었습니다!`);
}

// 수당 삭제
window.deleteAllowance = function(allowanceId) {
    const allowances = companySettings.allowances || [];
    const allowance = allowances.find(a => a.id === allowanceId);

    if (!allowance) return;

    if (confirm(`⚠️ "${allowance.name}" 수당을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
        companySettings.allowances = allowances.filter(a => a.id !== allowanceId);
        console.log('수당 삭제됨:', allowance.name, '남은 수당:', companySettings.allowances.length);

        // 저장
        localStorage.setItem(`vietnamPayrollSettings_${currentSettingsYear}`, JSON.stringify(companySettings));

        // UI 업데이트
        renderAllowancesList();
        updatePayrollInfo();  // 급여 규정 탭도 업데이트

        alert(`✅ "${allowance.name}" 수당이 삭제되었습니다!`);
    }
}

// ==================== 수당 관리 시스템 끝 ====================

// 직원 엑셀 템플릿 다운로드
window.downloadEmployeeTemplate = function() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Staff Information (제목 + 영어 헤더 + Code 컬럼 포함)
    const empData = [
        [''],  // Row 1: 빈 줄
        ['STAFF LIST'],  // Row 2: 제목
        [''],  // Row 3: 빈 줄
        ['Code', 'Name', 'Birth Date', 'Hire Date', 'Department', 'Position', 'Basic Salary', 'Dependents', 'Annual Leave', 'Adjustment', 'Insurance Exempt'],  // Row 4: 헤더
        ['KQ-001', 'Nguyễn Văn A', '1990-05-15', '2024-01-15', 'Production', 'Worker', 6980000, 2, 12, 0, 'No'],  // Row 5: 샘플 데이터
        ['KQ-002', 'Trần Thị B', '1995-08-20', '2024-03-01', 'Office', 'Admin', 7200000, 1, 12, 0, 'No'],
        ['KQ-003', 'Lê Văn C', '1988-12-10', '2023-06-10', 'Production', 'Supervisor', 8000000, 0, 12, 5, 'Yes']
    ];
    // 워크시트 생성 (스타일은 사용자가 Excel에서 직접 수정)
    const ws1 = XLSX.utils.aoa_to_sheet(empData);

    // 디버깅: 생성된 워크시트 확인
    console.log('📝 템플릿 생성 데이터:', empData);
    console.log('📝 생성된 워크시트 범위:', ws1['!ref']);
    const testJson = XLSX.utils.sheet_to_json(ws1, {header: 1, blankrows: true});
    console.log('📝 읽기 테스트:', testJson);

    XLSX.utils.book_append_sheet(wb, ws1, 'Staff List');

    // Sheet 2: User Guide
    const guideData = [
        ['Vietnam Payroll System - Employee Template'],
        [''],
        ['How to Use:'],
        ['1. Fill in employee information in the "Staff List" sheet'],
        ['2. Save the file and upload using "Upload Excel" button'],
        ['3. Employee data will be automatically registered in the system'],
        [''],
        ['Column Description:'],
        ['- Code: Employee code (e.g., KQ-001) - Used for duplicate check'],
        ['- Name: Required field'],
        ['- Birth Date: YYYY-MM-DD format (e.g., 1990-05-15)'],
        ['- Hire Date: YYYY-MM-DD format (e.g., 2024-01-15)'],
        ['- Department: Employee department (optional)'],
        ['- Position: Job position (optional)'],
        ['- Basic Salary: Monthly basic salary (VND)'],
        ['- Dependents: Number of dependents for tax calculation (excluding self)'],
        ['- Annual Leave: Annual leave days per year (usually 12 days)'],
        ['- Adjustment: Positive=extra days, Negative=already used (e.g., -3 = used 3 days)'],
        ['- Insurance Exempt: Yes/No - Social insurance exemption (for daily workers, short-term contracts)'],
        [''],
        ['Note: Name is required. Other fields will use default values if left empty.']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(guideData);
    XLSX.utils.book_append_sheet(wb, ws2, 'User Guide');

    // 파일 다운로드
    const currentDate = new Date();
    const fileName = `STAFF_LIST_${currentDate.getFullYear()}_${String(currentDate.getMonth()+1).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert('✅ Template downloaded successfully!\n\nPlease fill in the template and upload using "Upload Excel".');
}

// 직원 엑셀 불러오기
window.loadEmployeeExcel = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array', cellDates: true});

            // 직원기본정보 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1, raw: false, blankrows: true});

            console.log('📊 엑셀 데이터:', jsonData);
            console.log('📏 총 행 수:', jsonData.length);

            // 날짜 형식 처리 함수
            const processDate = (dateValue) => {
                if (!dateValue) return '';  // 빈 값은 빈 문자열 반환

                const str = dateValue.toString().trim();
                if (!str) return '';

                // 1. 엑셀 시리얼 번호 (30000~100000)
                const numValue = Number(str);
                if (!isNaN(numValue) && numValue > 30000 && numValue < 100000) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const date = new Date(excelEpoch.getTime() + numValue * 86400000);
                    return date.toISOString().split('T')[0];
                }

                // 2. YYYY-MM-DD 형식
                const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
                if (isoMatch) {
                    const [, year, month, day] = isoMatch;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                // 3. MM/DD/YY 또는 MM/DD/YYYY 형식 (미국식)
                const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (slashMatch) {
                    let [, month, day, year] = slashMatch;
                    // 2자리 연도 처리: 50 이상이면 1900년대, 미만이면 2000년대
                    if (year.length === 2) {
                        const yearNum = parseInt(year);
                        year = yearNum >= 50 ? '19' + year : '20' + year;
                    }
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                // 4. DD-MM-YYYY 형식
                const dashMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
                if (dashMatch) {
                    const [, day, month, year] = dashMatch;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }

                console.log(`⚠️ 날짜 파싱 실패: "${str}"`);
                return '';  // 파싱 실패시 빈 문자열
            };

            // 스마트 헤더 감지 및 데이터 시작 위치 찾기
            console.log('📋 전체 데이터:', jsonData);

            // 코드 패턴 체크 함수
            const isCodePattern = (val) => {
                const str = (val || '').toString().trim();
                return /^[A-Z]{1,5}[-_]?\d{1,5}$/i.test(str) ||
                       (str.length <= 10 && /^[A-Z0-9]+-\d+$/i.test(str));
            };

            // 헤더/제목 키워드 체크 함수
            const isHeaderKeyword = (val) => {
                const str = (val || '').toString().trim().toLowerCase();
                return ['code', 'name', '코드', '이름', 'birth', 'hire', 'department', 'position', 'salary',
                        'staff list', 'staff', 'employee', 'employees', '직원', '직원목록', '명단'].includes(str);
            };

            // 데이터 시작 행 찾기 (코드 패턴이 있는 첫 번째 행)
            let dataStartIndex = -1;
            let headerIndex = -1;

            for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const firstCell = (row[0] || '').toString().trim();
                const secondCell = (row[1] || '').toString().trim();

                console.log(`📋 [${i}] 분석: "${firstCell}", "${secondCell}"`);

                // 헤더 행인지 확인
                if (isHeaderKeyword(firstCell) || isHeaderKeyword(secondCell)) {
                    headerIndex = i;
                    console.log(`   → 헤더 행 발견!`);
                    continue;
                }

                // 데이터 행인지 확인:
                // 1. 코드 패턴(KQ-XXX)이 첫 셀에 있거나
                // 2. 최소 5개 이상 셀이 있고, 제목/헤더가 아닌 경우
                const filledCells = row.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
                const looksLikeData = isCodePattern(firstCell) ||
                                      (filledCells >= 5 && !isHeaderKeyword(firstCell) && !isHeaderKeyword(secondCell));

                if (looksLikeData) {
                    if (dataStartIndex === -1) {
                        dataStartIndex = i;
                        console.log(`   → 데이터 시작 행 발견! (셀 수: ${filledCells})`);
                    }
                }
            }

            // 데이터 시작 위치 결정
            if (dataStartIndex === -1) dataStartIndex = 4;  // 기본값
            console.log(`📋 최종: 헤더=${headerIndex}, 데이터시작=${dataStartIndex}`);

            // 첫 데이터 행 분석
            const firstDataRow = jsonData[dataStartIndex] || [];
            const firstCell = (firstDataRow[0] || '').toString().trim();
            const hasCodeColumn = isCodePattern(firstCell);

            console.log(`📋 첫 데이터 행:`, firstDataRow);
            console.log(`📋 Code 컬럼 감지: ${hasCodeColumn ? 'YES' : 'NO'} (첫 셀: "${firstCell}")`);

            // 컬럼 인덱스 설정
            const COL = hasCodeColumn ? {
                CODE: 0, NAME: 1, BIRTH: 2, HIRE: 3, DEPT: 4, POSITION: 5,
                SALARY: 6, DEPENDENTS: 7, LEAVE: 8, ADJ: 9, EXEMPT: 10
            } : {
                CODE: -1, NAME: 0, BIRTH: 1, HIRE: 2, DEPT: 3, POSITION: 4,
                SALARY: 5, DEPENDENTS: 6, LEAVE: 7, ADJ: 8, EXEMPT: 9
            };

            let importCount = 0;
            let updateCount = 0;

            for (let i = dataStartIndex; i < jsonData.length; i++) {  // 감지된 시작 위치부터
                const row = jsonData[i];
                console.log(`🔍 [${i}] 처리 중:`, row);

                if (!row || row.length === 0) {
                    console.log(`  ⏭️ 스킵: 빈 행`);
                    continue;
                }

                // 컬럼 인덱스에 따라 데이터 읽기
                console.log(`  📊 Raw row data:`, row);
                console.log(`  📊 COL indices:`, COL);

                const employeeCode = COL.CODE >= 0 ? (row[COL.CODE] || '').toString().trim() : '';
                const name = (row[COL.NAME] || '').toString().trim();

                console.log(`  📊 Code=[${COL.CODE}]="${employeeCode}", Name=[${COL.NAME}]="${name}"`);

                if (!name) {
                    console.log(`  ⏭️ 스킵: 이름 없음`);
                    continue;
                }

                const rawBirth = row[COL.BIRTH];
                const rawHire = row[COL.HIRE];
                const birthDate = processDate(rawBirth);
                const hireDate = processDate(rawHire);

                console.log(`  📊 Birth: raw=[${COL.BIRTH}]="${rawBirth}" → "${birthDate}"`);
                console.log(`  📊 Hire: raw=[${COL.HIRE}]="${rawHire}" → "${hireDate}"`);

                const department = row[COL.DEPT] || '';
                const position = row[COL.POSITION] || '';
                const basicSalary = parseInt(row[COL.SALARY]) || 6980000;
                const dependents = parseInt(row[COL.DEPENDENTS]) || 0;
                const annualLeavePerYear = parseInt(row[COL.LEAVE]) || 12;
                const annualLeaveAdjustment = parseInt(row[COL.ADJ]) || 0;
                const insuranceExemptValue = (row[COL.EXEMPT] || 'No').toString().trim().toLowerCase();
                const insuranceExempt = insuranceExemptValue === 'yes' || insuranceExemptValue === 'y' || insuranceExemptValue === '1';

                console.log(`  📊 Dept="${department}", Position="${position}", Salary=${basicSalary}, Dep=${dependents}`);

                // 기존 직원 중복 체크 (코드 우선, 없으면 이름으로)
                let existingId = null;

                // 1. 코드로 검색 (코드가 있는 경우)
                if (employeeCode) {
                    for (const empId in employees) {
                        if (employees[empId].employeeCode &&
                            employees[empId].employeeCode.toLowerCase() === employeeCode.toLowerCase()) {
                            existingId = empId;
                            console.log(`  🔗 코드로 매칭: ${employeeCode}`);
                            break;
                        }
                    }
                }

                // 2. 코드로 못 찾으면 이름으로 검색
                if (!existingId) {
                    for (const empId in employees) {
                        if (employees[empId].name &&
                            employees[empId].name.toLowerCase().trim() === name.toLowerCase()) {
                            existingId = empId;
                            console.log(`  🔗 이름으로 매칭: ${name}`);
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

                    updateCount++;
                    console.log(`  ✅ 업데이트: [${employeeCode}] ${name}`);
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
                    console.log(`  ✅ 신규 추가: [${employeeCode}] ${name}`);
                }
            }

            saveEmployeesToStorage();
            displayEmployeeList();

            let message = '';
            if (updateCount > 0 && importCount > 0) {
                message = `✅ ${updateCount}명 업데이트, ${importCount}명 신규 추가!`;
            } else if (updateCount > 0) {
                message = `✅ ${updateCount}명의 직원 정보를 업데이트했습니다!`;
            } else if (importCount > 0) {
                message = `✅ ${importCount}명의 직원을 신규 추가했습니다!`;
            } else {
                message = '⚠️ 불러온 직원이 없습니다.';
            }
            alert(message);

        } catch (error) {
            console.error('엑셀 읽기 오류:', error);
            alert('⚠️ Excel 파일 읽기 오류: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);

    // 파일 선택 초기화
    event.target.value = '';
}

// 페이지 로드시 초기화
window.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded - settings.js 로드됨 ===');
    console.log('✅ window.switchTab:', typeof window.switchTab);
    console.log('✅ window.addEmployee:', typeof window.addEmployee);
    console.log('✅ window.handleEditEmployee:', typeof window.handleEditEmployee);
    console.log('✅ window.handleDeleteEmployee:', typeof window.handleDeleteEmployee);
    console.log('✅ window.saveSettings:', typeof window.saveSettings);
    console.log('✅ employees:', employees);
    console.log('✅ companySettings:', companySettings);

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('employeeModal');
            if (modal && modal.style.display === 'flex') {
                window.closeEmployeeModal();
            }
        }
    });

    // 모달 배경 클릭 시 닫기 (드래그와 구분)
    let mouseDownTarget = null;
    document.addEventListener('mousedown', function(e) {
        mouseDownTarget = e.target;
    });

    document.addEventListener('mouseup', function(e) {
        const modal = document.getElementById('employeeModal');
        // mousedown과 mouseup이 같은 위치(모달 배경)에서 발생한 경우만 닫기
        if (e.target === modal && mouseDownTarget === modal) {
            window.closeEmployeeModal();
        }
        mouseDownTarget = null;
    });

    // 초기화
    init();

    console.log('=== settings.js 초기화 완료 ===');
});

// ==================== 데이터 백업/복원 ====================

// 모든 데이터 내보내기 (JSON 파일 다운로드)
function exportAllData() {
    try {
        // LocalStorage의 모든 급여 관련 데이터 수집
        const allData = {};

        // 모든 LocalStorage 키를 순회하며 급여 관련 데이터 추출
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            // 급여 관련 키만 포함
            if (key && (
                key.startsWith('vietnamPayroll') ||
                key.startsWith('payroll') ||
                key === 'companyProfile' ||
                key === 'holidays' ||
                key === 'selectedYear' ||
                key === 'selectedMonth'
            )) {
                try {
                    allData[key] = JSON.parse(localStorage.getItem(key));
                } catch {
                    allData[key] = localStorage.getItem(key);
                }
            }
        }

        // 내보낼 데이터가 없으면 경고
        if (Object.keys(allData).length === 0) {
            alert('⚠️ 내보낼 데이터가 없습니다.');
            return;
        }

        // JSON 파일 생성
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 파일명: payroll-backup-YYYYMMDD-HHMMSS.json
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `payroll-backup-${dateStr}.json`;

        // 다운로드
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✅ 데이터 내보내기 완료!\n\n파일명: ${filename}\n데이터 항목: ${Object.keys(allData).length}개`);

        console.log('📤 내보낸 데이터:', allData);
    } catch (error) {
        console.error('❌ 내보내기 실패:', error);
        alert('❌ 데이터 내보내기 중 오류 발생:\n' + error.message);
    }
}

// 모든 데이터 가져오기 (JSON 파일 업로드)
function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 확인 메시지
    if (!confirm('⚠️ 주의: 현재 데이터가 모두 교체됩니다.\n\n계속하시겠습니까?')) {
        event.target.value = ''; // 파일 선택 초기화
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // 유효성 검사: 급여 데이터인지 확인
            const hasPayrollData = Object.keys(importedData).some(key =>
                key.startsWith('vietnamPayroll') || key.startsWith('payroll')
            );

            if (!hasPayrollData) {
                alert('❌ 올바른 급여 데이터 파일이 아닙니다.');
                event.target.value = '';
                return;
            }

            // LocalStorage에 데이터 복원
            let successCount = 0;
            let errorCount = 0;

            for (const [key, value] of Object.entries(importedData)) {
                try {
                    if (typeof value === 'object') {
                        localStorage.setItem(key, JSON.stringify(value));
                    } else {
                        localStorage.setItem(key, value);
                    }
                    successCount++;
                } catch (error) {
                    console.error(`❌ ${key} 복원 실패:`, error);
                    errorCount++;
                }
            }

            console.log('📥 가져온 데이터:', importedData);

            // 결과 메시지
            if (errorCount === 0) {
                alert(`✅ 데이터 가져오기 완료!\n\n복원된 항목: ${successCount}개\n\n페이지를 새로고침합니다.`);
            } else {
                alert(`⚠️ 데이터 가져오기 부분 완료\n\n성공: ${successCount}개\n실패: ${errorCount}개\n\n페이지를 새로고침합니다.`);
            }

            // 페이지 새로고침하여 변경사항 반영
            location.reload();

        } catch (error) {
            console.error('❌ 가져오기 실패:', error);
            alert('❌ 데이터 가져오기 중 오류 발생:\n' + error.message);
        }

        // 파일 선택 초기화
        event.target.value = '';
    };

    reader.onerror = function() {
        alert('❌ 파일 읽기 실패');
        event.target.value = '';
    };

    reader.readAsText(file);
}

// 전역 함수로 등록
window.exportAllData = exportAllData;
window.importAllData = importAllData;
