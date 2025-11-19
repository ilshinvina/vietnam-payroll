// ==================== 메인 대시보드 JavaScript ====================
// 전체 인원 현황 및 월별 급여 현황

// 전역 변수
let employees = {};
let monthlyPayrollData = {}; // {year_month: payrollData}

// 초기화
function initDashboard() {
    loadEmployeesData();
    displayEmployeeStats();
    displayMonthlyPayroll();
}

// 직원 데이터 불러오기
function loadEmployeesData() {
    const stored = localStorage.getItem('vietnamPayrollEmployees');
    if (stored) {
        employees = JSON.parse(stored);
    }
}

// 직원 통계 표시
function displayEmployeeStats() {
    const totalEmployees = Object.keys(employees).length;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // 이번달 확정된 직원 수 계산
    const historyKey = `payrollHistory_${currentYear}_${currentMonth}`;
    const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');
    const confirmedEmployeesList = historyData.confirmedEmployees || [];
    const confirmedEmployees = confirmedEmployeesList.length;

    // 이번달 총 급여 계산 (확정된 직원만!)
    let totalSalaryThisMonth = 0;

    if (confirmedEmployees > 0 && historyData.data && historyData.data.length > 0) {
        // 확정된 직원의 데이터만 필터링하여 급여 합산
        const confirmedData = historyData.data.filter(d => confirmedEmployeesList.includes(d.employeeId));
        totalSalaryThisMonth = confirmedData.reduce((sum, d) => sum + (d.totalSalary || 0), 0);
    }

    const avgSalary = confirmedEmployees > 0 ? Math.round(totalSalaryThisMonth / confirmedEmployees) : 0;

    document.getElementById('totalEmployees').textContent = totalEmployees + '명';
    document.getElementById('confirmedEmployees').textContent = confirmedEmployees + '명';
    document.getElementById('monthlyTotalSalary').textContent = formatNumber(totalSalaryThisMonth) + 'đ';
    document.getElementById('avgSalary').textContent = formatNumber(avgSalary) + 'đ';
}

// 월별 급여 현황 표시
function displayMonthlyPayroll() {
    const currentYear = new Date().getFullYear();
    const tbody = document.getElementById('monthlyPayrollTable');
    tbody.innerHTML = '';

    console.log('=== displayMonthlyPayroll 시작 ===');
    console.log('currentYear:', currentYear);

    // 급여 이력 목록 불러오기
    const historyList = JSON.parse(localStorage.getItem('payrollHistoryList') || '[]');
    console.log('payrollHistoryList:', historyList);

    // 1월부터 12월까지 표시
    for (let month = 1; month <= 12; month++) {
        const tr = document.createElement('tr');

        // 해당 월의 이력 찾기
        const history = historyList.find(h => h.year === currentYear && h.month === month);
        console.log(`${month}월 history:`, history);

        let totalEmployees = 0;
        let totalSalary = 0;
        let totalNet = 0;
        let status = '미등록';
        let savedDate = '-';

        if (history) {
            // 이력 데이터 불러오기
            const historyKey = `payrollHistory_${currentYear}_${month}`;
            const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');
            console.log(`${month}월 historyKey:`, historyKey);
            console.log(`${month}월 historyData:`, historyData);

            if (historyData.data && historyData.data.length > 0) {
                // 확정된 직원 수
                const confirmedEmployees = historyData.confirmedEmployees || [];
                const confirmedCount = confirmedEmployees.length;
                const totalEmployeeCount = Object.keys(employees).length;

                totalEmployees = confirmedCount;

                // 확정된 직원의 급여만 합산
                if (confirmedCount > 0) {
                    const confirmedData = historyData.data.filter(d => confirmedEmployees.includes(d.employeeId));
                    totalSalary = confirmedData.reduce((sum, d) => sum + (d.totalSalary || 0), 0);
                    totalNet = confirmedData.reduce((sum, d) => sum + (d.netSalary || 0), 0);

                    // 최초 등록일 표시 (firstSavedDate가 있으면 사용, 없으면 savedDate 사용)
                    const dateToShow = historyData.firstSavedDate || history.savedDate;
                    savedDate = new Date(dateToShow).toLocaleDateString('ko-KR');
                }

                // 전체 직원 수와 확정 인원이 같을 때만 "등록완료", 아니면 진행률 표시
                if (totalEmployeeCount > 0 && confirmedCount === totalEmployeeCount) {
                    status = '등록완료';
                } else if (confirmedCount > 0) {
                    status = `${confirmedCount}/${totalEmployeeCount}`;
                } else {
                    status = '미등록';
                }

                console.log(`${month}월 - 확정: ${confirmedCount}명, 전체: ${totalEmployeeCount}명, 확정급여: ${totalSalary}, 등록일: ${savedDate}`);
            }
        }

        // 상태별 스타일 결정
        let statusStyle = '';

        if (status === '등록완료') {
            statusStyle = 'background: #e8f5e9; color: #4caf50; font-weight: bold;';
        } else if (status === '미등록') {
            statusStyle = 'background: #fafafa; color: #999;';
        } else {
            // 진행률 표시 (예: 3/16)
            statusStyle = 'background: #fff3e0; color: #ff9800; font-weight: bold;';
        }

        // 총급여와 실수령액 표시 (미등록일 때는 0으로)
        const displayTotalSalary = totalSalary > 0 ? formatNumber(totalSalary) + 'đ' : '0đ';
        const displayTotalNet = totalNet > 0 ? formatNumber(totalNet) + 'đ' : '0đ';

        tr.innerHTML = `
            <td style="padding: 15px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${currentYear}.${String(month).padStart(2, '0')}</td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">${totalEmployees}명</td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: right;">${displayTotalSalary}</td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: right; color: #4caf50; font-weight: bold;">${displayTotalNet}</td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">
                <span style="padding: 5px 15px; border-radius: 20px; font-size: 0.9em; ${statusStyle}">${status}</span>
            </td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: center; font-size: 0.9em; color: #666;">${savedDate}</td>
            <td style="padding: 15px; border: 1px solid #ddd; text-align: center;">
                <button onclick="viewMonthDetail(${currentYear}, ${month})" style="padding: 6px 12px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em; margin: 2px;">📋 상세</button>
                <button onclick="exportMonthPayrollPDF(${currentYear}, ${month})" style="padding: 6px 12px; background: #e91e63; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em; margin: 2px;">📄 PDF</button>
                <button onclick="exportMonthPayrollExcel(${currentYear}, ${month})" style="padding: 6px 12px; background: #2196f3; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 0.9em; margin: 2px;">📊 엑셀</button>
            </td>
        `;

        tbody.appendChild(tr);
    }
}

// 월별 상세보기 - 급여 대장 모달 열기
function viewMonthDetail(year, month) {
    openPayrollModal(year, month);
}

// 급여 입력 페이지로 이동
function goToSalaryInput(month = null) {
    if (month) {
        // 월 정보를 URL 파라미터로 전달
        window.location.href = `salary-input.html?month=${month}`;
    } else {
        window.location.href = 'salary-input.html';
    }
}

// 특정 직원의 급여 입력 페이지로 이동 (급여대장에서 직원 클릭 시)
function goToEmployeeSalaryInput(employeeId) {
    const year = parseInt(document.getElementById('modalYear').value);
    const month = parseInt(document.getElementById('modalMonth').value);

    // 직원 ID, 년, 월 정보를 URL 파라미터로 전달
    window.location.href = `salary-input.html?employee=${employeeId}&year=${year}&month=${month}`;
}

// 숫자 포맷팅
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

// ==================== PDF 및 엑셀 출력 기능 ====================

// 월별 급여 대장 PDF 출력
function exportMonthPayrollPDF(year, month) {
    const historyKey = `payrollHistory_${year}_${month}`;
    const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');

    // 데이터가 없어도 빈 양식으로 출력
    const hasData = historyData.data && historyData.data.length > 0;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4'); // 가로 방향

    // 제목
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`PAYROLL REGISTER / BANG LUONG`, 148, 15, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${year} ${String(month).padStart(2, '0')}`, 148, 23, { align: 'center' });

    // 직원 급여 데이터 테이블
    let tableData = [];

    if (hasData) {
        // 데이터가 있을 때
        tableData = historyData.data.map((emp, index) => [
            index + 1,
            emp.name,
            emp.workDays + ' days',
            emp.normalHours + 'h',
            formatNumber(emp.basicPay),
            formatNumber(emp.allowances),
            formatNumber(emp.specialAllowance || 0),
            formatNumber(emp.totalSalary),
            formatNumber(emp.deductions),
            formatNumber(emp.incomeTax),
            formatNumber(emp.advancePayment || 0),
            formatNumber(emp.netSalary)
        ]);
    } else {
        // 데이터가 없을 때 빈 행 표시
        tableData = [
            ['', 'No data available / Chua co du lieu', '', '', '', '', '', '', '', '', '', '']
        ];
    }

    // 합계
    let totals = {
        workDays: 0,
        normalHours: 0,
        basicPay: 0,
        allowances: 0,
        specialAllowance: 0,
        totalSalary: 0,
        deductions: 0,
        incomeTax: 0,
        advancePayment: 0,
        netSalary: 0
    };

    if (hasData) {
        totals = {
            workDays: historyData.data.reduce((sum, d) => sum + d.workDays, 0),
            normalHours: historyData.data.reduce((sum, d) => sum + d.normalHours, 0),
            basicPay: historyData.data.reduce((sum, d) => sum + d.basicPay, 0),
            allowances: historyData.data.reduce((sum, d) => sum + d.allowances, 0),
            specialAllowance: historyData.data.reduce((sum, d) => sum + (d.specialAllowance || 0), 0),
            totalSalary: historyData.data.reduce((sum, d) => sum + d.totalSalary, 0),
            deductions: historyData.data.reduce((sum, d) => sum + d.deductions, 0),
            incomeTax: historyData.data.reduce((sum, d) => sum + d.incomeTax, 0),
            advancePayment: historyData.data.reduce((sum, d) => sum + (d.advancePayment || 0), 0),
            netSalary: historyData.data.reduce((sum, d) => sum + d.netSalary, 0)
        };
    }

    tableData.push([
        '',
        'TOTAL / TONG',
        totals.workDays + ' days',
        totals.normalHours + 'h',
        formatNumber(totals.basicPay),
        formatNumber(totals.allowances),
        formatNumber(totals.specialAllowance),
        formatNumber(totals.totalSalary),
        formatNumber(totals.deductions),
        formatNumber(totals.incomeTax),
        formatNumber(totals.advancePayment),
        formatNumber(totals.netSalary)
    ]);

    doc.autoTable({
        startY: 30,
        head: [[
            'No',
            'Name / Ten',
            'Days / Ngay',
            'Hours / Gio',
            'Basic / Co ban',
            'Allowance / PC',
            'Special / DB',
            'Total / Tong',
            'Insurance / BH',
            'Tax / Thue',
            'Advance / UL',
            'Net / Thuc linh'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [102, 126, 234],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' },
            6: { cellWidth: 28, halign: 'right' },
            7: { cellWidth: 25, halign: 'right' },
            8: { cellWidth: 25, halign: 'right' },
            9: { cellWidth: 28, halign: 'right' }
        },
        didParseCell: function(data) {
            // 합계 행 강조
            if (data.row.index === tableData.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [240, 240, 240];
            }
        }
    });

    // 하단 정보
    const yPos = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const employeeCount = hasData ? historyData.data.length : 0;
    doc.text(`Employees / So nhan vien: ${employeeCount}`, 20, yPos);
    doc.text(`Issued / Ngay phat hanh: ${new Date().toLocaleDateString('ko-KR')}`, 20, yPos + 7);

    // 서명란
    doc.text('Prepared by / Nguoi lap:', 50, yPos + 25);
    doc.text('Approved by / Nguoi duyet:', 150, yPos + 25);

    // PDF 저장
    doc.save(`급여대장_${year}_${String(month).padStart(2, '0')}.pdf`);

    if (hasData) {
        alert(`✅ ${year}년 ${month}월 급여 대장 PDF가 생성되었습니다!`);
    } else {
        alert(`✅ ${year}년 ${month}월 급여 대장 빈 양식 PDF가 생성되었습니다!\n\n데이터를 등록한 후 다시 출력하세요.`);
    }
}

// 월별 급여 대장 엑셀 출력
function exportMonthPayrollExcel(year, month) {
    const historyKey = `payrollHistory_${year}_${month}`;
    const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');

    // 데이터가 없어도 빈 양식으로 출력
    const hasData = historyData.data && historyData.data.length > 0;

    const wb = XLSX.utils.book_new();
    const wsData = [
        [`급여 대장 - ${year}년 ${month}월`],
        [],
        ['No', '직원명', '근무일', '정규시간', '기본급', '수당', '특수수당', '총급여', '보험료', '소득세', '선금', '실수령액']
    ];

    if (hasData) {
        // 데이터가 있을 때
        historyData.data.forEach((emp, index) => {
            wsData.push([
                index + 1,
                emp.name,
                emp.workDays + '일',
                emp.normalHours + 'h',
                emp.basicPay,
                emp.allowances,
                emp.specialAllowance || 0,
                emp.totalSalary,
                emp.deductions,
                emp.incomeTax,
                emp.advancePayment || 0,
                emp.netSalary
            ]);
        });
    } else {
        // 데이터가 없을 때 빈 행 표시
        wsData.push([
            '',
            '데이터 없음',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            ''
        ]);
    }

    // 합계
    let totals = {
        workDays: 0,
        normalHours: 0,
        basicPay: 0,
        allowances: 0,
        specialAllowance: 0,
        totalSalary: 0,
        deductions: 0,
        incomeTax: 0,
        advancePayment: 0,
        netSalary: 0
    };

    if (hasData) {
        totals = {
            workDays: historyData.data.reduce((sum, d) => sum + d.workDays, 0),
            normalHours: historyData.data.reduce((sum, d) => sum + d.normalHours, 0),
            basicPay: historyData.data.reduce((sum, d) => sum + d.basicPay, 0),
            allowances: historyData.data.reduce((sum, d) => sum + d.allowances, 0),
            specialAllowance: historyData.data.reduce((sum, d) => sum + (d.specialAllowance || 0), 0),
            totalSalary: historyData.data.reduce((sum, d) => sum + d.totalSalary, 0),
            deductions: historyData.data.reduce((sum, d) => sum + d.deductions, 0),
            incomeTax: historyData.data.reduce((sum, d) => sum + d.incomeTax, 0),
            advancePayment: historyData.data.reduce((sum, d) => sum + (d.advancePayment || 0), 0),
            netSalary: historyData.data.reduce((sum, d) => sum + d.netSalary, 0)
        };
    }

    wsData.push([
        '',
        '합계',
        totals.workDays + '일',
        totals.normalHours + 'h',
        totals.basicPay,
        totals.allowances,
        totals.specialAllowance,
        totals.totalSalary,
        totals.deductions,
        totals.incomeTax,
        totals.advancePayment,
        totals.netSalary
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        {wch: 5}, {wch: 20}, {wch: 10}, {wch: 10},
        {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15},
        {wch: 15}, {wch: 15}
    ];

    XLSX.utils.book_append_sheet(wb, ws, `${year}-${month}`);
    XLSX.writeFile(wb, `급여대장_${year}_${String(month).padStart(2, '0')}.xlsx`);

    if (hasData) {
        alert(`✅ ${year}년 ${month}월 급여 대장 엑셀이 생성되었습니다!`);
    } else {
        alert(`✅ ${year}년 ${month}월 급여 대장 빈 양식 엑셀이 생성되었습니다!\n\n데이터를 등록한 후 다시 출력하세요.`);
    }
}

// ==================== 급여 대장 모달 ====================

// 급여 대장 모달 열기
function openPayrollModal(year, month) {
    // 년도 옵션 생성
    const yearSelect = document.getElementById('modalYear');
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 5; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y + '년';
        if (y === year) option.selected = true;
        yearSelect.appendChild(option);
    }

    // 월 선택
    document.getElementById('modalMonth').value = month;

    // 모달 열기
    document.getElementById('payrollModal').classList.add('active');

    // 테이블 로드
    refreshModalPayrollTable();
}

// 급여 대장 모달 닫기
function closePayrollModal() {
    document.getElementById('payrollModal').classList.remove('active');
}

// 급여 대장 테이블 새로고침
function refreshModalPayrollTable() {
    const year = parseInt(document.getElementById('modalYear').value);
    const month = parseInt(document.getElementById('modalMonth').value);

    console.log(`=== refreshModalPayrollTable: ${year}년 ${month}월 ===`);

    // 저장된 데이터 불러오기
    const historyKey = `payrollHistory_${year}_${month}`;
    const historyData = JSON.parse(localStorage.getItem(historyKey) || '{}');
    const confirmedEmployees = historyData.confirmedEmployees || [];

    console.log('historyData:', historyData);
    console.log('confirmedEmployees:', confirmedEmployees);

    // 전체 직원 목록 가져오기
    const employees = JSON.parse(localStorage.getItem('vietnamPayrollEmployees') || '{}');

    // 모든 직원 데이터 준비 (확정 + 미확정)
    const allEmployeeData = [];

    for (const empId in employees) {
        const emp = employees[empId];
        const isConfirmed = confirmedEmployees.includes(empId);

        if (isConfirmed) {
            // 확정된 직원: 저장된 급여 데이터 찾기
            const savedData = historyData.data ? historyData.data.find(d => d.employeeId === empId) : null;
            if (savedData) {
                allEmployeeData.push({ ...savedData, isConfirmed: true });
            }
        } else {
            // 미확정 직원: 기본 정보만
            allEmployeeData.push({
                employeeId: empId,
                name: emp.name,
                basicSalary: emp.basicSalary || 0,
                isConfirmed: false,
                workDays: '-',
                normalHours: '-',
                basicPay: '-',
                allowances: '-',
                totalSalary: '-',
                deductions: '-',
                incomeTax: '-',
                netSalary: '-'
            });
        }
    }

    if (allEmployeeData.length === 0) {
        const tbody = document.getElementById('modalPayrollTableBody');
        tbody.innerHTML = '<tr><td colspan="12" style="padding: 40px; text-align: center; color: #999;">직원이 없습니다.</td></tr>';

        // 합계 초기화
        document.getElementById('modalTotalWorkDays').textContent = '-';
        document.getElementById('modalTotalWorkHours').textContent = '-';
        document.getElementById('modalTotalBasicSalary').textContent = '-';
        document.getElementById('modalTotalAllowances').textContent = '-';
        document.getElementById('modalTotalSpecialAllowance').textContent = '-';
        document.getElementById('modalTotalGrossSalary').textContent = '-';
        document.getElementById('modalTotalDeductions').textContent = '-';
        document.getElementById('modalTotalTax').textContent = '-';
        document.getElementById('modalTotalAdvancePayment').textContent = '-';
        document.getElementById('modalTotalNetSalary').textContent = '-';

        // 요약 정보 초기화
        document.getElementById('modalSummaryEmployeeCount').textContent = '0명';
        document.getElementById('modalSummaryNetSalary').textContent = '0đ';
        document.getElementById('modalSummaryDeductions').textContent = '0đ';
        document.getElementById('modalSummaryTax').textContent = '0đ';

        return;
    }

    // 테이블 렌더링
    renderModalPayrollTable(allEmployeeData);

    // 요약 정보 업데이트 (확정된 직원만)
    const confirmedData = allEmployeeData.filter(d => d.isConfirmed);
    updateModalSummary(confirmedData);
}

// 급여 대장 테이블 렌더링 (확정 + 미확정 직원 모두 표시)
function renderModalPayrollTable(payrollData) {
    const tbody = document.getElementById('modalPayrollTableBody');

    if (payrollData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="padding: 40px; text-align: center; color: #999;">직원이 없습니다.</td></tr>';
        return;
    }

    let html = '';
    payrollData.forEach((data, index) => {
        const isConfirmed = data.isConfirmed;
        const rowBg = isConfirmed ? 'white' : '#fafafa';
        const statusTag = isConfirmed ? '' : '<span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; margin-left: 5px;">미등록</span>';

        if (isConfirmed) {
            // 확정된 직원: 모든 정보 표시
            html += `
                <tr style="cursor: pointer; transition: background 0.2s; background: ${rowBg};"
                    onmouseover="this.style.background='#f8f9fa'"
                    onmouseout="this.style.background='${rowBg}'"
                    onclick="goToEmployeeSalaryInput('${data.employeeId}')"
                    title="클릭하여 ${data.name} 직원 데이터 수정">
                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${index + 1}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${data.name}${statusTag}</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${data.workDays}일</td>
                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${data.normalHours}h</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatNumber(data.basicPay)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">${formatNumber(data.allowances)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #9c27b0;">${formatNumber(data.specialAllowance || 0)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #2196f3; font-weight: bold;">${formatNumber(data.totalSalary)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #f44336;">${formatNumber(data.deductions)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #e91e63;">${formatNumber(data.incomeTax)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #ff9800;">${formatNumber(data.advancePayment || 0)}đ</td>
                    <td style="padding: 12px; text-align: right; border: 1px solid #ddd; color: #4caf50; font-weight: bold; font-size: 1.1em;">${formatNumber(data.netSalary)}đ</td>
                </tr>
            `;
        } else {
            // 미확정 직원: 이름, 기본급만 표시
            html += `
                <tr style="cursor: pointer; transition: background 0.2s; background: ${rowBg};"
                    onmouseover="this.style.background='#f0f0f0'"
                    onmouseout="this.style.background='${rowBg}'"
                    onclick="goToEmployeeSalaryInput('${data.employeeId}')"
                    title="클릭하여 ${data.name} 직원 데이터 등록">
                    <td style="padding: 12px; text-align: center; border: 1px solid #ddd; color: #999;">${index + 1}</td>
                    <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold; color: #999;">${data.name}${statusTag}</td>
                    <td colspan="2" style="padding: 12px; text-align: center; border: 1px solid #ddd; color: #999;">기본급: ${formatNumber(data.basicSalary)}đ</td>
                    <td colspan="8" style="padding: 12px; text-align: center; border: 1px solid #ddd; color: #ff9800; font-style: italic;">👆 클릭하여 데이터 등록</td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = html;

    // 합계 계산
    const totals = {
        workDays: payrollData.reduce((sum, d) => sum + d.workDays, 0),
        normalHours: payrollData.reduce((sum, d) => sum + d.normalHours, 0),
        basicPay: payrollData.reduce((sum, d) => sum + d.basicPay, 0),
        allowances: payrollData.reduce((sum, d) => sum + d.allowances, 0),
        specialAllowance: payrollData.reduce((sum, d) => sum + (d.specialAllowance || 0), 0),
        totalSalary: payrollData.reduce((sum, d) => sum + d.totalSalary, 0),
        deductions: payrollData.reduce((sum, d) => sum + d.deductions, 0),
        incomeTax: payrollData.reduce((sum, d) => sum + d.incomeTax, 0),
        advancePayment: payrollData.reduce((sum, d) => sum + (d.advancePayment || 0), 0),
        netSalary: payrollData.reduce((sum, d) => sum + d.netSalary, 0)
    };

    document.getElementById('modalTotalWorkDays').textContent = totals.workDays + '일';
    document.getElementById('modalTotalWorkHours').textContent = totals.normalHours + 'h';
    document.getElementById('modalTotalBasicSalary').textContent = formatNumber(totals.basicPay) + 'đ';
    document.getElementById('modalTotalAllowances').textContent = formatNumber(totals.allowances) + 'đ';
    document.getElementById('modalTotalSpecialAllowance').textContent = formatNumber(totals.specialAllowance) + 'đ';
    document.getElementById('modalTotalGrossSalary').textContent = formatNumber(totals.totalSalary) + 'đ';
    document.getElementById('modalTotalDeductions').textContent = formatNumber(totals.deductions) + 'đ';
    document.getElementById('modalTotalTax').textContent = formatNumber(totals.incomeTax) + 'đ';
    document.getElementById('modalTotalAdvancePayment').textContent = formatNumber(totals.advancePayment) + 'đ';
    document.getElementById('modalTotalNetSalary').textContent = formatNumber(totals.netSalary) + 'đ';
}

// 급여 대장 요약 정보 업데이트
function updateModalSummary(payrollData) {
    const employeeCount = payrollData.length;
    const totalNet = payrollData.reduce((sum, d) => sum + d.netSalary, 0);
    const totalDeductions = payrollData.reduce((sum, d) => sum + d.deductions, 0);
    const totalTax = payrollData.reduce((sum, d) => sum + d.incomeTax, 0);

    document.getElementById('modalSummaryEmployeeCount').textContent = employeeCount + '명';
    document.getElementById('modalSummaryNetSalary').textContent = formatNumber(totalNet) + 'đ';
    document.getElementById('modalSummaryDeductions').textContent = formatNumber(totalDeductions) + 'đ';
    document.getElementById('modalSummaryTax').textContent = formatNumber(totalTax) + 'đ';
}

// 페이지 로드시 초기화
window.onload = initDashboard;
