# 회사 정보 설정 기능 수정 보고서

## 🔍 발견된 문제들

### 1. **localStorage 키 이름 불일치 (가장 심각한 문제)**
- **문제**: `data-manager.js`가 설정을 로드할 때는 연도별 키(`vietnamPayrollSettings_${year}`)를 사용하지만, 저장할 때는 연도 없는 키(`vietnamPayrollSettings`)를 사용
- **영향**: 설정을 저장해도 다른 위치에 저장되어 불러올 수 없음
- **위치**: `data-manager.js` lines 35, 141, 375

### 2. **기본값에 회사 정보 필드 누락**
- **문제**: `data-manager.js`와 `settings.js`의 기본 `companySettings` 객체에 `companyName`, `companyLogo` 필드가 없음
- **영향**: 새로 설정을 생성할 때 회사 정보가 undefined로 표시됨
- **위치**: `data-manager.js` lines 9-21, 38-54 / `settings.js` lines 52-72

### 3. **마이그레이션 로직에 회사 정보 필드 누락**
- **문제**: 기존 설정을 로드할 때 새 필드가 undefined인 경우 기본값을 추가하는 로직에 회사 정보가 빠짐
- **영향**: 기존 사용자가 업데이트 후 회사 정보를 사용하려고 하면 undefined 표시
- **위치**: `settings.js` lines 73-99

### 4. **salary-input.html이 오래된 설정 키 사용**
- **문제**: 초기 로드 시 연도 없는 키(`vietnamPayrollSettings`)로 설정 로드
- **영향**: 최신 설정이 아닌 오래된 설정을 로드
- **위치**: `salary-input.html` line 2136

### 5. **연도 변경 시 설정 업데이트 없음**
- **문제**: 사용자가 연도를 변경해도 회사 설정이 갱신되지 않음
- **영향**: 다른 연도의 회사 정보가 표시될 수 있음
- **위치**: `salary-input.html` line 772-775

### 6. **settings.html의 회사명 입력란에 하드코딩된 기본값**
- **문제**: `value="회사명"`이 하드코딩되어 있어 빈 칸으로 시작하지 않음
- **영향**: 사용자가 기본값인지 실제 값인지 구분하기 어려움
- **위치**: `settings.html` line 600

---

## ✅ 수정 내용

### 1. **data-manager.js 수정**

#### 기본값에 회사 정보 추가 (lines 9-23)
```javascript
let companySettings = {
    companyName: '',          // 추가
    companyLogo: '',          // 추가
    dailyMeal: 25000,
    dinnerMeal: 25000,
    // ... 기타 필드
};
```

#### loadEmployeesFromStorage() 수정 (lines 40-54)
```javascript
companySettings = {
    companyName: '',          // 추가
    companyLogo: '',          // 추가
    dailyMeal: 25000,
    // ... 기타 필드
};
```

#### saveSettings() 함수 수정 (lines 362-382)
- 연도별 키로 저장하도록 변경
- 경고 메시지 추가 (이 함수는 더 이상 사용되지 않음을 알림)

```javascript
localStorage.setItem(`vietnamPayrollSettings_${currentYear}`, JSON.stringify(companySettings));
```

#### clearAllData() 함수 수정 (lines 136-155)
- 모든 연도별 설정 삭제 (2024~2030)
- 오래된 형식도 함께 삭제

```javascript
for (let year = 2024; year <= 2030; year++) {
    localStorage.removeItem(`vietnamPayrollSettings_${year}`);
}
localStorage.removeItem('vietnamPayrollSettings');
```

---

### 2. **settings.js 수정**

#### loadSettingsForYear() 기본값 추가 (lines 52-72)
```javascript
companySettings = {
    companyName: '',          // 추가
    companyLogo: '',          // 추가
    lunchMeal: 25000,
    // ... 기타 필드
};
```

#### 마이그레이션 로직 추가 (lines 101-107)
```javascript
// 회사 정보 필드 추가 (하위 호환성)
if (companySettings.companyName === undefined) {
    companySettings.companyName = '';
}
if (companySettings.companyLogo === undefined) {
    companySettings.companyLogo = '';
}
```

#### loadSettingsToForm() 수정 (line 508)
```javascript
if (companyNameEl) companyNameEl.value = companySettings.companyName || '';
```

#### saveSettings() 수정 (lines 563-564)
```javascript
if (companyNameEl) companySettings.companyName = companyNameEl.value.trim() || '';
if (companyLogoEl) companySettings.companyLogo = companyLogoEl.value.trim() || '';
```

---

### 3. **settings.html 수정**

#### 회사명 입력란 수정 (line 600)
```html
<!-- 변경 전 -->
<input type="text" id="settingCompanyName" placeholder="회사명을 입력하세요" value="회사명">

<!-- 변경 후 -->
<input type="text" id="settingCompanyName" placeholder="회사명을 입력하세요">
```

---

### 4. **salary-input.html 수정**

#### 초기 로드 시 올바른 키로 설정 로드 (lines 2135-2142)
```javascript
// 회사 설정 불러오기 (현재 연도 기준)
const storedSettings = localStorage.getItem(`vietnamPayrollSettings_${selectedYear}`);
if (storedSettings) {
    window.companySettings = JSON.parse(storedSettings);
    console.log('💼 초기 로드 시 회사 설정:', window.companySettings.companyName, window.companySettings.companyLogo);
} else {
    console.warn('⚠️ 회사 설정이 없습니다. settings.html에서 설정해주세요!');
}
```

#### 연도 변경 시 설정 갱신 (lines 772-783)
```javascript
yearSelect.addEventListener('change', () => {
    selectedYear = parseInt(yearSelect.value);

    // 연도 변경 시 회사 설정 다시 로드
    const storedSettings = localStorage.getItem(`vietnamPayrollSettings_${selectedYear}`);
    if (storedSettings) {
        window.companySettings = JSON.parse(storedSettings);
        console.log('📅 연도 변경: 회사 설정 다시 로드됨:', window.companySettings.companyName);
    }

    generateCalendar();
});
```

---

## 🔄 데이터 흐름 검증

### 1. **특수수당 (Special Allowance)**
✅ UI: `salary-input.html` lines 346-355
✅ 토글: `salary-input.html` lines 651-665
✅ 계산: `salary-input.html` lines 1713-1719, 1747
✅ 표시: `salary-input.html` lines 1902-1910
✅ 저장: `salary-input.html` lines 2282-2283
✅ 로드: `salary-input.html` lines 2218-2231
✅ 모바일: `salary-input.html` line 2101
✅ 대시보드: `dashboard.js` 다수 위치

### 2. **선금 (Advance Payment)**
✅ UI: `salary-input.html` lines 358-367
✅ 토글: `salary-input.html` lines 667-682
✅ 계산: `salary-input.html` lines 1805-1810
✅ 표시: `salary-input.html` lines 1913-1921
✅ 저장: `salary-input.html` lines 2284-2285
✅ 로드: `salary-input.html` lines 2233-2246
✅ 모바일: `salary-input.html` line 2107
✅ 대시보드: `dashboard.js` 다수 위치

### 3. **회사 정보 (Company Info)**
✅ 설정 UI: `settings.html` lines 595-608
✅ 저장: `settings.js` lines 563-566
✅ 로드: `settings.js` lines 508-509
✅ salary-input 로드: `salary-input.html` lines 2136-2142
✅ 연도 변경 시 갱신: `salary-input.html` lines 776-780
✅ 모바일 전달: `salary-input.html` lines 2065-2066
✅ 모바일 표시: `payslip.html` line 423

---

## 📋 테스트 체크리스트

### 회사 정보 설정
- [ ] settings.html 새로고침 후 회사 정보 섹션 표시 확인
- [ ] 회사명 입력란이 빈 칸으로 표시되는지 확인
- [ ] 회사명 입력 후 저장 버튼 클릭
- [ ] 콘솔에 "회사 정보 저장: [입력한 회사명]" 메시지 확인
- [ ] 페이지 새로고침 후 입력한 회사명이 유지되는지 확인

### salary-input.html
- [ ] 페이지 로드 시 콘솔에 "💼 초기 로드 시 회사 설정" 메시지 확인
- [ ] 연도 변경 시 콘솔에 "📅 연도 변경: 회사 설정 다시 로드됨" 메시지 확인
- [ ] 특수수당 체크박스 클릭 시 입력란 활성화 확인
- [ ] 특수수당 금액 입력 시 실시간 계산 확인
- [ ] 선금 체크박스 클릭 시 입력란 활성화 확인
- [ ] 선금 금액 입력 시 실시간 차감 확인
- [ ] 직원 저장 후 다시 불러올 때 값 유지 확인

### 모바일 급여명세서
- [ ] "📱 모바일 급여명세서" 버튼 클릭
- [ ] 회사명이 상단에 표시되는지 확인
- [ ] 특수수당이 수당 섹션에 표시되는지 확인
- [ ] 선금이 공제 섹션에 표시되는지 확인
- [ ] 총 급여 기본액, 총 수당, 총 공제액 합계 표시 확인

### 대시보드
- [ ] index.html에서 특수수당 열 표시 확인
- [ ] index.html에서 선금 열 표시 확인
- [ ] PDF 내보내기에 특수수당/선금 포함 확인
- [ ] Excel 내보내기에 특수수당/선금 포함 확인

---

## 🎯 핵심 수정 사항 요약

1. **localStorage 키 통일**: 모든 파일에서 `vietnamPayrollSettings_${year}` 형식 사용
2. **기본값 추가**: 모든 기본 설정 객체에 `companyName`, `companyLogo` 필드 추가
3. **마이그레이션 로직**: 기존 사용자를 위한 하위 호환성 코드 추가
4. **연도별 설정 로드**: 연도 변경 시 해당 연도의 회사 정보 자동 로드
5. **UI 개선**: 빈 칸에서 시작하여 기본값과 실제 값 구분 가능

---

## 🚀 사용자 가이드

### 회사 정보 설정하기
1. `settings.html` 페이지를 새로고침 (F5)
2. 🏢 회사 정보 섹션 찾기 (식대 설정 위에 위치)
3. "회사명" 입력란에 실제 회사명 입력
4. "회사 로고 URL" 입력란에 로고 이미지 URL 입력 (선택사항)
5. 페이지 하단의 "💾 설정 저장" 버튼 클릭
6. "✅ 2025년 설정이 저장되었습니다!" 알림 확인

### 모바일 급여명세서에서 확인하기
1. `salary-input.html`에서 직원 선택
2. "📱 모바일 급여명세서" 버튼 클릭
3. 상단에 입력한 회사명 표시 확인
4. 로고를 입력했다면 로고도 표시 확인

---

## 📝 디버깅 로그

모든 주요 단계에서 콘솔 로그를 추가하여 문제 추적이 가능합니다:

- `💼 초기 로드 시 회사 설정: [회사명] [로고]`
- `📅 연도 변경: 회사 설정 다시 로드됨: [회사명]`
- `회사 정보 저장: [회사명] [로고]`
- `급여명세서 회사 설정 로드됨: [회사명] [로고]`
- `급여명세서 데이터 받음: Object`
- `회사명: [회사명]`
- `회사 로고: [로고]`

---

## 작성일: 2025년 11월 17일
## 작성자: Claude Code Assistant
