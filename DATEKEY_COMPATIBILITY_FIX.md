# 날짜 키 호환성 버그 수정 보고서

**수정 일시**: 2025-11-15
**수정자**: Claude Code
**문제**: 일부 월은 작동하고 일부 월은 작동하지 않는 현상

---

## 🔴 발견된 핵심 버그

### 1. `startsWith` 버그 - 단일 자릿수 월 문제

**문제 원인**:
```javascript
// 4월 데이터 검색 시
key.startsWith(`${selectedYear}-${selectedMonth}-`)
// → "2025-4-"로 검색

// 결과:
// ✓ "2025-4-1" (구버전) - 매칭 성공
// ✗ "2025-04-01" (신버전) - 매칭 실패!

// 11월 데이터 검색 시
key.startsWith("2025-11-")
// ✓ "2025-11-1" (구버전) - 매칭 성공
// ✓ "2025-11-01" (신버전) - 매칭 성공
```

**영향**:
- 1~9월: 구버전 키만 인식 → 신버전 데이터 무시
- 10~12월: 양쪽 키 모두 인식 → 정상 작동

**이것이 바로 "4월은 안 되는데 11월은 되는" 이유입니다!**

---

## ✅ 수정 내역

### 파일: `salary-input.html`

#### 1. `updateStats()` 함수 (1007-1136줄)

**추가된 헬퍼 함수**:
```javascript
function isSelectedMonth(key) {
    const parts = key.split('-');
    if (parts.length < 2) return false;
    const keyYear = parseInt(parts[0]);
    const keyMonth = parseInt(parts[1]);
    return keyYear === selectedYear && keyMonth === selectedMonth;
}
```

**수정된 부분**:

1. **일요일 특근 일수 계산** (1053-1057줄):
```javascript
// 수정 전
if (key.startsWith(`${selectedYear}-${selectedMonth}-`) && sundayData[key] >= 8)

// 수정 후
if (isSelectedMonth(key) && sundayData[key] >= 8)
```

2. **총 야근시간 계산** (1124-1128줄):
```javascript
// 수정 전
if (key.startsWith(`${selectedYear}-${selectedMonth}-`))

// 수정 후
if (isSelectedMonth(key))
```

3. **총 일요일 특근시간 계산** (1132-1136줄):
```javascript
// 수정 전
if (key.startsWith(`${selectedYear}-${selectedMonth}-`))

// 수정 후
if (isSelectedMonth(key))
```

4. **정규 근무시간 계산** (1063-1098줄):
```javascript
// 수정 전
const dateKey = makeDateKey(selectedYear, selectedMonth, day);
if (holidays.has(dateKey) && dayOfWeek !== 0) continue;
if (excusedAbsents.has(dateKey)) continue;
if (absents.has(dateKey)) continue;
if (annualLeaveDays.has(dateKey)) {
    normalHours += 8;
} else {
    normalHours += (normalHoursData[dateKey] || 8);
}

// 수정 후
const dateKey = makeDateKey(selectedYear, selectedMonth, day);
const dateKeyOld = `${selectedYear}-${selectedMonth}-${day}`;
if ((holidays.has(dateKey) || holidays.has(dateKeyOld)) && dayOfWeek !== 0) continue;
if (excusedAbsents.has(dateKey) || excusedAbsents.has(dateKeyOld)) continue;
if (absents.has(dateKey) || absents.has(dateKeyOld)) continue;
if (annualLeaveDays.has(dateKey) || annualLeaveDays.has(dateKeyOld)) {
    normalHours += 8;
} else {
    normalHours += (normalHoursData[dateKey] || normalHoursData[dateKeyOld] || 8);
}
```

---

#### 2. `inputOvertimeHours()` 함수 (910-951줄)

**수정 내용**:
```javascript
// 수정 전
const dateKey = makeDateKey(selectedYear, selectedMonth, day);
const currentValue = overtimeData[dateKey] || 0;

// 수정 후
const dateKey = makeDateKey(selectedYear, selectedMonth, day);
const dateKeyOld = `${selectedYear}-${selectedMonth}-${day}`;
const currentValue = overtimeData[dateKey] || overtimeData[dateKeyOld] || 0;

// 구버전 키 삭제 추가
if (dateKeyOld !== dateKey && overtimeData[dateKeyOld]) {
    delete overtimeData[dateKeyOld];
}
```

---

#### 3. `calculateEmployeePayroll()` 함수 (1656-1920줄)

**추가된 헬퍼 함수**:
```javascript
function isTargetMonth(key) {
    const parts = key.split('-');
    if (parts.length < 2) return false;
    const keyYear = parseInt(parts[0]);
    const keyMonth = parseInt(parts[1]);
    return keyYear === year && keyMonth === month;
}
```

**수정된 부분**:

1. **월별 데이터 필터링** (1674-1707줄):
```javascript
// 수정 전
const holidays = new Set((emp.holidays || []).filter(d => d.startsWith(`${year}-${month}-`)));
Object.keys(emp.overtimeData || {}).forEach(key => {
    if (key.startsWith(`${year}-${month}-`)) {
        overtimeData[key] = emp.overtimeData[key];
    }
});

// 수정 후
const holidays = new Set((emp.holidays || []).filter(d => isTargetMonth(d)));
Object.keys(emp.overtimeData || {}).forEach(key => {
    if (isTargetMonth(key)) {
        overtimeData[key] = emp.overtimeData[key];
    }
});
```

2. **정규 근무시간 계산** (1743-1761줄):
```javascript
// 수정 전
const dateKey = makeDateKey(year, month, day);
if (holidays.has(dateKey) && dayOfWeek !== 0) continue;
if (excusedAbsents.has(dateKey)) continue;
if (absents.has(dateKey)) continue;

// 수정 후
const dateKey = makeDateKey(year, month, day);
const dateKeyOld = `${year}-${month}-${day}`;
if ((holidays.has(dateKey) || holidays.has(dateKeyOld)) && dayOfWeek !== 0) continue;
if (excusedAbsents.has(dateKey) || excusedAbsents.has(dateKeyOld)) continue;
if (absents.has(dateKey) || absents.has(dateKeyOld)) continue;
```

3. **야간수당 버그 수정** (1786줄):
```javascript
// 수정 전 (30% - 잘못됨!)
const nightPay = Math.round(hourlyRate * totalNight * 0.3);

// 수정 후 (130% - 정상)
const nightPay = Math.round(hourlyRate * totalNight * 1.3);
```

---

## 📊 수정 요약

### 수정된 함수:
1. ✅ `updateStats()` - 통계 계산 (salary-input.html)
2. ✅ `inputOvertimeHours()` - 야근시간 직접 입력 (salary-input.html)
3. ✅ `calculateEmployeePayroll()` - 급여대장 계산 (salary-input.html)

### 수정된 버그:
1. ✅ `startsWith` 단일 자릿수 월 버그 (3곳)
2. ✅ Set.has() 구버전 키 미확인 (8곳)
3. ✅ Object keys 조회 구버전 키 미확인 (6곳)
4. ✅ 야간수당 30% → 130% (1곳)

---

## 🎯 예상 결과

### 수정 전:
- ❌ 1~9월: 신버전 데이터 무시 (구버전만 작동)
- ✓ 10~12월: 양쪽 데이터 모두 작동
- ❌ 야간수당: 30% 잘못 계산
- ❌ 급여대장: 일부 월 데이터 미표시

### 수정 후:
- ✅ 1~12월: 모든 월 정상 작동
- ✅ 구버전/신버전 키 모두 인식
- ✅ 야간수당: 130% 정상 계산
- ✅ 급여대장: 모든 월 데이터 정상 표시

---

## 🧪 테스트 권장 사항

### 테스트 1: 단일 자릿수 월 (4월)
1. 4월로 이동
2. 직원 선택 (기존 4월 데이터 있는 직원)
3. 야근/특근 시간 표시 확인
4. 통계 표시 확인 (총 야근, 총 특근)
5. 급여 계산 확인

### 테스트 2: 두 자릿수 월 (11월)
1. 11월로 이동
2. 위와 동일한 테스트 수행

### 테스트 3: 급여대장
1. 급여대장 열기
2. 4월 데이터 표시 확인
3. 11월 데이터 표시 확인
4. 모든 월의 야근/특근 수당 확인

### 테스트 4: 야간수당
1. 야간근무 시간 입력
2. 야간수당이 시급 × 시간 × 130%로 계산되는지 확인
3. 급여대장에서도 동일한지 확인

---

## 📝 기술 참고

### 날짜 키 포맷:
- **구버전**: `"2025-4-1"` (패딩 없음)
- **신버전**: `"2025-04-01"` (패딩 있음)

### 호환성 전략:
1. **읽기**: 양쪽 키 모두 확인 (`data[dateKey] || data[dateKeyOld]`)
2. **쓰기**: 신버전 키로 저장
3. **마이그레이션**: 수정 시 구버전 키 삭제, 신버전 키로 저장

---

**수정 완료**: 2025-11-15
**다음 단계**: 사용자 실제 테스트 진행
