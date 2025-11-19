// ==================== 설정 페이지 JavaScript ====================

// 현재 관리 연도
let currentSettingsYear = new Date().getFullYear();

// 숫자 포맷팅
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
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
            weekdayDinnerHours: 3,
            sundayLunchHours: 4,
            sundayDinnerHours: 12,
            annualLeaveLunchMeal: false,
            excusedAbsenceLunchMinHours: 4,
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
        companySettings.weekdayDinnerHours = 3;
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
    if (companySettings.excusedAbsenceLunchMinHours === undefined) {
        companySettings.excusedAbsenceLunchMinHours = 4;
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
    document.getElementById('info-dinner-hours').textContent = companySettings.weekdayDinnerHours || 3;
    document.getElementById('info-sunday-lunch-hours').textContent = companySettings.sundayLunchHours || 4;
    document.getElementById('info-sunday-dinner-hours').textContent = companySettings.sundayDinnerHours || 12;

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

    // 각 직원 카드 생성
    let cardCount = 0;
    for (const empId in employees) {
        const emp = employees[empId];
        console.log(`📝 직원 카드 생성 [${cardCount + 1}]:`, empId, emp.name);

        // 연차 계산
        const annualLeaveTotal = emp.annualLeavePerYear || 12;
        const annualLeaveAdjustment = emp.annualLeaveAdjustment || 0;
        const annualLeaveAvailable = annualLeaveTotal + annualLeaveAdjustment;

        let leaveInfo = `🌴 연차: ${annualLeaveTotal}일/년`;
        if (annualLeaveAdjustment !== 0) {
            leaveInfo += ` (조정: ${annualLeaveAdjustment > 0 ? '+' : ''}${annualLeaveAdjustment}일, 사용가능: ${annualLeaveAvailable}일)`;
        }

        // 카드 HTML 생성 (inline onclick 사용)
        const cardHTML = `
            <div class="employee-item" draggable="false">
                <div class="employee-info" draggable="false">
                    <div class="employee-name" draggable="false">👤 ${emp.name}</div>
                    <div class="employee-details" draggable="false">
                        📅 입사일: ${emp.hireDate || '미등록'} |
                        💰 기본급: ${formatNumber(emp.basicSalary)}đ |
                        👨‍👩‍👧‍👦 부양가족: ${emp.dependents || 0}명 |
                        ${leaveInfo}
                    </div>
                </div>
                <div class="employee-actions">
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
    document.getElementById('modalEmployeeName').value = emp.name;
    document.getElementById('modalHireDate').value = emp.hireDate || new Date().toISOString().split('T')[0];
    document.getElementById('modalBasicSalary').value = emp.basicSalary;
    document.getElementById('modalDependents').value = emp.dependents || 0;
    document.getElementById('modalAnnualLeavePerYear').value = emp.annualLeavePerYear || 12;
    document.getElementById('modalAnnualLeaveAdjustment').value = emp.annualLeaveAdjustment || 0;

    // 모달 열기
    document.getElementById('employeeModal').style.display = 'flex';
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
    if (confirm(`⚠️ ${emp.name} 직원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
        delete employees[employeeId];
        saveEmployeesToStorage();
        displayEmployeeList();
        alert('✅ 삭제되었습니다!');
        console.log('✅ 직원 삭제 완료:', emp.name);
    } else {
        console.log('❌ 삭제 취소됨');
    }
}

// 직원 추가 모달 열기
window.addEmployee = function() {
    editingEmployeeId = null;
    document.getElementById('modalTitle').textContent = '✨ 새 직원 추가';

    // 폼 초기화
    document.getElementById('modalEmployeeName').value = '';
    document.getElementById('modalHireDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalBasicSalary').value = '6980000';
    document.getElementById('modalDependents').value = '0';
    document.getElementById('modalAnnualLeavePerYear').value = '12';
    document.getElementById('modalAnnualLeaveAdjustment').value = '0';

    // 모달 열기
    document.getElementById('employeeModal').style.display = 'flex';
    document.getElementById('modalEmployeeName').focus();
}

// 직원 모달 닫기
window.closeEmployeeModal = function() {
    document.getElementById('employeeModal').style.display = 'none';
    editingEmployeeId = null;
}

// 모달에서 직원 저장
window.saveEmployeeFromModal = function() {
    const name = document.getElementById('modalEmployeeName').value.trim();
    if (!name) {
        alert('⚠️ 직원 이름을 입력하세요!');
        document.getElementById('modalEmployeeName').focus();
        return;
    }

    const hireDate = document.getElementById('modalHireDate').value;
    const basicSalary = parseFloat(document.getElementById('modalBasicSalary').value) || 6980000;
    const dependents = parseInt(document.getElementById('modalDependents').value) || 0;
    const annualLeavePerYear = parseInt(document.getElementById('modalAnnualLeavePerYear').value) || 12;
    const annualLeaveAdjustment = parseInt(document.getElementById('modalAnnualLeaveAdjustment').value) || 0;

    if (editingEmployeeId) {
        // 수정 모드
        const emp = employees[editingEmployeeId];
        emp.name = name;
        emp.hireDate = hireDate;
        emp.basicSalary = basicSalary;
        emp.dependents = dependents;
        emp.annualLeavePerYear = annualLeavePerYear;
        emp.annualLeaveAdjustment = annualLeaveAdjustment;

        saveEmployeesToStorage();
        displayEmployeeList();
        closeEmployeeModal();

        const availableLeave = annualLeavePerYear + annualLeaveAdjustment;
        alert(`✅ ${name} 직원 정보가 수정되었습니다!\n\n실제 사용 가능 연차: ${availableLeave}일`);
    } else {
        // 추가 모드
        const id = 'emp_' + Date.now();
        employees[id] = {
            name: name,
            hireDate: hireDate,
            basicSalary: basicSalary,
            dependents: dependents,
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
    const excusedAbsenceLunchMinHoursEl = document.getElementById('settingExcusedAbsenceLunchMinHours');

    if (lunchMealEl) lunchMealEl.value = companySettings.lunchMeal || 25000;
    if (dinnerMealEl) dinnerMealEl.value = companySettings.dinnerMeal || 25000;
    if (weekdayLunchAutoEl) weekdayLunchAutoEl.checked = companySettings.weekdayLunchAuto !== false;
    if (weekdayDinnerHoursEl) weekdayDinnerHoursEl.value = companySettings.weekdayDinnerHours || 3;
    if (sundayLunchHoursEl) sundayLunchHoursEl.value = companySettings.sundayLunchHours || 4;
    if (sundayDinnerHoursEl) sundayDinnerHoursEl.value = companySettings.sundayDinnerHours || 12;
    if (annualLeaveLunchMealEl) annualLeaveLunchMealEl.checked = companySettings.annualLeaveLunchMeal === true;
    if (excusedAbsenceLunchMinHoursEl) excusedAbsenceLunchMinHoursEl.value = companySettings.excusedAbsenceLunchMinHours || 4;

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
    const excusedAbsenceLunchMinHoursEl = document.getElementById('settingExcusedAbsenceLunchMinHours');

    if (lunchMealEl) companySettings.lunchMeal = parseFloat(lunchMealEl.value) || 25000;
    if (dinnerMealEl) companySettings.dinnerMeal = parseFloat(dinnerMealEl.value) || 25000;
    if (weekdayLunchAutoEl) companySettings.weekdayLunchAuto = weekdayLunchAutoEl.checked;
    if (weekdayDinnerHoursEl) companySettings.weekdayDinnerHours = parseFloat(weekdayDinnerHoursEl.value) || 3;
    if (sundayLunchHoursEl) companySettings.sundayLunchHours = parseFloat(sundayLunchHoursEl.value) || 4;
    if (sundayDinnerHoursEl) companySettings.sundayDinnerHours = parseFloat(sundayDinnerHoursEl.value) || 12;
    if (annualLeaveLunchMealEl) companySettings.annualLeaveLunchMeal = annualLeaveLunchMealEl.checked;
    if (excusedAbsenceLunchMinHoursEl) companySettings.excusedAbsenceLunchMinHours = parseFloat(excusedAbsenceLunchMinHoursEl.value) || 0;

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

// 숫자 포맷팅 (로컬 함수 - settings.js 내부용)
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

// ==================== 수당 관리 시스템 끝 ====================

// 직원 엑셀 템플릿 다운로드
window.downloadEmployeeTemplate = function() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: 직원 기본정보
    const empData = [
        ['직원명', '입사일', '기본급', '부양가족수', '연차발생일수', '연차조정'],
        ['홍길동', '2024-01-15', 6980000, 2, 12, 0],
        ['김철수', '2023-06-01', 7500000, 0, 12, -3],
        ['이영희', '2024-11-01', 6500000, 1, 12, 0]
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(empData);
    XLSX.utils.book_append_sheet(wb, ws1, '직원기본정보');

    // Sheet 2: 사용 안내
    const guideData = [
        ['베트남 급여 계산기 - 직원 정보 템플릿'],
        [''],
        ['사용 방법:'],
        ['1. "직원기본정보" 시트에 직원 정보를 입력하세요'],
        ['2. 파일을 저장하고 "엑셀 불러오기" 버튼으로 업로드하세요'],
        ['3. 직원 정보가 시스템에 자동으로 등록됩니다'],
        [''],
        ['컬럼 설명:'],
        ['- 직원명: 필수 항목'],
        ['- 입사일: YYYY-MM-DD 형식 (예: 2024-01-15)'],
        ['- 기본급: 월 기본급 (동)'],
        ['- 부양가족수: 소득세 계산용 (본인 제외)'],
        ['- 연차발생일수: 연간 발생 연차 일수 (보통 12일)'],
        ['- 연차조정: 양수=추가지급, 음수=이미사용 (예: -3 = 이미 3일 사용)'],
        [''],
        ['주의: 직원명은 필수이며, 다른 항목은 비워두면 기본값이 적용됩니다']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(guideData);
    XLSX.utils.book_append_sheet(wb, ws2, '사용안내');

    // 컬럼 너비 설정
    ws1['!cols'] = [
        {wch: 15}, // 직원명
        {wch: 12}, // 입사일
        {wch: 12}, // 기본급
        {wch: 12}, // 부양가족수
        {wch: 15}, // 연차발생일수
        {wch: 12}  // 연차조정
    ];

    const currentDate = new Date();
    const fileName = `직원정보_템플릿_${currentDate.getFullYear()}_${currentDate.getMonth()+1}.xlsx`;
    XLSX.writeFile(wb, fileName);
    alert('✅ 직원 정보 템플릿이 다운로드되었습니다!');
}

// 직원 엑셀 불러오기
window.loadEmployeeExcel = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            // 직원기본정보 시트 읽기
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

            // 헤더 제외하고 읽기
            let count = 0;
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row[0]) continue; // 이름 없으면 스킵

                const id = 'emp_' + Date.now() + '_' + i;
                employees[id] = {
                    name: row[0],                                    // 직원명
                    hireDate: row[1] || new Date().toISOString().split('T')[0],  // 입사일
                    basicSalary: row[2] || 6980000,                 // 기본급
                    dependents: row[3] || 0,                        // 부양가족수
                    annualLeavePerYear: row[4] || 12,               // 연차발생일수
                    annualLeaveAdjustment: row[5] || 0,             // 연차조정
                    annualLeaveUsed: 0,
                    holidays: [],
                    excusedAbsents: [],
                    absents: [],
                    annualLeaveDays: [],
                    overtimeData: {},
                    nightData: {},
                    sundayData: {},
                    normalHoursData: {}
                };
                count++;
            }

            saveEmployeesToStorage();
            displayEmployeeList();
            alert(`✅ ${count}명의 직원 정보를 불러왔습니다!`);
        } catch (error) {
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
