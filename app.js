// ==================== 메인 앱 로직 ====================
// 초기화, 모달 관리, 급여 대장

// 초기화
function init() {
    initYearMonth();
    loadEmployeesFromStorage();
    generateCalendar();
    calculate();
}

// 설정 모달 열기
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
    updateEmployeeListModal();
    loadSettingsToModal();
}

// 설정 모달 닫기
function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

// 탭 전환
function switchTab(tabIndex) {
    document.querySelectorAll('.modal-tab').forEach((tab, index) => {
        tab.classList.remove('active');
        document.getElementById(`tab${index}`).classList.remove('active');
    });

    document.querySelectorAll('.modal-tab')[tabIndex].classList.add('active');
    document.getElementById(`tab${tabIndex}`).classList.add('active');
}

// 직원 목록 모달 업데이트
function updateEmployeeListModal() {
    const listEl = document.getElementById('employeeListModal');
    if (Object.keys(employees).length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">등록된 직원이 없습니다. "직원 추가" 버튼을 클릭하세요.</div>';
        return;
    }

    listEl.innerHTML = '';
    for (const id in employees) {
        const emp = employees[id];
        const item = document.createElement('div');
        item.className = 'employee-item';
        item.innerHTML = `
            <div class="employee-info">
                <div class="employee-name">${emp.name}</div>
                <div class="employee-details">
                    입사일: ${emp.hireDate || '미등록'} |
                    기본급: ${formatNumber(emp.basicSalary)}đ |
                    부양가족: ${emp.dependents}명
                </div>
            </div>
            <div class="employee-actions">
                <button class="btn-small btn-edit" onclick="editEmployee('${id}')">수정</button>
                <button class="btn-small btn-delete" onclick="confirmDeleteEmployee('${id}')">삭제</button>
            </div>
        `;
        listEl.appendChild(item);
    }
}

// 급여 대장 열기
function openPayrollSummary() {
    const yearSelect = document.getElementById('payrollYear');
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 2; year <= currentYear + 5; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year + '년';
        if (year === selectedYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    document.getElementById('payrollMonth').value = selectedMonth;
    document.getElementById('payrollModal').classList.add('active');
    refreshPayrollTable();
}

// 급여 대장 닫기
function closePayrollSummary() {
    document.getElementById('payrollModal').classList.remove('active');
}

// 급여 대장 테이블 새로고침
function refreshPayrollTable() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);

    const payrollData = calculateAllEmployeesPayroll(year, month);
    renderPayrollTable(payrollData);
    updatePayrollSummary(payrollData);
}

// 급여 대장 테이블 렌더링
function renderPayrollTable(payrollData) {
    const tbody = document.getElementById('payrollTableBody');

    if (payrollData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="padding: 40px; text-align: center; color: #999;">등록된 직원이 없습니다.</td></tr>';
        return;
    }

    let html = '';
    payrollData.forEach((data, index) => {
        html += `
            <tr style="cursor: pointer; transition: background 0.2s;"
                onmouseover="this.style.background='#f8f9fa'"
                onmouseout="this.style.background='white'">
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${data.name}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${data.workDays}일</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${data.normalHours}h</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatNumber(data.basicPay)}đ</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatNumber(data.allowances)}đ</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #2196f3; font-weight: bold;">${formatNumber(data.totalSalary)}đ</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #f44336;">${formatNumber(data.deductions)}đ</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #e91e63;">${formatNumber(data.incomeTax)}đ</td>
                <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #4caf50; font-weight: bold; font-size: 1.1em;">${formatNumber(data.netSalary)}đ</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">
                    <button onclick="viewEmployeeDetail('${data.id}')" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 5px;">상세</button>
                    <button onclick="viewYearlyAccumulation('${data.id}')" style="padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">연간 누적</button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // 합계 계산
    const totals = {
        workDays: payrollData.reduce((sum, d) => sum + d.workDays, 0),
        normalHours: payrollData.reduce((sum, d) => sum + d.normalHours, 0),
        basicPay: payrollData.reduce((sum, d) => sum + d.basicPay, 0),
        allowances: payrollData.reduce((sum, d) => sum + d.allowances, 0),
        totalSalary: payrollData.reduce((sum, d) => sum + d.totalSalary, 0),
        deductions: payrollData.reduce((sum, d) => sum + d.deductions, 0),
        incomeTax: payrollData.reduce((sum, d) => sum + d.incomeTax, 0),
        netSalary: payrollData.reduce((sum, d) => sum + d.netSalary, 0)
    };

    document.getElementById('totalWorkDays').textContent = totals.workDays + '일';
    document.getElementById('totalWorkHours').textContent = totals.normalHours + 'h';
    document.getElementById('totalBasicSalary').textContent = formatNumber(totals.basicPay) + 'đ';
    document.getElementById('totalAllowances').textContent = formatNumber(totals.allowances) + 'đ';
    document.getElementById('totalGrossSalary').textContent = formatNumber(totals.totalSalary) + 'đ';
    document.getElementById('totalDeductions').textContent = formatNumber(totals.deductions) + 'đ';
    document.getElementById('totalTax').textContent = formatNumber(totals.incomeTax) + 'đ';
    document.getElementById('totalNetSalary').textContent = formatNumber(totals.netSalary) + 'đ';
}

// 급여 대장 요약 정보 업데이트
function updatePayrollSummary(payrollData) {
    const employeeCount = payrollData.length;
    const totalNet = payrollData.reduce((sum, d) => sum + d.netSalary, 0);
    const totalDeductions = payrollData.reduce((sum, d) => sum + d.deductions, 0);
    const totalTax = payrollData.reduce((sum, d) => sum + d.incomeTax, 0);

    document.getElementById('summaryEmployeeCount').textContent = employeeCount + '명';
    document.getElementById('summaryNetSalary').textContent = formatNumber(totalNet) + 'đ';
    document.getElementById('summaryDeductions').textContent = formatNumber(totalDeductions) + 'đ';
    document.getElementById('summaryTax').textContent = formatNumber(totalTax) + 'đ';
}

// 직원 상세 보기
function viewEmployeeDetail(employeeId) {
    closePayrollSummary();
    document.getElementById('employeeSelect').value = employeeId;
    loadEmployee(employeeId);

    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);
    selectedYear = year;
    selectedMonth = month;

    generateCalendar();
    updateStats();
}

// 연간 누적 상세 보기
function viewYearlyAccumulation(employeeId) {
    const emp = employees[employeeId];
    if (!emp) return;

    const yearly = calculateYearlyAccumulation(employeeId);
    const year = parseInt(document.getElementById('payrollYear').value);
    const currentMonth = parseInt(document.getElementById('payrollMonth').value);

    let message = `${emp.name} - ${year}년 연간 누적 (1월~${currentMonth}월)\n`;
    message += '='.repeat(50) + '\n\n';

    message += '월별 내역:\n';
    yearly.months.forEach(m => {
        message += `${m.month}월: ${formatNumber(m.netSalary)}đ (총급여: ${formatNumber(m.totalSalary)}đ)\n`;
    });

    message += '\n' + '='.repeat(50) + '\n';
    message += `연간 총 급여: ${formatNumber(yearly.totalSalary)}đ\n`;
    message += `연간 보험료: ${formatNumber(yearly.deductions)}đ\n`;
    message += `연간 소득세: ${formatNumber(yearly.incomeTax)}đ\n`;
    message += `연간 실수령액: ${formatNumber(yearly.netSalary)}đ\n\n`;

    const avgNet = Math.round(yearly.netSalary / yearly.months.length);
    message += `월 평균 실수령액: ${formatNumber(avgNet)}đ`;

    alert(message);
}

// 급여 대장 인쇄
function printPayroll() {
    const year = parseInt(document.getElementById('payrollYear').value);
    const month = parseInt(document.getElementById('payrollMonth').value);
    const payrollData = calculateAllEmployeesPayroll(year, month);

    if (payrollData.length === 0) {
        alert('인쇄할 데이터가 없습니다.');
        return;
    }

    let printContent = `
        <html>
        <head>
            <title>급여 대장 - ${year}년 ${month}월</title>
            <style>
                body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; }
                h1 { text-align: center; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #333; padding: 10px; text-align: center; }
                th { background: #667eea; color: white; font-weight: bold; }
                .right { text-align: right; }
                .total { background: #f0f0f0; font-weight: bold; }
                @media print { @page { margin: 1cm; } }
            </style>
        </head>
        <body>
            <h1>급여 대장 - ${year}년 ${month}월</h1>
            <table>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>직원명</th>
                        <th>근무일</th>
                        <th>정규시간</th>
                        <th>기본급</th>
                        <th>수당</th>
                        <th>총급여</th>
                        <th>보험료</th>
                        <th>소득세</th>
                        <th>실수령액</th>
                    </tr>
                </thead>
                <tbody>
    `;

    payrollData.forEach((data, index) => {
        printContent += `
            <tr>
                <td>${index + 1}</td>
                <td>${data.name}</td>
                <td>${data.workDays}일</td>
                <td>${data.normalHours}h</td>
                <td class="right">${formatNumber(data.basicPay)}đ</td>
                <td class="right">${formatNumber(data.allowances)}đ</td>
                <td class="right">${formatNumber(data.totalSalary)}đ</td>
                <td class="right">${formatNumber(data.deductions)}đ</td>
                <td class="right">${formatNumber(data.incomeTax)}đ</td>
                <td class="right">${formatNumber(data.netSalary)}đ</td>
            </tr>
        `;
    });

    const totals = {
        workDays: payrollData.reduce((sum, d) => sum + d.workDays, 0),
        normalHours: payrollData.reduce((sum, d) => sum + d.normalHours, 0),
        basicPay: payrollData.reduce((sum, d) => sum + d.basicPay, 0),
        allowances: payrollData.reduce((sum, d) => sum + d.allowances, 0),
        totalSalary: payrollData.reduce((sum, d) => sum + d.totalSalary, 0),
        deductions: payrollData.reduce((sum, d) => sum + d.deductions, 0),
        incomeTax: payrollData.reduce((sum, d) => sum + d.incomeTax, 0),
        netSalary: payrollData.reduce((sum, d) => sum + d.netSalary, 0)
    };

    printContent += `
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="2">합계</td>
                        <td>${totals.workDays}일</td>
                        <td>${totals.normalHours}h</td>
                        <td class="right">${formatNumber(totals.basicPay)}đ</td>
                        <td class="right">${formatNumber(totals.allowances)}đ</td>
                        <td class="right">${formatNumber(totals.totalSalary)}đ</td>
                        <td class="right">${formatNumber(totals.deductions)}đ</td>
                        <td class="right">${formatNumber(totals.incomeTax)}đ</td>
                        <td class="right">${formatNumber(totals.netSalary)}đ</td>
                    </tr>
                </tfoot>
            </table>
            <p style="text-align: center; margin-top: 40px;">발행일: ${new Date().toLocaleDateString('ko-KR')}</p>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// ==================== 월급 일괄 저장 기능 ====================

// 현재 월의 모든 직원 급여 저장
function saveCurrentMonthPayroll() {
    const year = selectedYear;
    const month = selectedMonth;

    // 직원이 없으면 경고
    if (Object.keys(employees).length === 0) {
        alert('⚠️ 등록된 직원이 없습니다!\n\n먼저 "설정"에서 직원을 추가해주세요.');
        return;
    }

    // 확인
    const confirmed = confirm(`${year}년 ${month}월 급여를 저장하시겠습니까?\n\n모든 직원의 급여가 자동 계산되어 저장됩니다.`);
    if (!confirmed) return;

    // 모든 직원 급여 계산
    const payrollData = calculateAllEmployeesPayroll(year, month);

    if (payrollData.length === 0) {
        alert('⚠️ 저장할 급여 데이터가 없습니다.');
        return;
    }

    // 이력 데이터 저장
    const historyKey = `payrollHistory_${year}_${month}`;
    const historyData = {
        year: year,
        month: month,
        savedDate: new Date().toISOString(),
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

    // 성공 메시지
    alert(`✅ ${year}년 ${month}월 급여가 저장되었습니다!\n\n직원 수: ${payrollData.length}명\n\n메인 화면으로 이동합니다.`);

    // 메인으로 이동
    window.location.href = 'index.html';
}

// ==================== URL 파라미터 처리 ====================

// 페이지 로드 시 URL 파라미터 확인
function handleURLParams() {
    const urlParams = new URLSearchParams(window.location.search);

    // month 파라미터가 있으면 해당 월로 이동
    if (urlParams.has('month')) {
        const month = parseInt(urlParams.get('month'));
        if (month >= 1 && month <= 12) {
            selectedMonth = month;
            document.getElementById('monthSelect').value = month;
            generateCalendar();
        }
    }

    // openSettings 파라미터가 있으면 설정 모달 열기
    if (urlParams.get('openSettings') === 'true') {
        setTimeout(() => openSettings(), 500);
    }
}

// 페이지 로드시 초기화
window.onload = function() {
    init();
    handleURLParams();
};
