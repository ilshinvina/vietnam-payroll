// ==================== 달력 UI 모듈 ====================
// 달력 생성 및 근무 시간 관리

// 전역 변수 (다른 모듈에서 참조)
let selectedYear = 2025;
let selectedMonth = 11;
let holidays = new Set();
let excusedAbsents = new Set(); // 사유 결근
let absents = new Set();        // 무단 결근
let annualLeaveDays = new Set(); // 연차
let overtimeData = {};  // 야근
let nightData = {};     // 야간
let sundayData = {};    // 일요일 특근
let normalHoursData = {}; // 정규 근무시간

// 년도/월 선택 초기화
function initYearMonth() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');

    for (let y = 2020; y <= 2030; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y + '년';
        if (y === selectedYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    for (let m = 1; m <= 12; m++) {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m + '월';
        if (m === selectedMonth) option.selected = true;
        monthSelect.appendChild(option);
    }

    yearSelect.addEventListener('change', () => {
        selectedYear = parseInt(yearSelect.value);
        generateCalendar();
    });

    monthSelect.addEventListener('change', () => {
        selectedMonth = parseInt(monthSelect.value);
        generateCalendar();
    });
}

// 달력 생성
function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const title = document.getElementById('calendarTitle');

    title.textContent = `${selectedYear}년 ${selectedMonth}월`;

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();

    calendar.innerHTML = '';

    // 요일 헤더
    const dayHeaders = ['일', '월', '화', '수', '목', '금', '토'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        calendar.appendChild(header);
    });

    // 빈 칸
    for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    // 날짜
    for (let day = 1; day <= daysInMonth; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay();
        const dateKey = `${selectedYear}-${selectedMonth}-${day}`;

        // 요일별 스타일
        if (dayOfWeek === 0) dayEl.classList.add('sunday');
        else if (dayOfWeek === 6) dayEl.classList.add('saturday');

        // 상태 표시
        if (holidays.has(dateKey)) dayEl.classList.add('holiday', 'selected');
        if (excusedAbsents.has(dateKey)) dayEl.classList.add('excused-absent', 'selected');
        if (absents.has(dateKey)) dayEl.classList.add('absent', 'selected');
        if (annualLeaveDays.has(dateKey)) dayEl.classList.add('annual-leave', 'selected');

        // 해/달 아이콘 토글 (좌측 상단)
        if (dayOfWeek !== 0) { // 일요일 제외
            const dayIcon = document.createElement('div');
            dayIcon.className = 'day-icon';
            dayIcon.id = `icon-${dateKey}`;
            dayIcon.dataset.day = day; // day 값 저장
            
            // 야간 데이터가 있으면 달 아이콘, 없으면 해 아이콘
            if (nightData[dateKey] && nightData[dateKey] > 0) {
                dayIcon.textContent = '🌙';
                dayIcon.dataset.mode = 'night';
            } else {
                dayIcon.textContent = '🌞';
                dayIcon.dataset.mode = 'day';
            }
            
            dayIcon.title = '클릭하여 해/달 전환';
            dayIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                const clickedDay = parseInt(e.currentTarget.dataset.day);
                toggleDayIcon(clickedDay);
            });
            dayEl.appendChild(dayIcon);
        }

        // 날짜 숫자
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number day-number-clickable';
        dayNumber.textContent = day;
        dayNumber.title = '클릭하여 야근시간 입력';
        dayNumber.addEventListener('click', (e) => {
            e.stopPropagation();
            inputOvertimeHours(day, dayEl);
        });
        dayEl.appendChild(dayNumber);

        // 정규 근무시간 표시
        if (dayOfWeek !== 0 && !holidays.has(dateKey) && !excusedAbsents.has(dateKey) && !absents.has(dateKey)) {
            const normalInfo = createNormalHoursElement(day, dateKey);
            dayEl.appendChild(normalInfo);
        }

        // 야근/특근 시간 표시
        const overtimeInfo = createOvertimeElement(day, dateKey, dayOfWeek);
        dayEl.appendChild(overtimeInfo);

        // 야간 시간 표시 (일요일 제외)
        if (dayOfWeek !== 0) {
            const nightInfo = createNightElement(day, dateKey);
            dayEl.appendChild(nightInfo);
        }

        // 배경 클릭시 상태 토글
        dayEl.addEventListener('click', () => toggleDay(day, dayEl));
        calendar.appendChild(dayEl);
    }

    updateStats();
}

// 정규 근무시간 요소 생성
function createNormalHoursElement(day, dateKey) {
    const normalInfo = document.createElement('div');
    normalInfo.className = 'normal-hours-info';
    normalInfo.id = `normal-${dateKey}`;
    normalInfo.title = '좌클릭: +0.5시간 | 우클릭: -0.5시간';

    const normalHours = normalHoursData[dateKey] || 8;

    if (normalHours === 8) {
        normalInfo.textContent = `📅 ${normalHours}h`;
        normalInfo.classList.add('has-data');
    } else if (normalHours < 8 && normalHours > 0) {
        normalInfo.textContent = `📅 ${normalHours}h (조기)`;
        normalInfo.classList.add('early-leave');
    } else if (normalHours > 0) {
        normalInfo.textContent = `📅 ${normalHours}h`;
        normalInfo.classList.add('has-data');
    } else {
        normalInfo.textContent = '📅 0h';
    }

    normalInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        incrementNormalHours(day, 0.5);
    });

    normalInfo.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        incrementNormalHours(day, -0.5);
    });

    return normalInfo;
}

// 야근/특근 요소 생성
function createOvertimeElement(day, dateKey, dayOfWeek) {
    const overtimeInfo = document.createElement('div');
    overtimeInfo.className = 'overtime-info';
    overtimeInfo.id = `overtime-${dateKey}`;
    overtimeInfo.title = '좌클릭: +0.5시간 | 우클릭: -0.5시간';

    if (dayOfWeek === 0) {
        // 일요일 특근
        if (sundayData[dateKey]) {
            overtimeInfo.textContent = `🌞 ${sundayData[dateKey]}h`;
            overtimeInfo.classList.add('has-data');
            overtimeInfo.style.background = '#ffebee';
            overtimeInfo.style.borderColor = '#e53935';
        } else {
            overtimeInfo.textContent = '+ 특근(200%)';
            overtimeInfo.style.background = '#ffebee';
            overtimeInfo.style.borderColor = '#e53935';
        }

        overtimeInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            incrementSunday(day, 0.5);
        });

        overtimeInfo.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            incrementSunday(day, -0.5);
        });
    } else {
        // 평일/토요일 야근
        if (overtimeData[dateKey]) {
            overtimeInfo.textContent = `⏰ ${overtimeData[dateKey]}h`;
            overtimeInfo.classList.add('has-data');
        } else {
            overtimeInfo.textContent = '+ 야근';
        }

        overtimeInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            incrementOvertime(day, 0.5);
        });

        overtimeInfo.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            incrementOvertime(day, -0.5);
        });
    }

    return overtimeInfo;
}

// 야간근무 요소 생성
function createNightElement(day, dateKey) {
    const nightInfo = document.createElement('div');
    nightInfo.className = 'night-info';
    nightInfo.id = `night-${dateKey}`;
    nightInfo.title = '좌클릭: +0.5시간 | 우클릭: -0.5시간';

    if (nightData[dateKey]) {
        nightInfo.textContent = `🌙 ${nightData[dateKey]}h`;
        nightInfo.classList.add('has-data');
    } else {
        nightInfo.textContent = '+ 야간';
    }

    nightInfo.addEventListener('click', (e) => {
        e.stopPropagation();
        incrementNight(day, 0.5);
    });

    nightInfo.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        incrementNight(day, -0.5);
    });

    return nightInfo;
}

// 정규 근무시간 증감
function incrementNormalHours(day, amount) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const currentValue = normalHoursData[dateKey] || 8;
    const newValue = Math.max(0, Math.min(12, currentValue + amount));

    if (newValue !== 8) {
        normalHoursData[dateKey] = newValue;
    } else {
        delete normalHoursData[dateKey];
    }

    const normalInfo = document.getElementById(`normal-${dateKey}`);
    if (normalInfo) {
        normalInfo.classList.remove('has-data', 'early-leave');
        if (newValue === 8) {
            normalInfo.textContent = `📅 ${newValue}h`;
            normalInfo.classList.add('has-data');
        } else if (newValue < 8 && newValue > 0) {
            normalInfo.textContent = `📅 ${newValue}h (조기)`;
            normalInfo.classList.add('early-leave');
        } else if (newValue > 8) {
            normalInfo.textContent = `📅 ${newValue}h`;
            normalInfo.classList.add('has-data');
        } else {
            normalInfo.textContent = '📅 0h';
        }
    }

    updateStats();
    calculate();
}

// 야근시간 증감
function incrementOvertime(day, amount) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const currentValue = overtimeData[dateKey] || 0;
    const newValue = Math.max(0, currentValue + amount);

    if (newValue > 0) {
        overtimeData[dateKey] = newValue;
    } else {
        delete overtimeData[dateKey];
    }

    const overtimeInfo = document.getElementById(`overtime-${dateKey}`);
    if (overtimeInfo) {
        if (newValue > 0) {
            overtimeInfo.textContent = `⏰ ${newValue}h`;
            overtimeInfo.classList.add('has-data');
        } else {
            overtimeInfo.textContent = '+ 야근';
            overtimeInfo.classList.remove('has-data');
        }
    }

    updateStats();
    calculate();
}

// 일요일 특근시간 증감
function incrementSunday(day, amount) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const currentValue = sundayData[dateKey] || 0;
    const newValue = Math.max(0, currentValue + amount);

    if (newValue > 0) {
        sundayData[dateKey] = newValue;
    } else {
        delete sundayData[dateKey];
    }

    const overtimeInfo = document.getElementById(`overtime-${dateKey}`);
    if (overtimeInfo) {
        if (newValue > 0) {
            overtimeInfo.textContent = `🌞 ${newValue}h`;
            overtimeInfo.classList.add('has-data');
            overtimeInfo.style.background = '#e53935';
            overtimeInfo.style.borderColor = '#c62828';
            overtimeInfo.style.color = 'white';
        } else {
            overtimeInfo.textContent = '+ 특근(200%)';
            overtimeInfo.classList.remove('has-data');
            overtimeInfo.style.background = '#ffebee';
            overtimeInfo.style.borderColor = '#e53935';
            overtimeInfo.style.color = '#333';
        }
    }

    updateStats();
    calculate();
}

// 야간시간 증감
function incrementNight(day, amount) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const currentValue = nightData[dateKey] || 0;
    const newValue = Math.max(0, currentValue + amount);

    if (newValue > 0) {
        nightData[dateKey] = newValue;
    } else {
        delete nightData[dateKey];
    }

    const nightInfo = document.getElementById(`night-${dateKey}`);
    if (nightInfo) {
        if (newValue > 0) {
            nightInfo.textContent = `🌙 ${newValue}h`;
            nightInfo.classList.add('has-data');
        } else {
            nightInfo.textContent = '+ 야간';
            nightInfo.classList.remove('has-data');
        }
    }

    updateStats();
    calculate();
}

// 야근시간 직접 입력
function inputOvertimeHours(day, element) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const currentValue = overtimeData[dateKey] || 0;

    const input = prompt(`📅 ${selectedMonth}월 ${day}일 야근시간 입력\n\n야근시간 (시간):`, currentValue);

    if (input !== null) {
        const hours = parseFloat(input);
        if (!isNaN(hours) && hours >= 0) {
            if (hours > 0) {
                overtimeData[dateKey] = hours;
            } else {
                delete overtimeData[dateKey];
            }

            const overtimeInfo = document.getElementById(`overtime-${dateKey}`);
            if (overtimeInfo) {
                if (hours > 0) {
                    overtimeInfo.textContent = `⏰ ${hours}h`;
                    overtimeInfo.classList.add('has-data');
                } else {
                    overtimeInfo.textContent = '+ 야근';
                    overtimeInfo.classList.remove('has-data');
                }
            }

            updateStats();
            calculate();
        } else {
            alert('⚠️ 올바른 숫자를 입력하세요!');
        }
    }
}

// 날짜 상태 토글 (공휴일/사유결근/무단결근/연차)
function toggleDay(day, element) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;

    if (holidays.has(dateKey)) {
        holidays.delete(dateKey);
        excusedAbsents.add(dateKey);
        element.classList.remove('holiday', 'selected');
        element.classList.add('excused-absent', 'selected');
    } else if (excusedAbsents.has(dateKey)) {
        excusedAbsents.delete(dateKey);
        absents.add(dateKey);
        element.classList.remove('excused-absent', 'selected');
        element.classList.add('absent', 'selected');
    } else if (absents.has(dateKey)) {
        absents.delete(dateKey);
        annualLeaveDays.add(dateKey);
        element.classList.remove('absent', 'selected');
        element.classList.add('annual-leave', 'selected');
    } else if (annualLeaveDays.has(dateKey)) {
        annualLeaveDays.delete(dateKey);
        element.classList.remove('annual-leave', 'selected');
    } else {
        holidays.add(dateKey);
        element.classList.add('holiday', 'selected');
    }

    updateStats();
}

// 해/달 아이콘 토글
function toggleDayIcon(day) {
    const dateKey = `${selectedYear}-${selectedMonth}-${day}`;
    const iconElement = document.getElementById(`icon-${dateKey}`);
    
    if (!iconElement) {
        console.error(`Icon not found for ${dateKey}`);
        return;
    }
    
    if (iconElement.dataset.mode === 'day') {
        // 해 → 달로 전환 (야간 모드)
        // 야간근무 데이터 추가 (기본 8시간)
        if (!nightData[dateKey] || nightData[dateKey] === 0) {
            nightData[dateKey] = 8;
        }
    } else {
        // 달 → 해로 전환 (주간 모드)
        // 야간근무 데이터 삭제
        delete nightData[dateKey];
    }
    
    // 달력 재생성하여 야간근무 버튼 표시 업데이트
    generateCalendar();
    
    // 통계 및 급여 계산 업데이트
    updateStats();
    calculate();
}

// 공휴일 프리셋 적용
function applyHolidayPreset(preset) {
    if (preset === 'vietnam2025') {
        const vietnamHolidays = [
            '2025-1-1', '2025-1-28', '2025-1-29', '2025-1-30', '2025-1-31',
            '2025-4-30', '2025-5-1', '2025-9-2',
        ];

        for (const dateStr of vietnamHolidays) {
            const [year, month, day] = dateStr.split('-');
            if (parseInt(year) === selectedYear && parseInt(month) === selectedMonth) {
                holidays.add(`${year}-${month}-${day}`);
            }
        }

        generateCalendar();
        saveCurrentEmployee();
        alert(`✅ 베트남 공휴일이 ${selectedMonth}월에 적용되었습니다!`);
        closeSettings();
    }
}

// 공휴일 초기화
function clearAllHolidays() {
    if (confirm('모든 공휴일 설정을 삭제하시겠습니까?')) {
        holidays.clear();
        generateCalendar();
        saveCurrentEmployee();
        alert('✅ 공휴일이 초기화되었습니다!');
    }
}
