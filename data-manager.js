// ==================== 데이터 관리 모듈 ====================
// LocalStorage를 사용한 직원 데이터 및 설정 관리

// 직원 데이터
let employees = {}; // {id: {name, basicSalary, dependents, dailyMeal, ...}}
let currentEmployeeId = null;

// 회사 설정 (공통 설정)
let companySettings = {
    dailyMeal: 25000,
    dinnerMeal: 25000,
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

// LocalStorage에서 직원 데이터 불러오기
function loadEmployeesFromStorage() {
    const stored = localStorage.getItem('vietnamPayrollEmployees');
    if (stored) {
        employees = JSON.parse(stored);
        updateEmployeeSelect();
    }

    // 현재 연도 회사 설정 불러오기
    const currentYear = new Date().getFullYear();
    const storedSettings = localStorage.getItem(`vietnamPayrollSettings_${currentYear}`);
    if (storedSettings) {
        companySettings = JSON.parse(storedSettings);
    } else {
        // 현재 연도 설정이 없으면 기본값 사용
        companySettings = {
            dailyMeal: 25000,
            dinnerMeal: 25000,
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
}

// LocalStorage에 직원 데이터 저장
function saveEmployeesToStorage() {
    localStorage.setItem('vietnamPayrollEmployees', JSON.stringify(employees));
}

// 직원 선택 드롭다운 업데이트
function updateEmployeeSelect() {
    const select = document.getElementById('employeeSelect');
    select.innerHTML = '<option value="">-- 직원 선택 --</option>';

    for (const id in employees) {
        const emp = employees[id];
        const option = document.createElement('option');
        option.value = id;
        option.textContent = emp.name;
        if (id === currentEmployeeId) option.selected = true;
        select.appendChild(option);
    }

    // 선택 이벤트
    select.onchange = function() {
        if (this.value) {
            loadEmployee(this.value);
        }
    };
}

// 직원 추가
function addEmployee() {
    const name = prompt('새 직원 이름을 입력하세요:');
    if (!name) return;

    const hireDate = prompt('입사일을 입력하세요 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);

    const id = 'emp_' + Date.now();
    employees[id] = {
        name: name,
        hireDate: hireDate || new Date().toISOString().split('T')[0],
        basicSalary: 6980000,  // 기본급 (설정에서 변경 가능)
        dependents: 0,
        dailyMeal: companySettings.dailyMeal || 25000,
        annualLeavePerYear: 12,  // 연 연차 발생일수
        annualLeaveUsed: 0,      // 이미 사용한 연차
        holidays: [],
        excusedAbsents: [],
        absents: [],
        annualLeaveDays: [],     // 연차 사용일
        overtimeData: {},
        nightData: {},
        sundayData: {},
        normalHoursData: {}
    };

    saveEmployeesToStorage();
    updateEmployeeSelect();
    updateEmployeeListModal();
    loadEmployee(id);
    alert(`✅ ${name} 직원이 추가되었습니다!`);
}

// 직원 삭제
function deleteEmployee() {
    if (!currentEmployeeId) {
        alert('⚠️ 삭제할 직원을 선택하세요!');
        return;
    }

    const emp = employees[currentEmployeeId];
    if (confirm(`${emp.name} 직원을 삭제하시겠습니까?`)) {
        delete employees[currentEmployeeId];
        saveEmployeesToStorage();
        currentEmployeeId = null;
        updateEmployeeSelect();
        clearForm();
        alert('✅ 삭제되었습니다!');
    }
}

// 전체 데이터 초기화
function clearAllData() {
    if (confirm('⚠️ 정말로 모든 데이터를 삭제하시겠습니까?\n\n- 모든 직원 정보\n- 모든 근무 기록\n- 회사 설정\n\n이 작업은 되돌릴 수 없습니다!')) {
        if (confirm('⚠️ 마지막 확인: 정말 삭제하시겠습니까?')) {
            // 직원 데이터 삭제
            localStorage.removeItem('vietnamPayrollEmployees');

            // 모든 연도별 설정 삭제 (2024~2030)
            for (let year = 2024; year <= 2030; year++) {
                localStorage.removeItem(`vietnamPayrollSettings_${year}`);
            }

            // 오래된 형식의 설정도 삭제
            localStorage.removeItem('vietnamPayrollSettings');

            alert('✅ 모든 데이터가 삭제되었습니다. 페이지를 새로고침합니다.');
            location.reload();
        }
    }
}

// 직원 데이터 불러오기
function loadEmployee(id) {
    const emp = employees[id];
    if (!emp) return;

    currentEmployeeId = id;

    // 기본 정보
    document.getElementById('employeeName').value = emp.name;
    document.getElementById('basicSalary').value = emp.basicSalary;
    document.getElementById('dependents').value = emp.dependents || 0;
    document.getElementById('dailyMeal').value = emp.dailyMeal || 25000;

    // 달력 데이터
    holidays = new Set(emp.holidays || []);
    excusedAbsents = new Set(emp.excusedAbsents || []);
    absents = new Set(emp.absents || []);
    annualLeaveDays = new Set(emp.annualLeaveDays || []);
    overtimeData = emp.overtimeData || {};
    nightData = emp.nightData || {};
    sundayData = emp.sundayData || {};
    normalHoursData = emp.normalHoursData || {};

    generateCalendar();
    calculate();
}

// 현재 직원 데이터 저장
function saveCurrentEmployee() {
    if (!currentEmployeeId) return;

    const emp = employees[currentEmployeeId];
    employees[currentEmployeeId] = {
        ...emp, // 기존 데이터 유지 (hireDate, annualLeavePerYear, annualLeaveUsed 등)
        name: document.getElementById('employeeName').value,
        basicSalary: parseFloat(document.getElementById('basicSalary').value) || 0,
        dependents: parseInt(document.getElementById('dependents').value) || 0,
        dailyMeal: parseFloat(document.getElementById('dailyMeal').value) || 25000,
        holidays: Array.from(holidays),
        excusedAbsents: Array.from(excusedAbsents),
        absents: Array.from(absents),
        annualLeaveDays: Array.from(annualLeaveDays),
        overtimeData: overtimeData,
        nightData: nightData,
        sundayData: sundayData,
        normalHoursData: normalHoursData
    };

    saveEmployeesToStorage();
}

// 폼 초기화
function clearForm() {
    document.getElementById('employeeName').value = '';
    document.getElementById('basicSalary').value = 6980000;
    document.getElementById('dependents').value = 0;
    document.getElementById('dailyMeal').value = 25000;
    holidays = new Set();
    excusedAbsents = new Set();
    absents = new Set();
    overtimeData = {};
    nightData = {};
    sundayData = {};
    normalHoursData = {};
    generateCalendar();
    calculate();
}

// 직원 수정
function editEmployee(id) {
    const emp = employees[id];
    const name = prompt('직원 이름:', emp.name);
    if (!name) return;

    const hireDate = prompt('입사일 (YYYY-MM-DD):', emp.hireDate || new Date().toISOString().split('T')[0]);
    const basicSalary = prompt('기본급:', emp.basicSalary);
    const dependents = prompt('부양가족 수:', emp.dependents);
    const annualLeavePerYear = prompt('연 연차 발생일수 (일):', emp.annualLeavePerYear || 12);
    const annualLeaveUsed = prompt('이미 사용한 연차 (일):', emp.annualLeaveUsed || 0);

    emp.name = name;
    emp.hireDate = hireDate;
    emp.basicSalary = parseFloat(basicSalary) || emp.basicSalary;
    emp.dependents = parseInt(dependents) || emp.dependents;
    emp.annualLeavePerYear = parseInt(annualLeavePerYear) || 12;
    emp.annualLeaveUsed = parseInt(annualLeaveUsed) || 0;

    saveEmployeesToStorage();
    updateEmployeeSelect();
    updateEmployeeListModal();
    alert('✅ 수정되었습니다!');
}

// 직원 삭제 확인
function confirmDeleteEmployee(id) {
    const emp = employees[id];
    if (confirm(`${emp.name} 직원을 삭제하시겠습니까?`)) {
        delete employees[id];
        if (currentEmployeeId === id) {
            currentEmployeeId = null;
            clearForm();
        }
        saveEmployeesToStorage();
        updateEmployeeSelect();
        updateEmployeeListModal();
        alert('✅ 삭제되었습니다!');
    }
}

// 급여 이력 저장
function savePayrollHistory() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);
    const payrollData = calculateAllEmployeesPayroll(year, month);

    if (payrollData.length === 0) {
        alert('저장할 데이터가 없습니다.');
        return;
    }

    // 이력 데이터 저장
    const historyKey = `payrollHistory_${year}_${month}`;

    // 기존 데이터 확인 (최초 등록일 보존)
    const existingData = JSON.parse(localStorage.getItem(historyKey) || 'null');
    const firstSavedDate = existingData && existingData.firstSavedDate
        ? existingData.firstSavedDate
        : new Date().toISOString();

    // 확정 목록 가져오기
    const monthKey = `${year}_${month}`;
    const confirmKey = `payrollConfirmed_${monthKey}`;
    const confirmedEmployees = JSON.parse(localStorage.getItem(confirmKey) || '[]');

    const historyData = {
        year: year,
        month: month,
        savedDate: new Date().toISOString(),
        firstSavedDate: firstSavedDate,  // 최초 등록일 보존
        confirmedEmployees: confirmedEmployees,  // 확정 직원 목록 저장
        data: payrollData
    };

    localStorage.setItem(historyKey, JSON.stringify(historyData));

    // 이력 목록 업데이트
    let historyList = JSON.parse(localStorage.getItem('payrollHistoryList') || '[]');
    const existingIndex = historyList.findIndex(h => h.year === year && h.month === month);

    if (existingIndex >= 0) {
        historyList[existingIndex] = { year, month, savedDate: historyData.savedDate };
    } else {
        historyList.push({ year, month, savedDate: historyData.savedDate });
    }

    // 최신 순으로 정렬
    historyList.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });

    localStorage.setItem('payrollHistoryList', JSON.stringify(historyList));

    alert(`✅ ${year}년 ${month}월 급여 이력이 저장되었습니다!`);
}

// 급여 이력 조회
function viewPayrollHistory() {
    const historyList = JSON.parse(localStorage.getItem('payrollHistoryList') || '[]');

    if (historyList.length === 0) {
        alert('저장된 이력이 없습니다.');
        return;
    }

    let message = '급여 이력 목록\n\n';
    historyList.forEach((h, index) => {
        const savedDate = new Date(h.savedDate).toLocaleString('ko-KR');
        message += `${index + 1}. ${h.year}년 ${h.month}월 (저장: ${savedDate})\n`;
    });

    message += '\n조회할 이력 번호를 입력하세요 (취소: 0):';

    const input = prompt(message);
    if (!input || input === '0') return;

    const selectedIndex = parseInt(input) - 1;
    if (selectedIndex < 0 || selectedIndex >= historyList.length) {
        alert('잘못된 번호입니다.');
        return;
    }

    const selected = historyList[selectedIndex];
    document.getElementById('payrollYear').value = selected.year;
    document.getElementById('payrollMonth').value = selected.month;
    refreshPayrollTable();

    alert(`✅ ${selected.year}년 ${selected.month}월 이력을 불러왔습니다.`);
}

// 설정을 모달에 로드
function loadSettingsToModal() {
    document.getElementById('settingDailyMeal').value = companySettings.dailyMeal;
    document.getElementById('settingAttendanceBonus').value = companySettings.attendanceBonus;
    document.getElementById('settingTransportBonus').value = companySettings.transportBonus;
    document.getElementById('settingRiskBonus').value = companySettings.riskBonus;
    document.getElementById('settingEmployeeSocial').value = companySettings.employeeSocialRate;
    document.getElementById('settingEmployeeHealth').value = companySettings.employeeHealthRate;
    document.getElementById('settingEmployeeUnemploy').value = companySettings.employeeUnemployRate;
    document.getElementById('settingCompanySocial').value = companySettings.companySocialRate;
    document.getElementById('settingCompanyHealth').value = companySettings.companyHealthRate;
    document.getElementById('settingCompanyUnemploy').value = companySettings.companyUnemployRate;
}

// 설정 저장 (주의: settings.js의 window.saveSettings()가 실제로 사용됨)
// 이 함수는 오래된 코드이며 더 이상 사용되지 않음
function saveSettings() {
    console.warn('⚠️ data-manager.js의 saveSettings() 호출됨. settings.js의 window.saveSettings()를 사용해야 합니다.');
    const currentYear = new Date().getFullYear();

    companySettings.dailyMeal = parseFloat(document.getElementById('settingDailyMeal').value) || 25000;
    companySettings.attendanceBonus = parseFloat(document.getElementById('settingAttendanceBonus').value) || 300000;
    companySettings.transportBonus = parseFloat(document.getElementById('settingTransportBonus').value) || 200000;
    companySettings.riskBonus = parseFloat(document.getElementById('settingRiskBonus').value) || 100000;
    companySettings.employeeSocialRate = parseFloat(document.getElementById('settingEmployeeSocial').value) || 8;
    companySettings.employeeHealthRate = parseFloat(document.getElementById('settingEmployeeHealth').value) || 1.5;
    companySettings.employeeUnemployRate = parseFloat(document.getElementById('settingEmployeeUnemploy').value) || 1;
    companySettings.companySocialRate = parseFloat(document.getElementById('settingCompanySocial').value) || 17.5;
    companySettings.companyHealthRate = parseFloat(document.getElementById('settingCompanyHealth').value) || 3;
    companySettings.companyUnemployRate = parseFloat(document.getElementById('settingCompanyUnemploy').value) || 1;

    // 연도별 키로 저장
    localStorage.setItem(`vietnamPayrollSettings_${currentYear}`, JSON.stringify(companySettings));
    alert('✅ 설정이 저장되었습니다!');
}
