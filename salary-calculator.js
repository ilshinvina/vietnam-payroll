// ==================== 급여 계산 모듈 ====================
// 베트남 급여 계산 로직

// 전역 변수: 현재 계산된 총 수당 (식대 제외)
let currentTotalAllowances = 0;

// 숫자 포맷팅
function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num));
}

// 통계 업데이트
function updateStats() {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    let sundays = 0;

    // 일요일 카운트
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay();

        if (dayOfWeek === 0) {
            sundays++;
        }
    }

    // 공휴일, 사유결근, 무단결근, 연차 카운트
    // 공휴일 중 일요일은 제외 (이중 차감 방지)
    let holidayCount = 0;
    holidays.forEach(dateKey => {
        const parts = dateKey.split('-');
        const day = parseInt(parts[2]);
        const date = new Date(selectedYear, selectedMonth - 1, day);
        if (date.getDay() !== 0) { // 일요일이 아닌 공휴일만 카운트
            holidayCount++;
        }
    });

    const excusedAbsentCount = excusedAbsents.size;
    const unexcusedAbsentCount = absents.size;
    const annualLeaveCount = annualLeaveDays.size;
    const totalAbsentCount = excusedAbsentCount + unexcusedAbsentCount;

    // 평일 = 월~토 (총일수 - 일요일)
    const weekdays = daysInMonth - sundays;

    // dateKey 포맷팅을 위한 월/일 문자열 (2자리 패딩)
    const monthStr = String(selectedMonth).padStart(2, '0');

    // 헬퍼 함수: 키가 현재 연/월에 속하는지 확인 (구버전 호환)
    function isCurrentMonth(key) {
        const parts = key.split('-');
        if (parts.length < 2) return false;
        const keyYear = parseInt(parts[0]);
        const keyMonth = parseInt(parts[1]);
        return keyYear === selectedYear && keyMonth === selectedMonth;
    }

    // 일요일 특근 일수 카운트 (8시간 이상 일하면 식대 지급)
    let sundayWorkDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (isCurrentMonth(key) && sundayData[key] >= 8) {
            sundayWorkDays++;
        }
    });

    // 실 근무일 = 평일 - 공휴일 - 모든 결근 + 일요일 특근
    const workDays = weekdays - holidayCount - totalAbsentCount - annualLeaveCount + sundayWorkDays;

    // 실제 정규 근무시간 계산 (각 날짜의 실제 시간 합산)
    let normalHours = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = date.getDay();

        // 두 가지 형식의 키 모두 생성 (구버전 호환)
        const dayStr = String(day).padStart(2, '0');
        const dateKeyNew = `${selectedYear}-${monthStr}-${dayStr}`;  // 2025-04-30
        const dateKeyOld = `${selectedYear}-${selectedMonth}-${day}`; // 2025-4-30

        // 제외할 날:
        // - 일요일
        // - 공휴일 (일요일 아닌)
        // - 사유결근 (무급)
        // - 무단결근
        if (dayOfWeek === 0) {
            // 일요일은 제외
            continue;
        }
        if ((holidays.has(dateKeyNew) || holidays.has(dateKeyOld)) && dayOfWeek !== 0) {
            // 공휴일 (일요일 아닌) 제외
            continue;
        }
        if (excusedAbsents.has(dateKeyNew) || excusedAbsents.has(dateKeyOld)) {
            // 사유결근 제외 (무급 휴가)
            continue;
        }
        if (absents.has(dateKeyNew) || absents.has(dateKeyOld)) {
            // 무단결근 제외
            continue;
        }

        // 정상 근무 또는 연차
        if (annualLeaveDays.has(dateKeyNew) || annualLeaveDays.has(dateKeyOld)) {
            normalHours += 8;  // 연차 = 8시간 유급 인정!
        } else {
            normalHours += (normalHoursData[dateKeyNew] || normalHoursData[dateKeyOld] || 8);  // 정상 근무
        }
    }

    // 식대 계산 (설정값 사용)
    const lunchMeal = companySettings.lunchMeal || 25000;
    const dinnerMeal = companySettings.dinnerMeal || 25000;
    const weekdayLunchAuto = companySettings.weekdayLunchAuto !== false;
    const weekdayDinnerHours = companySettings.weekdayDinnerHours || 3;
    const sundayLunchHours = companySettings.sundayLunchHours || 4;
    const sundayDinnerHours = companySettings.sundayDinnerHours || 12;
    const annualLeaveLunchMeal = companySettings.annualLeaveLunchMeal === true;
    const excusedAbsenceLunchMinHours = companySettings.excusedAbsenceLunchMinHours || 0;

    let mealAllowance = 0;

    // 1. 평일 점심 식대 (자동 지급 설정 시)
    if (weekdayLunchAuto) {
        // 기본: 정상 출근한 날
        mealAllowance += workDays * lunchMeal;

        // 연차 사용 시 점심 식대 지급 설정 체크
        if (annualLeaveLunchMeal) {
            mealAllowance += annualLeaveCount * lunchMeal;
        }

        // 사유결근 시 점심 식대 지급 조건 체크 (정규시간 기준)
        excusedAbsents.forEach(dateKey => {
            // 두 가지 키 형식 모두 시도 (구버전 호환)
            const parts = dateKey.split('-');
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            const dateKeyNew = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const normalHours = normalHoursData[dateKey] || normalHoursData[dateKeyNew] || 0;
            if (normalHours >= excusedAbsenceLunchMinHours) {
                mealAllowance += lunchMeal;
            }
        });
    }

    // 2. 평일 저녁 식대 (연장근무 시간 조건)
    let overtimeMealDays = 0;
    Object.keys(overtimeData).forEach(key => {
        if (isCurrentMonth(key) && overtimeData[key] >= weekdayDinnerHours) {
            overtimeMealDays++;
        }
    });
    mealAllowance += (overtimeMealDays * dinnerMeal);

    // 3. 일요일 점심 식대 (총 근무시간 조건)
    let sundayLunchDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (isCurrentMonth(key) && sundayData[key] >= sundayLunchHours) {
            sundayLunchDays++;
        }
    });
    mealAllowance += (sundayLunchDays * lunchMeal);

    // 4. 일요일 저녁 식대 (총 근무시간 조건)
    let sundayDinnerDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (isCurrentMonth(key) && sundayData[key] >= sundayDinnerHours) {
            sundayDinnerDays++;
        }
    });
    mealAllowance += (sundayDinnerDays * dinnerMeal);

    // 동적 수당 계산
    // 총 근무 가능일 = 평일 - 공휴일 (일요일 제외한 실제 일할 수 있는 날)
    const totalWorkableDays = daysInMonth - sundays - holidayCount;

    // 출근율 계산 (사유결근 + 연차를 비율로 차감)
    const attendanceRate = totalWorkableDays > 0 ? (totalWorkableDays - excusedAbsentCount - annualLeaveCount) / totalWorkableDays : 0;

    // 설정된 수당 배열 가져오기
    const allowances = companySettings.allowances || [];
    let totalAllowances = 0;
    let allowanceDetails = {}; // 각 수당별 금액 저장 (UI 표시용)

    allowances.forEach(allowance => {
        if (!allowance.enabled) return; // 비활성화된 수당은 제외

        let amount = 0;

        // 무단결근 처리
        if (unexcusedAbsentCount > 0) {
            // 무단결근이 있을 때
            if (allowance.onAbsence === 'zero') {
                amount = 0; // 지급 안 함
            } else if (allowance.onAbsence === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate); // 비율로 지급
            } else { // 'full'
                amount = allowance.amount; // 전액 지급
            }
        } else if (excusedAbsentCount > 0) {
            // 무단결근은 없고 사유결근이 있을 때
            const excusedAbsenceRule = allowance.onExcusedAbsence || 'proportional';
            if (excusedAbsenceRule === 'zero') {
                amount = 0; // 지급 안 함
            } else if (excusedAbsenceRule === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate); // 비율로 지급
            } else { // 'full'
                amount = allowance.amount; // 전액 지급
            }
        } else {
            // 무단결근도 사유결근도 없을 때 - 연차 규칙 적용
            if (allowance.onAnnualLeave === 'zero' && annualLeaveCount > 0) {
                amount = 0; // 연차 사용 시 지급 안 함
            } else if (allowance.onAnnualLeave === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate); // 비율로 지급
            } else { // 'full'
                amount = allowance.amount; // 전액 지급
            }
        }

        allowanceDetails[allowance.id] = {
            name: allowance.name,
            amount: amount
        };
        totalAllowances += amount;
    });

    // 전역 변수에 저장 (calculate 함수에서 사용)
    currentTotalAllowances = totalAllowances;

    // 하위 호환성: 기존 변수명 유지 (첫 3개 수당을 개근수당, 교통비, 위험수당으로 간주)
    let attendanceBonus = allowanceDetails['allowance_attendance']?.amount || 0;
    let transportBonus = allowanceDetails['allowance_transport']?.amount || 0;
    let riskAllowance = allowanceDetails['allowance_risk']?.amount || 0;

    // 총 야근시간 계산
    let totalOvertime = 0;
    Object.keys(overtimeData).forEach(key => {
        if (isCurrentMonth(key)) {
            totalOvertime += overtimeData[key];
        }
    });

    // 총 일요일 특근시간 계산
    let totalSunday = 0;
    Object.keys(sundayData).forEach(key => {
        if (isCurrentMonth(key)) {
            totalSunday += sundayData[key];
        }
    });

    document.getElementById('totalDays').textContent = daysInMonth + '일';
    document.getElementById('weekdays').textContent = weekdays + '일';
    document.getElementById('weekends').textContent = sundays + '일';
    document.getElementById('holidays').textContent = holidayCount + '일';
    document.getElementById('excusedAbsents').textContent = excusedAbsentCount + '일';
    document.getElementById('unexcusedAbsents').textContent = unexcusedAbsentCount + '일';
    document.getElementById('annualLeaveCount').textContent = annualLeaveCount + '일';
    document.getElementById('workDays').textContent = workDays + '일';
    document.getElementById('normalHours').textContent = normalHours + 'h';
    document.getElementById('totalOvertimeDisplay').textContent = totalOvertime + 'h';
    document.getElementById('totalSundayDisplay').textContent = totalSunday + 'h';
    document.getElementById('autoMeal').textContent = formatNumber(mealAllowance) + 'đ';
    document.getElementById('attendanceBonus').textContent = formatNumber(attendanceBonus) + 'đ';
    document.getElementById('transportBonus').textContent = formatNumber(transportBonus) + 'đ';
    document.getElementById('riskDisplay').textContent = formatNumber(riskAllowance) + ' đ';

    // 연차 현황 업데이트
    if (currentEmployeeId && employees[currentEmployeeId]) {
        const emp = employees[currentEmployeeId];
        const annualLeaveTotal = emp.annualLeavePerYear || 12;
        const annualLeavePreUsed = emp.annualLeaveUsed || 0;
        const annualLeaveThisMonth = annualLeaveCount; // 이번달 사용
        const annualLeaveRemaining = Math.max(0, annualLeaveTotal - annualLeavePreUsed - annualLeaveThisMonth);

        document.getElementById('annualLeaveTotal').textContent = annualLeaveTotal + '일';
        document.getElementById('annualLeavePreUsed').textContent = annualLeavePreUsed + '일';
        document.getElementById('annualLeaveThisMonth').textContent = annualLeaveThisMonth + '일';
        document.getElementById('annualLeaveRemaining').textContent = annualLeaveRemaining + '일';
    }

    // 야근시간 자동 입력
    document.getElementById('overtimeHours').value = totalOvertime;

    // 일요일 특근시간 자동 입력
    document.getElementById('sundayHours').value = totalSunday;
}

// 급여 계산
function calculate() {
    const employeeName = document.getElementById('employeeName').value || '직원';
    const basicSalary = parseFloat(document.getElementById('basicSalary').value) || 0;
    const overtimeHours = parseFloat(document.getElementById('overtimeHours').value) || 0;
    const nightHours = parseFloat(document.getElementById('nightHours').value) || 0;
    const sundayHours = parseFloat(document.getElementById('sundayHours').value) || 0;

    // 통계에서 계산된 실제 정규시간 가져오기
    const normalHoursText = document.getElementById('normalHours').textContent;
    const normalHours = parseFloat(normalHoursText.replace('h', '')) || 0;
    const absentCount = absents.size;

    // 월별 평일 수 가져오기 (베트남 노동법 준수)
    const weekdaysText = document.getElementById('weekdays').textContent;
    const weekdays = parseFloat(weekdaysText.replace('일', '')) || 26;  // 기본값 26일

    // 시간당 급여 (월별 실제 근무 가능 시간 기준)
    const monthlyHours = weekdays * 8;
    const hourlyRate = monthlyHours > 0 ? basicSalary / monthlyHours : 0;

    // 급여 계산
    const normalPay = hourlyRate * normalHours;
    const overtimePay = hourlyRate * overtimeHours * 1.5;
    const nightPay = hourlyRate * nightHours * 1.3;
    const sundayPay = hourlyRate * sundayHours * 2.0;

    // 자동 수당 (통계에서 계산된 값 사용)
    const mealAllowanceText = document.getElementById('autoMeal').textContent;
    const mealAllowance = parseFloat(mealAllowanceText.replace(/[^\d]/g, '')) || 0;

    // 개별 수당 (UI 표시용 - 하위 호환성)
    const attendanceBonusText = document.getElementById('attendanceBonus').textContent;
    const attendanceBonus = parseFloat(attendanceBonusText.replace(/[^\d]/g, '')) || 0;

    const transportBonusText = document.getElementById('transportBonus').textContent;
    const transportAllowance = parseFloat(transportBonusText.replace(/[^\d]/g, '')) || 0;

    const riskAllowanceText = document.getElementById('riskDisplay').textContent;
    const riskAllowance = parseFloat(riskAllowanceText.replace(/[^\d]/g, '')) || 0;

    // 특수수당 가져오기
    const specialAllowanceEnabled = document.getElementById('specialAllowanceEnabled')?.checked || false;
    const specialAllowance = specialAllowanceEnabled ?
        (parseFloat(document.getElementById('specialAllowanceAmount')?.value) || 0) : 0;

    // 총 급여 (모든 동적 수당 + 특수수당 포함)
    const totalSalary = normalPay + overtimePay + nightPay + sundayPay +
                      mealAllowance + currentTotalAllowances + specialAllowance;

    // 보험료율 가져오기 (설정값 사용)
    const employeeSocialRate = (companySettings.employeeSocialRate || 8) / 100;
    const employeeHealthRate = (companySettings.employeeHealthRate || 1.5) / 100;
    const employeeUnemployRate = (companySettings.employeeUnemployRate || 1) / 100;
    const companySocialRate = (companySettings.companySocialRate || 17.5) / 100;
    const companyHealthRate = (companySettings.companyHealthRate || 3) / 100;
    const companyUnemployRate = (companySettings.companyUnemployRate || 1) / 100;

    // 회사 부담금 (기본급 기준) - 참고용
    const companySocialIns = basicSalary * companySocialRate;
    const companyHealthIns = basicSalary * companyHealthRate;
    const companyUnemployIns = basicSalary * companyUnemployRate;
    const totalCompanyIns = companySocialIns + companyHealthIns + companyUnemployIns;

    // 근로자 보험료 (기본급 기준)
    const socialIns = basicSalary * employeeSocialRate;
    const healthIns = basicSalary * employeeHealthRate;
    const unemployIns = basicSalary * employeeUnemployRate;

    // 총 공제
    const totalDeduction = socialIns + healthIns + unemployIns;

    // 개인소득세 계산
    const dependents = parseInt(document.getElementById('dependents').value) || 0;

    // 베트남 세법 비과세 규정 적용
    // 1. 식대: 월 730,000 VND까지만 비과세, 초과분은 과세
    const mealTaxFreeLimit = 730000;
    const taxFreeMeal = Math.min(mealAllowance, mealTaxFreeLimit);
    const taxableMeal = mealAllowance - taxFreeMeal;

    // 2. 야근 수당: 1/3 비과세 (50% 가산분), 2/3 과세
    const taxFreeOvertime = overtimePay * 1/3;
    const taxableOvertime = overtimePay * 2/3;

    // 3. 야간 수당: 30% 가산분만 비과세 (130% 중 30%)
    const nightTaxFree = nightPay * (0.3 / 1.3);
    const nightTaxable = nightPay - nightTaxFree;

    // 4. 일요일 특근: 100% 가산분 비과세 (200% 중 100%)
    const sundayTaxFree = sundayPay * 1/2;
    const taxableSunday = sundayPay * 1/2;

    // 과세 대상 소득 계산 (베트남 세법 준수)
    const taxableIncome = normalPay                    // 정규급여: 전액 과세
                        + taxableOvertime              // 야근: 2/3만 과세
                        + nightTaxable                 // 야간: 70% 과세 (기본 100%)
                        + taxableSunday                // 특근: 1/2 과세 (기본 100%)
                        + taxableMeal                  // 식대: 730,000 초과분만 과세
                        + currentTotalAllowances       // 모든 수당: 전액 과세
                        + specialAllowance             // 특수수당: 전액 과세
                        - totalDeduction;              // 보험료 공제

    // 가족 공제
    const selfDeduction = 11000000; // 본인
    const dependentDeduction = dependents * 4400000; // 부양가족
    const totalFamilyDeduction = selfDeduction + dependentDeduction;

    // 과세 표준 = 과세 대상 소득 - 가족 공제
    let taxBase = Math.max(0, taxableIncome - totalFamilyDeduction);

    // 누진세율 계산
    let incomeTax = 0;
    if (taxBase > 0) {
        // Bậc 1: 0 - 5,000,000 (5%)
        if (taxBase > 0) {
            const tier1 = Math.min(taxBase, 5000000);
            incomeTax += tier1 * 0.05;
            taxBase -= tier1;
        }
        // Bậc 2: 5,000,001 - 10,000,000 (10%)
        if (taxBase > 0) {
            const tier2 = Math.min(taxBase, 5000000);
            incomeTax += tier2 * 0.10;
            taxBase -= tier2;
        }
        // Bậc 3: 10,000,001 - 18,000,000 (15%)
        if (taxBase > 0) {
            const tier3 = Math.min(taxBase, 8000000);
            incomeTax += tier3 * 0.15;
            taxBase -= tier3;
        }
        // Bậc 4: 18,000,001 - 32,000,000 (20%)
        if (taxBase > 0) {
            const tier4 = Math.min(taxBase, 14000000);
            incomeTax += tier4 * 0.20;
            taxBase -= tier4;
        }
        // Bậc 5: 32,000,001 - 52,000,000 (25%)
        if (taxBase > 0) {
            const tier5 = Math.min(taxBase, 20000000);
            incomeTax += tier5 * 0.25;
            taxBase -= tier5;
        }
        // Bậc 6: 52,000,001 - 80,000,000 (30%)
        if (taxBase > 0) {
            const tier6 = Math.min(taxBase, 28000000);
            incomeTax += tier6 * 0.30;
            taxBase -= tier6;
        }
        // Bậc 7: 80,000,001 이상 (35%)
        if (taxBase > 0) {
            incomeTax += taxBase * 0.35;
        }
    }

    // 선금 가져오기
    const advancePaymentEnabled = document.getElementById('advancePaymentEnabled')?.checked || false;
    const advancePayment = advancePaymentEnabled ?
        (parseFloat(document.getElementById('advancePaymentAmount')?.value) || 0) : 0;

    // 실수령액 = 총 급여 - 보험료 - 개인소득세 - 선금
    const netSalary = totalSalary - totalDeduction - incomeTax - advancePayment;

    // 결과 표시
    document.getElementById('employeeNameResult').textContent = employeeName + ' 님';
    document.getElementById('hourlyRate').textContent = formatNumber(hourlyRate) + ' đ/시간';
    document.getElementById('normalPay').textContent = formatNumber(normalPay) + ' đ';
    document.getElementById('overtimePay').textContent = formatNumber(overtimePay) + ' đ';
    document.getElementById('nightPay').textContent = formatNumber(nightPay) + ' đ';
    document.getElementById('sundayPay').textContent = formatNumber(sundayPay) + ' đ';
    document.getElementById('mealDisplay').textContent = formatNumber(mealAllowance) + ' đ';
    document.getElementById('attendanceBonusDisplay').textContent = formatNumber(attendanceBonus) + ' đ';
    document.getElementById('transportDisplay').textContent = formatNumber(transportAllowance) + ' đ';
    document.getElementById('riskDisplay').textContent = formatNumber(riskAllowance) + ' đ';

    // 회사 부담금 표시
    document.getElementById('companySocialIns').textContent = formatNumber(companySocialIns) + ' đ';
    document.getElementById('companyHealthIns').textContent = formatNumber(companyHealthIns) + ' đ';
    document.getElementById('companyUnemployIns').textContent = formatNumber(companyUnemployIns) + ' đ';
    document.getElementById('totalCompanyIns').textContent = formatNumber(totalCompanyIns) + ' đ';

    // 근로자 공제 표시
    document.getElementById('socialIns').textContent = formatNumber(socialIns) + ' đ';
    document.getElementById('healthIns').textContent = formatNumber(healthIns) + ' đ';
    document.getElementById('unemployIns').textContent = formatNumber(unemployIns) + ' đ';

    // 개인소득세 표시
    document.getElementById('taxableIncome').textContent = formatNumber(taxableIncome) + ' đ';
    document.getElementById('dependentDeduction').textContent = formatNumber(dependentDeduction) + ' đ';
    document.getElementById('totalFamilyDeduction').textContent = formatNumber(totalFamilyDeduction) + ' đ';
    document.getElementById('taxBase').textContent = formatNumber(Math.max(0, taxableIncome - totalFamilyDeduction)) + ' đ';
    document.getElementById('incomeTax').textContent = formatNumber(incomeTax) + ' đ';

    // 비과세 내역 표시 (베트남 세법 준수)
    const totalTaxFree = taxFreeMeal + taxFreeOvertime + nightTaxFree + sundayTaxFree;

    document.getElementById('taxFreeMeal').textContent = formatNumber(taxFreeMeal) + ' đ';
    document.getElementById('taxFreeOvertime').textContent = formatNumber(taxFreeOvertime) + ' đ';
    document.getElementById('taxFreeSunday').textContent = formatNumber(sundayTaxFree) + ' đ';
    document.getElementById('totalTaxFree').textContent = formatNumber(totalTaxFree) + ' đ';

    // 야간수당 비과세 표시 (있는 경우만)
    const nightTaxFreeEl = document.getElementById('taxFreeNight');
    if (nightTaxFreeEl) {
        nightTaxFreeEl.textContent = formatNumber(nightTaxFree) + ' đ';
    }

    // 특수수당 표시
    const specialAllowanceContainer = document.getElementById('specialAllowanceResultContainer');
    if (specialAllowanceContainer) {
        if (specialAllowance > 0) {
            specialAllowanceContainer.style.display = 'flex';
            document.getElementById('specialAllowanceResult').textContent = formatNumber(specialAllowance) + ' đ';
        } else {
            specialAllowanceContainer.style.display = 'none';
        }
    }

    // 선금 표시
    const advancePaymentContainer = document.getElementById('advancePaymentResultContainer');
    if (advancePaymentContainer) {
        if (advancePayment > 0) {
            advancePaymentContainer.style.display = 'block';
            document.getElementById('advancePaymentResult').textContent = formatNumber(advancePayment) + ' đ';
        } else {
            advancePaymentContainer.style.display = 'none';
        }
    }

    document.getElementById('totalSalary').textContent = formatNumber(totalSalary) + ' đ';
    document.getElementById('totalDeduction').textContent = formatNumber(totalDeduction) + ' đ';
    document.getElementById('netSalary').textContent = formatNumber(netSalary) + ' đ';

    // 계산 시 현재 직원 자동 저장
    if (currentEmployeeId) {
        saveCurrentEmployee();
    }
}

// 전체 직원 급여 계산
function calculateAllEmployeesPayroll(year, month) {
    const results = [];

    Object.keys(employees).forEach(empId => {
        const emp = employees[empId];
        const payroll = calculateEmployeePayroll(empId, year, month);

        if (payroll) {
            results.push({
                id: empId,
                name: emp.name,
                ...payroll
            });
        }
    });

    return results;
}

// 개별 직원 급여 계산
function calculateEmployeePayroll(employeeId, year, month) {
    const emp = employees[employeeId];
    if (!emp) return null;

    // 해당 월의 달력 데이터 로드
    const basicSalary = emp.basicSalary || 6980000;
    const dependents = emp.dependents || 0;

    // 특수수당 및 선금 가져오기
    const specialAllowance = emp.specialAllowanceEnabled ? (emp.specialAllowanceAmount || 0) : 0;
    const advancePayment = emp.advancePaymentEnabled ? (emp.advancePaymentAmount || 0) : 0;

    // dateKey 포맷팅을 위한 월 문자열 (2자리 패딩)
    const monthStr = String(month).padStart(2, '0');

    // 헬퍼 함수: 키가 지정된 연/월에 속하는지 확인 (구버전 호환)
    function isTargetMonth(key) {
        const parts = key.split('-');
        if (parts.length < 2) return false;
        const keyYear = parseInt(parts[0]);
        const keyMonth = parseInt(parts[1]);
        return keyYear === year && keyMonth === month;
    }

    // 월별 데이터 필터링
    const holidays = new Set((emp.holidays || []).filter(d => isTargetMonth(d)));
    const excusedAbsents = new Set((emp.excusedAbsents || []).filter(d => isTargetMonth(d)));
    const absents = new Set((emp.absents || []).filter(d => isTargetMonth(d)));
    const annualLeaveDays = new Set((emp.annualLeaveDays || []).filter(d => isTargetMonth(d)));

    const overtimeData = {};
    const nightData = {};
    const sundayData = {};
    const normalHoursData = {};

    Object.keys(emp.overtimeData || {}).forEach(key => {
        if (isTargetMonth(key)) {
            overtimeData[key] = emp.overtimeData[key];
        }
    });

    Object.keys(emp.nightData || {}).forEach(key => {
        if (isTargetMonth(key)) {
            nightData[key] = emp.nightData[key];
        }
    });

    Object.keys(emp.sundayData || {}).forEach(key => {
        if (isTargetMonth(key)) {
            sundayData[key] = emp.sundayData[key];
        }
    });

    Object.keys(emp.normalHoursData || {}).forEach(key => {
        if (isTargetMonth(key)) {
            normalHoursData[key] = emp.normalHoursData[key];
        }
    });

    // 통계 계산
    const daysInMonth = new Date(year, month, 0).getDate();
    let sundays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() === 0) sundays++;
    }

    const weekdays = daysInMonth - sundays;

    // 공휴일 중 일요일은 제외
    let holidayCount = 0;
    holidays.forEach(dateKey => {
        const parts = dateKey.split('-');
        const day = parseInt(parts[2]);
        const date = new Date(year, month - 1, day);
        if (date.getDay() !== 0) {
            holidayCount++;
        }
    });

    const excusedAbsentCount = excusedAbsents.size;
    const unexcusedAbsentCount = absents.size;
    const annualLeaveCount = annualLeaveDays.size;
    const totalAbsentCount = excusedAbsentCount + unexcusedAbsentCount;

    // 일요일 특근일 수 계산
    let sundayWorkDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (sundayData[key] >= 8) sundayWorkDays++;
    });

    const workDays = weekdays - holidayCount - totalAbsentCount - annualLeaveCount + sundayWorkDays;

    // 정규 근무시간 계산
    let normalHours = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const dateKey = `${year}-${month}-${day}`;

        if (dayOfWeek === 0) continue;
        if (holidays.has(dateKey) && dayOfWeek !== 0) continue;
        if (excusedAbsents.has(dateKey)) continue;
        if (absents.has(dateKey)) continue;

        if (annualLeaveDays.has(dateKey)) {
            normalHours += 8;
        } else {
            normalHours += (normalHoursData[dateKey] || 8);
        }
    }

    // 시급 계산
    const monthlyHours = weekdays * 8;
    const hourlyRate = monthlyHours > 0 ? basicSalary / monthlyHours : 0;

    // 급여 계산
    const normalPay = Math.round(hourlyRate * normalHours);

    let totalOvertime = 0;
    Object.keys(overtimeData).forEach(key => {
        totalOvertime += overtimeData[key];
    });

    let totalNight = 0;
    Object.keys(nightData).forEach(key => {
        totalNight += nightData[key];
    });

    let totalSunday = 0;
    Object.keys(sundayData).forEach(key => {
        totalSunday += sundayData[key];
    });

    const overtimePay = Math.round(hourlyRate * totalOvertime * 1.5);
    const nightPay = Math.round(hourlyRate * totalNight * 1.3);
    const sundayPay = Math.round(hourlyRate * totalSunday * 2.0);

    // 식대 계산 (설정값 사용)
    const lunchMeal = companySettings.lunchMeal || 25000;
    const dinnerMeal = companySettings.dinnerMeal || 25000;
    const weekdayDinnerHours = companySettings.weekdayDinnerHours || 3;
    const sundayLunchHours = companySettings.sundayLunchHours || 4;
    const sundayDinnerHours = companySettings.sundayDinnerHours || 12;
    const annualLeaveLunchMeal = companySettings.annualLeaveLunchMeal === true;
    const excusedAbsenceLunchMinHours = companySettings.excusedAbsenceLunchMinHours || 0;

    let mealAllowance = 0;

    // 평일 점심 식대
    mealAllowance += workDays * lunchMeal;

    // 연차 사용 시 점심 식대 지급 설정 체크
    if (annualLeaveLunchMeal) {
        mealAllowance += annualLeaveCount * lunchMeal;
    }

    // 사유결근 시 점심 식대 지급 조건 체크 (정규시간 기준)
    excusedAbsents.forEach(dateKey => {
        // 두 가지 키 형식 모두 시도 (구버전 호환)
        const parts = dateKey.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        const dateKeyNew = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const normalHours = normalHoursData[dateKey] || normalHoursData[dateKeyNew] || 0;
        if (normalHours >= excusedAbsenceLunchMinHours) {
            mealAllowance += lunchMeal;
        }
    });

    // 평일 저녁 식대 (연장근무 시간 조건)
    let overtimeMealDays = 0;
    Object.keys(overtimeData).forEach(key => {
        if (overtimeData[key] >= weekdayDinnerHours) {
            overtimeMealDays++;
        }
    });
    mealAllowance += (overtimeMealDays * dinnerMeal);

    // 일요일 점심 식대 (총 근무시간 조건)
    let sundayLunchDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (sundayData[key] >= sundayLunchHours) {
            sundayLunchDays++;
        }
    });
    mealAllowance += (sundayLunchDays * lunchMeal);

    // 일요일 저녁 식대 (총 근무시간 조건)
    let sundayDinnerDays = 0;
    Object.keys(sundayData).forEach(key => {
        if (sundayData[key] >= sundayDinnerHours) {
            sundayDinnerDays++;
        }
    });
    mealAllowance += (sundayDinnerDays * dinnerMeal);

    const totalWorkableDays = daysInMonth - sundays - holidayCount;

    // 동적 수당 계산 (calculateAllEmployeesPayroll 용)
    const attendanceRate = totalWorkableDays > 0 ? (totalWorkableDays - excusedAbsentCount - annualLeaveCount) / totalWorkableDays : 0;

    const allowances = companySettings.allowances || [];
    let totalTaxableAllowances = 0;  // 과세 수당
    let totalNonTaxableAllowances = 0;  // 비과세 수당
    let attendanceBonus = 0;
    let transportAllowance = 0;
    let riskAllowance = 0;

    allowances.forEach(allowance => {
        if (!allowance.enabled) return;

        let amount = 0;

        if (unexcusedAbsentCount > 0) {
            // 무단결근이 있을 때
            if (allowance.onAbsence === 'zero') {
                amount = 0;
            } else if (allowance.onAbsence === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate);
            } else {
                amount = allowance.amount;
            }
        } else if (excusedAbsentCount > 0) {
            // 무단결근은 없고 사유결근이 있을 때
            const excusedAbsenceRule = allowance.onExcusedAbsence || 'proportional';
            if (excusedAbsenceRule === 'zero') {
                amount = 0;
            } else if (excusedAbsenceRule === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate);
            } else {
                amount = allowance.amount;
            }
        } else {
            // 무단결근도 사유결근도 없을 때 - 연차 규칙 적용
            if (allowance.onAnnualLeave === 'zero' && annualLeaveCount > 0) {
                amount = 0;
            } else if (allowance.onAnnualLeave === 'proportional') {
                amount = Math.round(allowance.amount * attendanceRate);
            } else {
                amount = allowance.amount;
            }
        }

        // 하위 호환성을 위해 특정 ID는 별도 변수에 저장
        if (allowance.id === 'allowance_attendance') {
            attendanceBonus = amount;
        } else if (allowance.id === 'allowance_transport') {
            transportAllowance = amount;
        } else if (allowance.id === 'allowance_risk') {
            riskAllowance = amount;
        }

        // 과세 여부에 따라 분류 (기본값: 과세)
        if (allowance.isTaxable !== false) {
            totalTaxableAllowances += amount;
        } else {
            totalNonTaxableAllowances += amount;
        }
    });

    const totalOtherAllowances = totalTaxableAllowances + totalNonTaxableAllowances;
    const totalAllowances = mealAllowance + totalOtherAllowances;

    // 총 급여 (특수수당 포함)
    const totalSalary = normalPay + overtimePay + nightPay + sundayPay + totalAllowances + specialAllowance;

    // 보험료율 가져오기 (설정값 사용)
    const employeeSocialRate = (companySettings.employeeSocialRate || 8) / 100;
    const employeeHealthRate = (companySettings.employeeHealthRate || 1.5) / 100;
    const employeeUnemployRate = (companySettings.employeeUnemployRate || 1) / 100;

    // 보험료 공제
    const socialIns = Math.round(basicSalary * employeeSocialRate);
    const healthIns = Math.round(basicSalary * employeeHealthRate);
    const unemployIns = Math.round(basicSalary * employeeUnemployRate);
    const totalDeduction = socialIns + healthIns + unemployIns;

    // 소득세 계산 (베트남 세법 준수)
    // 1. 식대 비과세 한도 적용 (월 730,000 VND)
    const mealTaxFreeLimit = 730000;
    const taxFreeMeal = Math.min(mealAllowance, mealTaxFreeLimit);
    const taxableMeal = mealAllowance - taxFreeMeal;

    // 2. 야근 수당: 1/3 비과세, 2/3 과세
    const taxableOvertime = overtimePay * 2/3;

    // 3. 야간 수당: 30% 가산분 비과세 (130% 중 30%)
    const nightTaxFree = nightPay * (0.3 / 1.3);
    const nightTaxable = nightPay - nightTaxFree;

    // 4. 일요일 특근: 100% 가산분 비과세 (200% 중 100%)
    const taxableSunday = sundayPay * 1/2;

    // 과세 소득 계산 (과세 수당만 포함, 특수수당은 전액 과세)
    const taxableIncome = normalPay + taxableOvertime + nightTaxable + taxableSunday
                         + taxableMeal + totalTaxableAllowances + specialAllowance - totalDeduction;

    const selfDeduction = 11000000;
    const dependentDeduction = dependents * 4400000;
    const totalFamilyDeduction = selfDeduction + dependentDeduction;

    let taxBase = Math.max(0, taxableIncome - totalFamilyDeduction);
    let incomeTax = 0;

    if (taxBase > 0) {
        const originalTaxBase = taxBase;
        if (taxBase > 0) {
            const tier1 = Math.min(taxBase, 5000000);
            incomeTax += tier1 * 0.05;
            taxBase -= tier1;
        }
        if (taxBase > 0) {
            const tier2 = Math.min(taxBase, 5000000);
            incomeTax += tier2 * 0.10;
            taxBase -= tier2;
        }
        if (taxBase > 0) {
            const tier3 = Math.min(taxBase, 8000000);
            incomeTax += tier3 * 0.15;
            taxBase -= tier3;
        }
        if (taxBase > 0) {
            const tier4 = Math.min(taxBase, 14000000);
            incomeTax += tier4 * 0.20;
            taxBase -= tier4;
        }
        if (taxBase > 0) {
            const tier5 = Math.min(taxBase, 20000000);
            incomeTax += tier5 * 0.25;
            taxBase -= tier5;
        }
        if (taxBase > 0) {
            const tier6 = Math.min(taxBase, 28000000);
            incomeTax += tier6 * 0.30;
            taxBase -= tier6;
        }
        if (taxBase > 0) {
            incomeTax += taxBase * 0.35;
        }
    }

    // 실수령액 (선금 차감)
    const netSalary = totalSalary - totalDeduction - incomeTax - advancePayment;

    return {
        workDays: workDays,
        normalHours: normalHours,
        basicPay: normalPay,
        allowances: totalAllowances,
        specialAllowance: specialAllowance,
        totalSalary: totalSalary,
        deductions: totalDeduction,
        incomeTax: Math.round(incomeTax),
        advancePayment: advancePayment,
        netSalary: netSalary
    };
}

// 직원별 연간 누적 급여 계산
function calculateYearlyAccumulation(employeeId) {
    const year = parseInt(document.getElementById('payrollYear').value);
    const currentMonth = parseInt(document.getElementById('payrollMonth').value);

    let yearlyTotal = {
        totalSalary: 0,
        deductions: 0,
        incomeTax: 0,
        netSalary: 0,
        months: []
    };

    // 1월부터 현재 월까지 계산
    for (let month = 1; month <= currentMonth; month++) {
        const payroll = calculateEmployeePayroll(employeeId, year, month);
        if (payroll) {
            yearlyTotal.totalSalary += payroll.totalSalary;
            yearlyTotal.deductions += payroll.deductions;
            yearlyTotal.incomeTax += payroll.incomeTax;
            yearlyTotal.netSalary += payroll.netSalary;
            yearlyTotal.months.push({
                month: month,
                ...payroll
            });
        }
    }

    return yearlyTotal;
}
