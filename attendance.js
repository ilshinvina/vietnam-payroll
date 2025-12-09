// ==================== 출퇴근 관리 시스템 (N CONG 스타일) ====================

// 전역 변수
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;

// 직원 데이터 (MONEY에서 로드)
let employees = {};

// 변경사항 추적
let hasUnsavedChanges = false;

// 자동저장 타이머
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 2000; // 2초 딜레이

// 근무 유형
const WORK_TYPES = [
    { key: 'normal', name: 'Giờ Chính', nameKr: '정상', className: 'type-normal' },
    { key: 'overtime', name: 'Tăng Ca', nameKr: '야근', className: 'type-overtime' },
    { key: 'night', name: 'Ca Đêm', nameKr: '야간', className: 'type-night' },
    { key: 'holiday', name: 'Chủ Nhật', nameKr: '휴일', className: 'type-holiday' }
];

// ==================== 초기화 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== 출퇴근 관리 시스템 초기화 (N CONG 스타일) ===');

    // 년도/월 선택기 초기화
    initDateSelectors();

    // MONEY에서 직원 데이터 로드
    loadEmployeeFromMoney();

    // 키보드 이벤트
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeQuickFill();
        }
    });

    // 페이지 나갈 때 저장 안 된 변경사항 경고
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '저장하지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
            return e.returnValue;
        }
    });
});

// ==================== 날짜 선택기 ====================
function initDateSelectors() {
    const yearSelect = document.getElementById('selectYear');
    const monthSelect = document.getElementById('selectMonth');

    // 년도 옵션 (2023~2030)
    for (let y = 2023; y <= 2030; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y + '년';
        if (y === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    // 월 옵션
    for (let m = 1; m <= 12; m++) {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m + '월';
        if (m === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    }

    // 이벤트 리스너
    yearSelect.addEventListener('change', () => {
        currentYear = parseInt(yearSelect.value);
        renderTable();
    });

    monthSelect.addEventListener('change', () => {
        currentMonth = parseInt(monthSelect.value);
        renderTable();
    });
}

// ==================== 직원 관리 ====================
function loadEmployeeFromMoney() {
    console.log('MONEY에서 직원 데이터 로드...');

    // localStorage에서 직원 데이터 로드 (MONEY 시스템 키: vietnamPayrollEmployees)
    const savedEmployees = localStorage.getItem('vietnamPayrollEmployees');
    if (savedEmployees) {
        employees = JSON.parse(savedEmployees);
        console.log('직원 수:', Object.keys(employees).length);
    } else {
        employees = {};
        console.log('저장된 직원 없음');
    }

    // 빠른 입력 모달의 직원 셀렉트 업데이트
    updateQuickEmployeeSelect();

    // 테이블 렌더링
    renderTable();
}

function updateQuickEmployeeSelect() {
    const select = document.getElementById('quickEmployee');
    if (!select) return;

    // 기존 옵션 유지하고 직원 옵션 추가
    select.innerHTML = '<option value="all">전체 직원</option>';

    // 코드순 정렬 (숫자 포함 자연 정렬)
    const sortedEmployees = Object.entries(employees).sort((a, b) => {
        const codeA = a[1].employeeCode || '';
        const codeB = b[1].employeeCode || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
    });

    sortedEmployees.forEach(([id, emp]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${emp.employeeCode || 'N/A'} - ${emp.name}`;
        select.appendChild(option);
    });
}

// ==================== 테이블 렌더링 ====================
function renderTable() {
    const thead = document.getElementById('tableHead');
    const tbody = document.getElementById('tableBody');
    const noDataMsg = document.getElementById('noDataMsg');
    const table = document.getElementById('attendanceTable');

    const employeeArray = Object.entries(employees);
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 직원이 없으면 메시지 표시
    if (employeeArray.length === 0) {
        table.style.display = 'none';
        noDataMsg.style.display = 'block';
        return;
    }

    table.style.display = '';
    noDataMsg.style.display = 'none';

    // 헤더 생성
    renderTableHeader(thead, daysInMonth);

    // 바디 생성
    renderTableBody(tbody, employeeArray, daysInMonth);
}

function renderTableHeader(thead, daysInMonth) {
    // 날짜별 요일 계산
    const getDayOfWeek = (day) => {
        return new Date(currentYear, currentMonth - 1, day).getDay();
    };

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    // 단일 헤더 행 (날짜 + 요일 함께 표시)
    let html = `
        <tr>
            <th class="col-stt">STT</th>
            <th class="col-code">CODE</th>
            <th class="col-name">Họ Và Tên</th>
            <th class="col-type">Loại</th>
    `;

    // 날짜 + 요일 헤더
    for (let day = 1; day <= daysInMonth; day++) {
        const dow = getDayOfWeek(day);
        const isSunday = dow === 0;
        html += `<th class="col-day ${isSunday ? 'sunday' : ''}"><div>${day}</div><div style="font-size:0.65rem;font-weight:normal;opacity:0.8;">${dayNames[dow]}</div></th>`;
    }

    html += `<th class="col-total">Tổng</th>`;
    html += `<th class="col-leave-used">Phép</th>`;
    html += `<th class="col-leave-remain">Còn</th>`;
    html += `</tr>`;

    thead.innerHTML = html;
}

function renderTableBody(tbody, employeeArray, daysInMonth) {
    // 코드순 정렬 (숫자 포함 자연 정렬)
    employeeArray.sort((a, b) => {
        const codeA = a[1].employeeCode || '';
        const codeB = b[1].employeeCode || '';
        return codeA.localeCompare(codeB, undefined, { numeric: true });
    });

    let html = '';
    let stt = 1;

    employeeArray.forEach(([id, emp]) => {
        // 이번 달 연차 사용 계산
        const leaveUsedThisMonth = calculateLeaveUsedThisMonth(id, emp);

        // 연간 전체 연차 사용 계산 (1월 ~ 현재 보는 달)
        const leaveUsedThisYear = calculateLeaveUsedThisYear(id, emp);

        // 연차 잔여 계산 (연간 기준) - 음수 허용
        const annualLeaveTotal = (emp.annualLeavePerYear || 12) + (emp.annualLeaveAdjustment || 0);
        const leaveRemaining = annualLeaveTotal - leaveUsedThisYear;

        WORK_TYPES.forEach((type, typeIdx) => {
            html += `<tr class="${typeIdx === 0 ? 'employee-group' : ''}">`;

            // STT, CODE, 이름 (첫 번째 행에만)
            if (typeIdx === 0) {
                html += `
                    <td class="col-stt" rowspan="4">${stt}</td>
                    <td class="col-code" rowspan="4">${emp.employeeCode || 'N/A'}</td>
                    <td class="col-name" rowspan="4">${emp.name}</td>
                `;
            }

            // 근무 유형
            html += `<td class="col-type ${type.className}">${type.name}</td>`;

            // 날짜별 입력 필드
            let total = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const value = getWorkValue(id, dateKey, type.key);
                const dow = new Date(currentYear, currentMonth - 1, day).getDay();
                const isSunday = dow === 0;

                // 연차/휴가 상태 확인 (첫 번째 행에만 색상 표시)
                const dateKeyNorm = normalizeDateKey(dateKey);
                const dateKeyDenorm = denormalizeDateKey(dateKey);
                const leaveType = emp.leaveData?.[dateKey] || emp.leaveData?.[dateKeyNorm] || emp.leaveData?.[dateKeyDenorm] || '';
                const leaveStyle = (typeIdx === 0 && leaveType) ? getLeaveStyle(leaveType) : '';

                total += value;

                html += `
                    <td class="col-day ${isSunday ? 'sunday' : ''}"
                        tabindex="0"
                        ${(typeIdx === 0 && leaveType) ? `data-leave="${leaveType}" style="${leaveStyle}"` : ''}
                        onmousedown="handleCellMouseDown(event)"
                        onmouseup="handleCellMouseUp(event)"
                        onclick="handleCellClick(event)"
                        ondblclick="handleCellDblClick(event)"
                        oncontextmenu="handleCellRightClick(event)"
                        onkeydown="handleCellKeyDown(event)">
                        <input type="number"
                               min="0"
                               max="24"
                               step="0.5"
                               value="${value || ''}"
                               data-employee="${id}"
                               data-date="${dateKey}"
                               data-type="${type.key}"
                               onchange="handleInputChange(this)"
                               onkeydown="handleInputKeyDown(event, this)"
                               style="pointer-events: none;">
                    </td>
                `;
            }

            // 합계
            html += `<td class="col-total" id="total-${id}-${type.key}">${total || ''}</td>`;

            // 연차 사용/잔여 (첫 번째 행에만)
            if (typeIdx === 0) {
                const remainStyle = leaveRemaining < 0 ? 'color: #f44336; font-weight: bold;' : '';
                const remainDisplay = leaveRemaining < 0 ? `${leaveRemaining}⚠️` : leaveRemaining;
                html += `
                    <td class="col-leave-used" rowspan="4" id="leave-used-${id}">${leaveUsedThisMonth || '-'}</td>
                    <td class="col-leave-remain" rowspan="4" id="leave-remain-${id}" style="${remainStyle}">${remainDisplay}</td>
                `;
            }

            html += '</tr>';
        });

        stt++;
    });

    tbody.innerHTML = html;
}

// 이번 달 연차 사용 계산
function calculateLeaveUsedThisMonth(employeeId, emp) {
    if (!emp.leaveData) return 0;

    let count = 0;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateKeyNorm = normalizeDateKey(dateKey);
        if (emp.leaveData[dateKey] === 'annual' || emp.leaveData[dateKeyNorm] === 'annual') {
            count++;
        }
    }

    return count;
}

// 연간 전체 연차 사용 계산 (1월 ~ 현재 보는 달까지)
// annual(연차) + sick(병가) = 연차에서 차감
// special(경조사/특별휴가) = 별도 (연차 차감 안 함)
function calculateLeaveUsedThisYear(employeeId, emp) {
    if (!emp.leaveData) return 0;

    let count = 0;

    // 1월부터 현재 선택된 월까지 계산
    for (let month = 1; month <= currentMonth; month++) {
        const daysInMonth = new Date(currentYear, month, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateKeyNorm = normalizeDateKey(dateKey);
            const leaveType = emp.leaveData[dateKey] || emp.leaveData[dateKeyNorm];
            // 연차 + 병가만 카운트 (경조사는 제외)
            if (leaveType === 'annual' || leaveType === 'sick') {
                count++;
            }
        }
    }

    return count;
}

// 휴가 타입별 스타일 반환
function getLeaveStyle(leaveType) {
    switch (leaveType) {
        case 'holiday': return 'background: #2196f3; color: white;';
        case 'annual': return 'background: #4caf50; color: white;';
        case 'special': return 'background: #9c27b0; color: white;';
        case 'sick': return 'background: #ff9800; color: white;';
        case 'excused': return 'background: #607d8b; color: white;';
        case 'absent': return 'background: #000000; color: white;';
        default: return '';
    }
}

// ==================== 데이터 관리 ====================
// 날짜 키 정규화 (YYYY-M-D → YYYY-MM-DD)
function normalizeDateKey(dateKey) {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    return `${parts[0]}-${String(parseInt(parts[1])).padStart(2, '0')}-${String(parseInt(parts[2])).padStart(2, '0')}`;
}

// 날짜 키 비정규화 (YYYY-MM-DD → YYYY-M-D)
function denormalizeDateKey(dateKey) {
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    return `${parseInt(parts[0])}-${parseInt(parts[1])}-${parseInt(parts[2])}`;
}

function getWorkValue(employeeId, dateKey, typeKey) {
    const emp = employees[employeeId];
    if (!emp) return 0;

    // 두 가지 포맷 모두 확인 (구버전: 2024-12-5, 신버전: 2024-12-05)
    const dateKeyNorm = normalizeDateKey(dateKey);
    const dateKeyDenorm = denormalizeDateKey(dateKey);

    switch (typeKey) {
        case 'normal':
            return emp.normalHoursData?.[dateKey] || emp.normalHoursData?.[dateKeyNorm] || emp.normalHoursData?.[dateKeyDenorm] || 0;
        case 'overtime':
            return emp.overtimeData?.[dateKey] || emp.overtimeData?.[dateKeyNorm] || emp.overtimeData?.[dateKeyDenorm] || 0;
        case 'night':
            return emp.nightData?.[dateKey] || emp.nightData?.[dateKeyNorm] || emp.nightData?.[dateKeyDenorm] || 0;
        case 'holiday':
            return emp.sundayData?.[dateKey] || emp.sundayData?.[dateKeyNorm] || emp.sundayData?.[dateKeyDenorm] || 0;
        default: return 0;
    }
}

function setWorkValue(employeeId, dateKey, typeKey, value) {
    const emp = employees[employeeId];
    if (!emp) return;

    // 데이터 구조 초기화
    if (!emp.normalHoursData) emp.normalHoursData = {};
    if (!emp.overtimeData) emp.overtimeData = {};
    if (!emp.nightData) emp.nightData = {};
    if (!emp.sundayData) emp.sundayData = {};

    const numValue = parseFloat(value) || 0;

    switch (typeKey) {
        case 'normal':
            if (numValue > 0) emp.normalHoursData[dateKey] = numValue;
            else delete emp.normalHoursData[dateKey];
            break;
        case 'overtime':
            if (numValue > 0) emp.overtimeData[dateKey] = numValue;
            else delete emp.overtimeData[dateKey];
            break;
        case 'night':
            if (numValue > 0) emp.nightData[dateKey] = numValue;
            else delete emp.nightData[dateKey];
            break;
        case 'holiday':
            if (numValue > 0) emp.sundayData[dateKey] = numValue;
            else delete emp.sundayData[dateKey];
            break;
    }

    // 변경사항 표시 (자동저장 비활성화 - 보내기 버튼 필요)
    hasUnsavedChanges = true;
    updateSaveIndicator();
}

function handleInputChange(input) {
    const employeeId = input.dataset.employee;
    const dateKey = input.dataset.date;
    const typeKey = input.dataset.type;
    const value = input.value;

    setWorkValue(employeeId, dateKey, typeKey, value);

    // 합계 업데이트
    updateTotal(employeeId, typeKey);
}

// 셀 키보드 이벤트 (클릭으로 선택된 상태)
function handleCellKeyDown(event) {
    const td = event.target.closest('td');
    const input = td ? td.querySelector('input') : null;
    if (!input) return;

    // Backspace/Delete: 초기화
    if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        input.value = '';
        handleInputChange(input);
        return;
    }

    // 숫자 키: 해당 숫자로 설정하고 입력 모드
    if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        input.value = event.key;
        handleInputChange(input);
        // 입력 모드 진입
        input.style.pointerEvents = 'auto';
        input.focus();
        // 커서를 끝으로
        input.setSelectionRange(input.value.length, input.value.length);
        input.addEventListener('blur', function onBlur() {
            input.style.pointerEvents = 'none';
            input.removeEventListener('blur', onBlur);
        });
        return;
    }

    // 엔터: 다음 셀로 이동
    if (event.key === 'Enter') {
        event.preventDefault();
        moveToNextCell(input);
        return;
    }
}

// 입력 필드 키보드 이벤트 (더블클릭으로 입력 모드)
function handleInputKeyDown(event, input) {
    // 엔터: 저장 후 다음 셀로 이동
    if (event.key === 'Enter') {
        event.preventDefault();
        handleInputChange(input);
        input.blur();
        moveToNextCell(input);
    }
}

// 다음 셀로 이동
function moveToNextCell(input) {
    const employeeId = input.dataset.employee;
    const dateKey = input.dataset.date;
    const typeKey = input.dataset.type;

    // 타입 순서: normal → overtime → night → holiday
    const typeOrder = ['normal', 'overtime', 'night', 'holiday'];
    const currentTypeIndex = typeOrder.indexOf(typeKey);

    // 다음 타입 찾기
    let nextTd = null;

    if (currentTypeIndex < typeOrder.length - 1) {
        const nextType = typeOrder[currentTypeIndex + 1];
        const nextInput = document.querySelector(
            `input[data-employee="${employeeId}"][data-date="${dateKey}"][data-type="${nextType}"]`
        );
        if (nextInput) nextTd = nextInput.closest('td');
    }

    if (!nextTd) {
        // 다음 직원의 같은 날짜, 첫번째 타입(normal)
        const allInputs = document.querySelectorAll(`input[data-date="${dateKey}"][data-type="normal"]`);
        const inputArray = Array.from(allInputs);
        const currentIndex = inputArray.findIndex(inp => inp.dataset.employee === employeeId);
        if (currentIndex < inputArray.length - 1) {
            nextTd = inputArray[currentIndex + 1].closest('td');
        }
    }

    if (nextTd) {
        nextTd.focus();
    }
}

// 롱클릭 타이머
let longClickTimer = null;
let isLongClick = false;

// 셀 마우스다운: 롱클릭 감지 시작
function handleCellMouseDown(event) {
    const td = event.target.closest('td');
    if (!td) return;

    isLongClick = false;
    longClickTimer = setTimeout(() => {
        isLongClick = true;
        showLeaveMenu(event, td);
    }, 500); // 500ms 롱클릭
}

// 셀 마우스업: 롱클릭 타이머 취소
function handleCellMouseUp(event) {
    if (longClickTimer) {
        clearTimeout(longClickTimer);
        longClickTimer = null;
    }
}

// 셀 클릭: +0.5 (롱클릭이 아닐 때만)
function handleCellClick(event) {
    if (isLongClick) {
        isLongClick = false;
        return;
    }

    const td = event.target.closest('td');
    const input = td.querySelector('input');
    if (!input) return;

    // 연차/특수연차 상태면 클릭 무시
    if (td.dataset.leave) return;

    const currentValue = parseFloat(input.value) || 0;
    const newValue = Math.min(24, currentValue + 0.5);
    input.value = newValue || '';
    handleInputChange(input);
}

// 연차 메뉴 표시
function showLeaveMenu(event, td) {
    event.preventDefault();

    // 기존 메뉴 제거
    const existingMenu = document.getElementById('leaveMenu');
    if (existingMenu) existingMenu.remove();

    const input = td.querySelector('input');
    const currentLeave = td.dataset.leave || '';

    const menu = document.createElement('div');
    menu.id = 'leaveMenu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        min-width: 150px;
        overflow: hidden;
        visibility: hidden;
    `;

    const options = [
        { key: '', label: '✖ 취소 (일반)', color: '' },
        { key: 'holiday', label: '📅 공휴일', color: '#2196f3' },
        { key: 'annual', label: '🏖️ 연차', color: '#4caf50' },
        { key: 'special', label: '🖤 특별휴가 (경조사)', color: '#9c27b0' },
        { key: 'sick', label: '🏥 병가', color: '#ff9800' },
        { key: 'excused', label: '📝 사유결근', color: '#607d8b' },
        { key: 'absent', label: '❌ 무단결근', color: '#000000' }
    ];

    options.forEach(opt => {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            ${currentLeave === opt.key ? 'background: #e3f2fd;' : ''}
        `;
        item.textContent = opt.label;
        item.onmouseover = () => item.style.background = '#f5f5f5';
        item.onmouseout = () => item.style.background = currentLeave === opt.key ? '#e3f2fd' : '';
        item.onclick = () => {
            setLeaveType(td, input, opt.key, opt.color);
            menu.remove();
        };
        menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = event.clientX;
    let top = event.clientY;

    // 오른쪽으로 넘치면 왼쪽으로 표시
    if (left + menuRect.width > viewportWidth - 10) {
        left = viewportWidth - menuRect.width - 10;
    }

    // 아래로 넘치면 위로 표시하거나 조정
    if (top + menuRect.height > viewportHeight - 10) {
        // 클릭 위치 위에 메뉴를 표시
        top = event.clientY - menuRect.height;
        // 그래도 위로 넘치면 화면 상단에 맞춤
        if (top < 10) {
            top = 10;
        }
    }

    // 왼쪽 경계 확인
    if (left < 10) {
        left = 10;
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';

    // 메뉴 외부 클릭시 닫기
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

// 연차 타입 설정
function setLeaveType(td, input, leaveType, color) {
    const employeeId = input.dataset.employee;
    const dateKey = input.dataset.date;
    const typeKey = input.dataset.type;
    const emp = employees[employeeId];

    // 연차 선택 시 초과 여부 확인
    if (leaveType === 'annual' && emp) {
        const currentLeaveUsed = calculateLeaveUsedThisYear(employeeId, emp);
        const annualLeaveTotal = (emp.annualLeavePerYear || 12) + (emp.annualLeaveAdjustment || 0);
        const wouldRemain = annualLeaveTotal - currentLeaveUsed - 1; // 이번 연차 사용 후

        if (wouldRemain < 0) {
            // 초과 사용 경고
            const reason = prompt(
                `⚠️ 연차 초과 사용!\n\n` +
                `총 연차: ${annualLeaveTotal}일\n` +
                `사용 예정: ${currentLeaveUsed + 1}일\n` +
                `초과: ${Math.abs(wouldRemain)}일\n\n` +
                `계속하시려면 사유를 입력하세요:`,
                ''
            );

            if (reason === null) {
                // 취소
                return;
            }

            // 사유 저장
            if (!emp.leaveReasons) emp.leaveReasons = {};
            emp.leaveReasons[dateKey] = reason || '(사유 미입력)';
        }
    }

    // 첫 번째 행(normal)의 셀 찾기 - 색상은 여기에만 적용
    const normalInput = document.querySelector(
        `input[data-employee="${employeeId}"][data-date="${dateKey}"][data-type="normal"]`
    );
    const normalTd = normalInput ? normalInput.closest('td') : null;

    if (leaveType) {
        // 첫 번째 행에만 색상 적용
        if (normalTd) {
            normalTd.dataset.leave = leaveType;
            normalTd.style.background = color;
            normalTd.style.color = 'white';
        }

        // 연차/특별휴가/병가는 8시간으로 설정 (normal행에만)
        if (leaveType === 'annual' || leaveType === 'special' || leaveType === 'sick') {
            if (normalInput) normalInput.value = 8;
        } else if (leaveType === 'excused' || leaveType === 'absent' || leaveType === 'holiday') {
            if (normalInput) normalInput.value = '';  // 사유결근/무단결근/공휴일은 0시간
        }
    } else {
        // 색상 제거
        if (normalTd) {
            delete normalTd.dataset.leave;
            normalTd.style.background = '';
            normalTd.style.color = '';
        }
    }

    // normal 입력값 변경 처리
    if (normalInput) handleInputChange(normalInput);

    // 직원 데이터에 저장
    saveLeaveData(employeeId, dateKey, leaveType);
}

// 연차 데이터 저장 (급여계산기 연동)
function saveLeaveData(employeeId, dateKey, leaveType) {
    const emp = employees[employeeId];
    if (!emp) return;

    if (!emp.leaveData) emp.leaveData = {};
    if (!emp.excusedAbsents) emp.excusedAbsents = [];
    if (!emp.absents) emp.absents = [];
    if (!emp.annualLeaveDays) emp.annualLeaveDays = [];

    // 기존 데이터에서 해당 날짜 제거
    if (!emp.holidays) emp.holidays = [];
    emp.holidays = emp.holidays.filter(d => d !== dateKey);
    emp.excusedAbsents = emp.excusedAbsents.filter(d => d !== dateKey);
    emp.absents = emp.absents.filter(d => d !== dateKey);
    emp.annualLeaveDays = emp.annualLeaveDays.filter(d => d !== dateKey);
    if (emp.specialLeaveDays) emp.specialLeaveDays = emp.specialLeaveDays.filter(d => d !== dateKey);

    if (leaveType) {
        emp.leaveData[dateKey] = leaveType;

        // 급여계산기 연동: 해당 배열에 추가
        if (leaveType === 'holiday') {
            emp.holidays.push(dateKey);
        } else if (leaveType === 'excused') {
            emp.excusedAbsents.push(dateKey);
        } else if (leaveType === 'absent') {
            emp.absents.push(dateKey);
        } else if (leaveType === 'annual') {
            emp.annualLeaveDays.push(dateKey);
        } else if (leaveType === 'sick') {
            // 병가는 연차로 처리 (유급)
            emp.annualLeaveDays.push(dateKey);
        }
        // special(경조사/특별휴가)은 연차와 별개 - 별도 배열에 저장
        else if (leaveType === 'special') {
            if (!emp.specialLeaveDays) emp.specialLeaveDays = [];
            emp.specialLeaveDays = emp.specialLeaveDays.filter(d => d !== dateKey);
            emp.specialLeaveDays.push(dateKey);
        }
    } else {
        delete emp.leaveData[dateKey];
    }

    // 변경사항 표시 (자동저장 비활성화 - 보내기 버튼 필요)
    hasUnsavedChanges = true;
    updateSaveIndicator();

    // 연차 사용/잔여 표시 업데이트
    updateLeaveDisplay(employeeId, emp);
}

// 연차 표시 업데이트
function updateLeaveDisplay(employeeId, emp) {
    const leaveUsedThisMonth = calculateLeaveUsedThisMonth(employeeId, emp);
    const leaveUsedThisYear = calculateLeaveUsedThisYear(employeeId, emp);
    const annualLeaveTotal = (emp.annualLeavePerYear || 12) + (emp.annualLeaveAdjustment || 0);
    const leaveRemaining = annualLeaveTotal - leaveUsedThisYear;

    const usedEl = document.getElementById(`leave-used-${employeeId}`);
    const remainEl = document.getElementById(`leave-remain-${employeeId}`);

    if (usedEl) usedEl.textContent = leaveUsedThisMonth || '-';
    if (remainEl) {
        if (leaveRemaining < 0) {
            remainEl.textContent = `${leaveRemaining}⚠️`;
            remainEl.style.color = '#f44336';
            remainEl.style.fontWeight = 'bold';
        } else {
            remainEl.textContent = leaveRemaining;
            remainEl.style.color = '';
            remainEl.style.fontWeight = '';
        }
    }
}

// 셀 더블클릭: 숫자 입력 모드
function handleCellDblClick(event) {
    const td = event.target.closest('td');
    const input = td.querySelector('input');
    if (!input) return;

    // pointer-events 활성화하고 포커스
    input.style.pointerEvents = 'auto';
    input.focus();
    input.select();

    // blur 시 다시 비활성화
    input.addEventListener('blur', function onBlur() {
        input.style.pointerEvents = 'none';
        input.removeEventListener('blur', onBlur);
    });
}

// 셀 우클릭: -0.5
function handleCellRightClick(event) {
    event.preventDefault();
    const td = event.target.closest('td');
    const input = td.querySelector('input');
    if (!input) return;

    const currentValue = parseFloat(input.value) || 0;
    const newValue = Math.max(0, currentValue - 0.5);
    input.value = newValue || '';
    handleInputChange(input);
}

function updateTotal(employeeId, typeKey) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    let total = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        total += getWorkValue(employeeId, dateKey, typeKey);
    }

    const totalCell = document.getElementById(`total-${employeeId}-${typeKey}`);
    if (totalCell) {
        totalCell.textContent = total || '';
    }
}

// ==================== 빠른 입력 ====================
function openQuickFill() {
    document.getElementById('quickFillModal').classList.add('active');

    // 현재 월의 마지막 일자로 설정
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    document.getElementById('quickDayEnd').value = daysInMonth;
    document.getElementById('quickDayEnd').max = daysInMonth;
    document.getElementById('quickDayStart').max = daysInMonth;
}

function closeQuickFill() {
    document.getElementById('quickFillModal').classList.remove('active');
}

function setQuickDays(start, end) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    document.getElementById('quickDayStart').value = start;
    document.getElementById('quickDayEnd').value = Math.min(end, daysInMonth);
}

function setQuickWeekdays() {
    // 평일만 선택 - 별도 처리 필요
    alert('평일(월~토)에만 적용됩니다.');
    setQuickDays(1, new Date(currentYear, currentMonth, 0).getDate());
}

function applyQuickFill() {
    const targetEmployee = document.getElementById('quickEmployee').value;
    const dayStart = parseInt(document.getElementById('quickDayStart').value);
    const dayEnd = parseInt(document.getElementById('quickDayEnd').value);
    const normalHours = parseInt(document.getElementById('quickNormal').value) || 0;
    const overtimeHours = parseInt(document.getElementById('quickOvertime').value) || 0;

    // 대상 직원 결정
    let targetIds = [];
    if (targetEmployee === 'all') {
        targetIds = Object.keys(employees);
    } else {
        targetIds = [targetEmployee];
    }

    // 평일만 체크
    const weekdaysOnly = document.getElementById('quickDayStart').value === '1' &&
                         document.getElementById('quickDayEnd').value === String(new Date(currentYear, currentMonth, 0).getDate());

    let appliedCount = 0;

    targetIds.forEach(empId => {
        for (let day = dayStart; day <= dayEnd; day++) {
            const date = new Date(currentYear, currentMonth - 1, day);
            const dow = date.getDay();

            // 일요일 건너뛰기 (평일만 모드에서)
            if (weekdaysOnly && dow === 0) continue;

            const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (normalHours > 0) {
                setWorkValue(empId, dateKey, 'normal', normalHours);
            }
            if (overtimeHours > 0) {
                setWorkValue(empId, dateKey, 'overtime', overtimeHours);
            }

            appliedCount++;
        }
    });

    closeQuickFill();
    renderTable();

    alert(`✅ ${targetIds.length}명 직원의 ${appliedCount / targetIds.length}일 데이터가 적용되었습니다.`);
}

// ==================== 급여계산기 연동 ====================

// 급여계산기에서 데이터 들고오기 (새로고침)
function pullFromSalaryCalc() {
    if (!confirm('📥 저장된 데이터를 불러옵니다.\n\n현재 화면의 변경사항은 사라집니다.\n계속하시겠습니까?')) {
        return;
    }

    const savedEmployees = localStorage.getItem('vietnamPayrollEmployees');
    if (!savedEmployees) {
        alert('❌ 저장된 데이터가 없습니다!');
        return;
    }

    employees = JSON.parse(savedEmployees);

    // 선택된 월에 해당하는 데이터가 있는지 확인
    let dataFound = 0;
    let emptyData = 0;
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthPrefixAlt = `${currentYear}-${currentMonth}`;

    Object.keys(employees).forEach(empId => {
        const emp = employees[empId];
        let hasData = false;

        // overtimeData 확인
        if (emp.overtimeData) {
            Object.keys(emp.overtimeData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixAlt)) {
                    hasData = true;
                }
            });
        }
        // normalHoursData 확인
        if (emp.normalHoursData) {
            Object.keys(emp.normalHoursData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixAlt)) {
                    hasData = true;
                }
            });
        }
        // sundayData 확인 (일요일 특근)
        if (emp.sundayData) {
            Object.keys(emp.sundayData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixAlt)) {
                    hasData = true;
                }
            });
        }
        // nightData 확인 (야간)
        if (emp.nightData) {
            Object.keys(emp.nightData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixAlt)) {
                    hasData = true;
                }
            });
        }
        // nightOTData 확인 (야간OT)
        if (emp.nightOTData) {
            Object.keys(emp.nightOTData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixAlt)) {
                    hasData = true;
                }
            });
        }

        if (hasData) dataFound++;
        else emptyData++;
    });

    console.log(`=== ${currentYear}년 ${currentMonth}월 데이터 현황 ===`);
    console.log(`데이터 있는 직원: ${dataFound}명`);
    console.log(`데이터 없는 직원: ${emptyData}명`);
    console.log(`총 직원: ${Object.keys(employees).length}명`);
    console.log('==========================================');

    updateQuickEmployeeSelect();
    renderTable();

    hasUnsavedChanges = false;
    updateSaveIndicator();

    alert(`✅ 데이터를 불러왔습니다!\n\n📅 ${currentYear}년 ${currentMonth}월\n👥 총 직원: ${Object.keys(employees).length}명\n📊 데이터 있음: ${dataFound}명\n⚠️ 데이터 없음: ${emptyData}명`);
}

// 급여계산기로 데이터 보내기 (저장)
function pushToSalaryCalc(silent = false) {
    localStorage.setItem('vietnamPayrollEmployees', JSON.stringify(employees));

    // 변경사항 저장 완료
    hasUnsavedChanges = false;
    updateSaveIndicator();

    if (!silent) {
        // 급여계산기로 이동 + 자동 계산
        if (confirm('✅ 데이터가 저장되었습니다!\n\n급여계산기로 이동해서 전체 직원 급여를 자동 계산하시겠습니까?')) {
            // 자동 계산 모드로 이동 (현재 년/월 정보 포함)
            window.location.href = `salary-input.html?autoCalc=all&year=${currentYear}&month=${currentMonth}`;
        }
    }
    console.log('급여계산기로 데이터 전송 완료' + (silent ? ' (자동저장)' : ''));
}

// ==================== 자동저장 시스템 (비활성화) ====================
// 출퇴근 관리는 수동 저장만 지원 (보내기 버튼)
// 급여계산기가 데이터의 우선순위를 가짐

// // 자동저장 예약 (디바운스) - 비활성화됨
// function scheduleAutoSave() {
//     // 기존 타이머 취소
//     if (autoSaveTimer) {
//         clearTimeout(autoSaveTimer);
//     }
//
//     // 2초 후 자동저장
//     autoSaveTimer = setTimeout(() => {
//         autoSave();
//     }, AUTO_SAVE_DELAY);
//
//     // 저장 대기 중 표시
//     updateSaveIndicator('pending');
// }

// // 자동저장 실행 - 비활성화됨
// function autoSave() {
//     if (!hasUnsavedChanges) return;
//
//     localStorage.setItem('vietnamPayrollEmployees', JSON.stringify(employees));
//     hasUnsavedChanges = false;
//     updateSaveIndicator('saved');
//
//     console.log('✅ 자동저장 완료:', new Date().toLocaleTimeString());
// }

// 저장 상태 표시 업데이트
function updateSaveIndicator(status = null) {
    const pushBtn = document.querySelector('button[onclick="pushToSalaryCalc()"]');
    if (!pushBtn) return;

    if (!hasUnsavedChanges) {
        // 저장된 상태
        pushBtn.textContent = '📤 급여계산기로 보내기';
        pushBtn.style.background = '#4caf50';
        pushBtn.style.animation = '';
    } else {
        // 미저장 상태 - 보내기 필요
        pushBtn.textContent = '📤 급여계산기로 보내기 ●';
        pushBtn.style.background = '#ff9800';
        pushBtn.style.animation = 'pulse 1s infinite';
    }
}

// 기존 저장 함수 (하위 호환)
function saveAllData() {
    pushToSalaryCalc();
}

// ==================== 데이터 초기화 ====================
function resetAttendanceData() {
    // 초기화 옵션 선택
    const options = [
        '1. 현재 직원의 이번 달만 초기화',
        '2. 현재 직원의 전체 데이터 초기화',
        '3. 모든 직원의 이번 달만 초기화',
        '4. 모든 직원의 전체 데이터 초기화'
    ];

    const choice = prompt(
        '⚠️ 초기화 옵션을 선택하세요:\n\n' +
        options.join('\n') +
        '\n\n숫자를 입력하세요 (1-4):'
    );

    if (!choice || !['1', '2', '3', '4'].includes(choice.trim())) {
        if (choice !== null) {
            alert('취소되었습니다.');
        }
        return;
    }

    const confirmMsg = {
        '1': `현재 직원의 ${currentYear}년 ${currentMonth}월 데이터를`,
        '2': '현재 직원의 전체 데이터를',
        '3': `모든 직원의 ${currentYear}년 ${currentMonth}월 데이터를`,
        '4': '모든 직원의 전체 데이터를'
    };

    if (!confirm(`⚠️ 정말로 ${confirmMsg[choice.trim()]} 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!`)) {
        return;
    }

    const option = choice.trim();
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthPrefixOld = `${currentYear}-${currentMonth}`;

    // 데이터 초기화 함수
    function clearEmployeeMonth(emp) {
        // 해당 월의 데이터만 삭제
        ['overtimeData', 'nightData', 'sundayData', 'normalHoursData', 'nightOTData'].forEach(dataKey => {
            if (emp[dataKey]) {
                Object.keys(emp[dataKey]).forEach(key => {
                    if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixOld)) {
                        delete emp[dataKey][key];
                    }
                });
            }
        });

        // 휴가/결근 데이터 (배열)
        ['holidays', 'excusedAbsents', 'absents', 'annualLeaveDays'].forEach(arrKey => {
            if (emp[arrKey] && Array.isArray(emp[arrKey])) {
                emp[arrKey] = emp[arrKey].filter(key =>
                    !key.startsWith(monthPrefix) && !key.startsWith(monthPrefixOld)
                );
            }
        });

        // leaveData (객체)
        if (emp.leaveData) {
            Object.keys(emp.leaveData).forEach(key => {
                if (key.startsWith(monthPrefix) || key.startsWith(monthPrefixOld)) {
                    delete emp.leaveData[key];
                }
            });
        }

        // nightShiftDays (Set을 배열로 저장)
        if (emp.nightShiftDays && Array.isArray(emp.nightShiftDays)) {
            emp.nightShiftDays = emp.nightShiftDays.filter(key =>
                !key.startsWith(monthPrefix) && !key.startsWith(monthPrefixOld)
            );
        }
    }

    function clearEmployeeAll(emp) {
        // 전체 데이터 삭제
        emp.overtimeData = {};
        emp.nightData = {};
        emp.sundayData = {};
        emp.normalHoursData = {};
        emp.nightOTData = {};
        emp.holidays = [];
        emp.excusedAbsents = [];
        emp.absents = [];
        emp.annualLeaveDays = [];
        emp.leaveData = {};
        emp.nightShiftDays = [];
    }

    // 선택된 옵션에 따라 초기화
    const selectedEmpId = document.querySelector('.employee-tab.active')?.dataset?.empId;

    if (option === '1' && selectedEmpId && employees[selectedEmpId]) {
        clearEmployeeMonth(employees[selectedEmpId]);
    } else if (option === '2' && selectedEmpId && employees[selectedEmpId]) {
        clearEmployeeAll(employees[selectedEmpId]);
    } else if (option === '3') {
        Object.values(employees).forEach(emp => clearEmployeeMonth(emp));
    } else if (option === '4') {
        Object.values(employees).forEach(emp => clearEmployeeAll(emp));
    }

    // 테이블 새로고침
    renderTable();

    // 초기화 후 저장하지 않음 - 사용자가 "들고오기"로 복원 가능하게
    // 자동저장 타이머 취소 (초기화 후 자동저장 방지)
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    hasUnsavedChanges = true;
    updateSaveIndicator();

    alert('✅ 데이터가 초기화되었습니다!\n\n⚠️ 아직 저장되지 않았습니다.\n• 저장: "급여계산기로 보내기" 클릭\n• 복원: "급여계산기에서 들고오기" 클릭');
    console.log(`데이터 초기화 완료: 옵션 ${option} (미저장 상태)`);
}

// ==================== 엑셀 내보내기 ====================
function exportToExcel() {
    // 내보내기 전 자동저장
    if (hasUnsavedChanges) {
        localStorage.setItem('vietnamPayrollEmployees', JSON.stringify(employees));
        hasUnsavedChanges = false;
        console.log('📤 엑셀 내보내기 전 자동저장 완료');
    }

    const wb = XLSX.utils.book_new();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    // 시트 1: N CONG 스타일 (메인)
    const ncongData = createNCongStyle(daysInMonth);
    const ws1 = XLSX.utils.aoa_to_sheet(ncongData);

    // 열 너비 설정
    ws1['!cols'] = [
        { wch: 5 },   // STT
        { wch: 10 },  // CODE
        { wch: 20 },  // Name
        { wch: 10 }   // Type
    ];
    for (let i = 0; i < daysInMonth; i++) {
        ws1['!cols'].push({ wch: 4 });
    }
    ws1['!cols'].push({ wch: 6 }); // Total

    XLSX.utils.book_append_sheet(wb, ws1, 'CHAM CONG');

    // 시트 2: MONEY 연동용
    const moneyData = createMoneyImportStyle(daysInMonth);
    const ws2 = XLSX.utils.aoa_to_sheet(moneyData);
    XLSX.utils.book_append_sheet(wb, ws2, 'MONEY연동');

    // 시트 3: 요약
    const summaryData = createSummaryStyle();
    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws3, '요약');

    // 다운로드
    const fileName = `CHAM_CONG_${currentYear}_${String(currentMonth).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(wb, fileName);

    alert(`✅ ${fileName} 다운로드 완료!`);
}

function createNCongStyle(daysInMonth) {
    // 헤더
    const header1 = [`BẢNG CHẤM CÔNG - Tháng ${currentMonth}/${currentYear}`];
    const header2 = [];
    const header3 = ['STT', 'CODE', 'Họ Và Tên', 'Loại'];

    for (let day = 1; day <= daysInMonth; day++) {
        header3.push(String(day));
    }
    header3.push('Tổng', 'Phép', 'Còn');

    const data = [header1, header2, header3];

    // 직원 데이터 (코드순 정렬)
    const sortedEmployees = Object.entries(employees).sort((a, b) => {
        const codeA = a[1].employeeCode || '';
        const codeB = b[1].employeeCode || '';
        return codeA.localeCompare(codeB);
    });

    let stt = 1;
    sortedEmployees.forEach(([id, emp]) => {
        // 연차 계산 (음수 허용)
        const leaveUsedThisMonth = calculateLeaveUsedThisMonth(id, emp);
        const leaveUsedThisYear = calculateLeaveUsedThisYear(id, emp);
        const annualLeaveTotal = (emp.annualLeavePerYear || 12) + (emp.annualLeaveAdjustment || 0);
        const leaveRemaining = annualLeaveTotal - leaveUsedThisYear;

        WORK_TYPES.forEach((type, typeIdx) => {
            const row = [
                typeIdx === 0 ? stt : '',
                typeIdx === 0 ? (emp.employeeCode || '') : '',
                typeIdx === 0 ? emp.name : '',
                type.name
            ];

            let total = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateKey = `${currentYear}-${currentMonth}-${day}`;
                const value = getWorkValue(id, dateKey, type.key);
                row.push(value > 0 ? value : '');
                total += value;
            }
            row.push(total > 0 ? total : '');

            // 연차 사용/잔여 (첫 번째 행에만)
            if (typeIdx === 0) {
                row.push(leaveUsedThisMonth > 0 ? leaveUsedThisMonth : '-');
                row.push(leaveRemaining < 0 ? `${leaveRemaining}⚠️` : leaveRemaining);
            } else {
                row.push('', '');
            }

            data.push(row);
        });

        stt++;
    });

    return data;
}

function createMoneyImportStyle(daysInMonth) {
    const data = [
        [`MONEY 급여계산기 연동 데이터 - ${currentYear}년 ${currentMonth}월`],
        [],
        ['날짜', 'CODE', '이름', '정상(h)', '야근(h)', '야간(h)', '휴일(h)']
    ];

    Object.entries(employees).forEach(([id, emp]) => {
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const normal = getWorkValue(id, dateKey, 'normal');
            const overtime = getWorkValue(id, dateKey, 'overtime');
            const night = getWorkValue(id, dateKey, 'night');
            const holiday = getWorkValue(id, dateKey, 'holiday');

            if (normal > 0 || overtime > 0 || night > 0 || holiday > 0) {
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                data.push([
                    dateStr,
                    emp.employeeCode || '',
                    emp.name,
                    normal || '',
                    overtime || '',
                    night || '',
                    holiday || ''
                ]);
            }
        }
    });

    return data;
}

function createSummaryStyle() {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const data = [
        [`출퇴근 기록 요약 - ${currentYear}년 ${currentMonth}월`],
        [],
        ['CODE', '이름', '출근일', '정상(h)', '야근(h)', '야간(h)', '휴일(h)', '총시간', '연차사용', '연차잔여']
    ];

    Object.entries(employees).forEach(([id, emp]) => {
        let workDays = 0;
        let totalNormal = 0;
        let totalOvertime = 0;
        let totalNight = 0;
        let totalHoliday = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${currentYear}-${currentMonth}-${day}`;
            const normal = getWorkValue(id, dateKey, 'normal');
            const overtime = getWorkValue(id, dateKey, 'overtime');
            const night = getWorkValue(id, dateKey, 'night');
            const holiday = getWorkValue(id, dateKey, 'holiday');

            if (normal > 0 || overtime > 0 || night > 0 || holiday > 0) {
                workDays++;
            }

            totalNormal += normal;
            totalOvertime += overtime;
            totalNight += night;
            totalHoliday += holiday;
        }

        const totalHours = totalNormal + totalOvertime + totalNight + totalHoliday;

        // 연차 계산 (음수 허용)
        const leaveUsedThisMonth = calculateLeaveUsedThisMonth(id, emp);
        const leaveUsedThisYear = calculateLeaveUsedThisYear(id, emp);
        const annualLeaveTotal = (emp.annualLeavePerYear || 12) + (emp.annualLeaveAdjustment || 0);
        const leaveRemaining = annualLeaveTotal - leaveUsedThisYear;

        data.push([
            emp.employeeCode || '',
            emp.name,
            workDays,
            totalNormal || '',
            totalOvertime || '',
            totalNight || '',
            totalHoliday || '',
            totalHours || '',
            leaveUsedThisMonth || '-',
            leaveRemaining < 0 ? `${leaveRemaining}⚠️` : leaveRemaining
        ]);
    });

    return data;
}

// ==================== 엑셀 불러오기 ====================
function importFromExcel() {
    document.getElementById('excelFileInput').click();
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            console.log('엑셀 시트 목록:', workbook.SheetNames);

            // CHAM CONG 시트 찾기
            let targetSheet = null;
            const possibleNames = ['CHAM CONG', 'CHAM_CONG', 'N CONG', '출퇴근'];

            for (const name of possibleNames) {
                if (workbook.SheetNames.includes(name)) {
                    targetSheet = workbook.Sheets[name];
                    console.log('시트 발견:', name);
                    break;
                }
            }

            if (!targetSheet) {
                // 첫 번째 시트 사용
                targetSheet = workbook.Sheets[workbook.SheetNames[0]];
                console.log('첫 번째 시트 사용:', workbook.SheetNames[0]);
            }

            const jsonData = XLSX.utils.sheet_to_json(targetSheet, { header: 1 });
            console.log('데이터 행 수:', jsonData.length);

            // 데이터 파싱
            parseExcelData(jsonData);

            event.target.value = '';
            alert('✅ 엑셀 데이터 불러오기 완료!');

        } catch (error) {
            console.error('엑셀 파싱 오류:', error);
            alert('❌ 엑셀 파일 읽기 오류: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

function parseExcelData(jsonData) {
    // 헤더 행 찾기 (STT 또는 CODE가 있는 행)
    let headerRowIdx = -1;
    let codeColIdx = -1;
    let nameColIdx = -1;
    let typeColIdx = -1;
    let dayStartColIdx = -1;

    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;

        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toUpperCase().trim();
            if (cell === 'CODE' || cell === 'MÃ NV') {
                headerRowIdx = i;
                codeColIdx = j;
            }
            if (cell === 'HỌ VÀ TÊN' || cell === 'TÊN' || cell === '이름') {
                nameColIdx = j;
            }
            if (cell === 'LOẠI' || cell === 'TYPE') {
                typeColIdx = j;
            }
        }

        if (headerRowIdx !== -1) break;
    }

    if (headerRowIdx === -1) {
        console.log('헤더를 찾을 수 없음, 기본값 사용');
        headerRowIdx = 2;
        codeColIdx = 1;
        nameColIdx = 2;
        typeColIdx = 3;
    }

    dayStartColIdx = typeColIdx + 1;
    console.log(`헤더 행: ${headerRowIdx}, CODE열: ${codeColIdx}, 이름열: ${nameColIdx}, 유형열: ${typeColIdx}, 일자시작열: ${dayStartColIdx}`);

    // 데이터 파싱
    let currentCode = null;
    let importCount = 0;

    for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        // CODE가 있으면 새 직원
        const code = row[codeColIdx];
        if (code && String(code).trim()) {
            currentCode = String(code).trim();
        }

        if (!currentCode) continue;

        // 해당 직원 찾기
        const empEntry = Object.entries(employees).find(([id, emp]) =>
            emp.employeeCode === currentCode
        );

        if (!empEntry) {
            console.log('직원 못찾음:', currentCode);
            continue;
        }

        const [empId] = empEntry;

        // 근무 유형 확인
        const typeValue = String(row[typeColIdx] || '').trim();
        let typeKey = null;

        if (typeValue.includes('Chính') || typeValue.includes('정상')) typeKey = 'normal';
        else if (typeValue.includes('Tăng') || typeValue.includes('야근')) typeKey = 'overtime';
        else if (typeValue.includes('Đêm') || typeValue.includes('야간')) typeKey = 'night';
        else if (typeValue.includes('Nhật') || typeValue.includes('휴일') || typeValue.includes('Chủ')) typeKey = 'holiday';

        if (!typeKey) continue;

        // 일자별 데이터 입력
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const value = row[dayStartColIdx + day - 1];
            if (value !== undefined && value !== null && value !== '') {
                const numValue = parseFloat(value) || 0;
                if (numValue > 0) {
                    const dateKey = `${currentYear}-${currentMonth}-${day}`;
                    setWorkValue(empId, dateKey, typeKey, numValue);
                    importCount++;
                }
            }
        }
    }

    console.log('불러온 데이터 개수:', importCount);
    renderTable();
}
