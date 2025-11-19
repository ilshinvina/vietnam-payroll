# 특수수당(Phụ cấp đặc biệt) 시스템 점검 및 구현 방안

**분석 일시**: 2025-11-17
**분석자**: Claude Code
**목적**: 베트남 특수수당 규정 준수 및 isTaxable 속성 추가 검토

---

## 📋 **베트남 특수수당 규정** (사용자 제공)

### ✅ **법적 근거**
- 특수수당(Phụ cấp đặc biệt)은 **완전히 합법**
- **금액 제한 없음**
- 조건: 회사 내부 규정 명시 + 급여명세서/장부 공식 기록

### ✅ **세무 처리**
- 기본적으로 **과세 항목**으로 처리하면 안전
- `isTaxable: true` 권장

### ✅ **회사 내부 규정 문구** (베트남어)
```
"Công ty áp dụng phụ cấp đặc biệt hàng tháng từ 1.000.000 VND đến 5.000.000 VND
tùy theo tính chất công việc, trách nhiệm và mức độ đóng góp của nhân viên."
```

**한국어 번역**:
> "회사는 업무 성격, 책임 및 직원의 기여도에 따라 월 1,000,000 VND에서 5,000,000 VND의 특수수당을 적용합니다."

### ✅ **효과**
- 이 규정만 있으면 직원별로 300만동, 400만동, 1,000만동 지급해도 **합법**

---

## 🔍 **현재 시스템 점검 결과**

### 1. **현재 수당 데이터 구조** (settings.js)

```javascript
{
    id: 'allowance_xxx',           // 고유 ID
    name: '수당명',                // 수당 이름
    amount: 300000,                // 금액
    enabled: true,                 // 활성화 여부
    onAbsence: 'zero',            // 무단결근 시 규칙
    onExcusedAbsence: 'proportional', // 사유결근 시 규칙
    onAnnualLeave: 'proportional'  // 연차 시 규칙
}
```

### ⚠️ **현재 없는 속성**:
- ❌ `isTaxable` (과세 여부)
- ❌ `description` (수당 설명)
- ❌ `legalBasis` (법적 근거)

---

### 2. **현재 과세 소득 계산** (salary-calculator.js Line 807-808)

```javascript
// 모든 수당을 과세 소득에 포함
const taxableIncome = normalPay + taxableOvertime + nightTaxable + taxableSunday
                     + taxableMeal + totalOtherAllowances - totalDeduction;
```

### ✅ **현재 상태**:
- **모든 수당이 자동으로 과세 처리됨**
- 베트남 세법 권장사항과 일치!

### ⚠️ **문제점**:
- 유연성 부족: 특정 수당을 비과세로 설정 불가
- 미래 법 개정 시 대응 어려움

---

## 💡 **구현 방안 제안**

### 📌 **방안 1: isTaxable 속성 추가** (권장)

#### **장점**:
- ✅ 유연성: 과세/비과세 수당 모두 지원
- ✅ 미래 대비: 법 개정 시 쉽게 대응
- ✅ 명확성: 각 수당의 과세 여부 명시

#### **단점**:
- ⚠️ 기존 데이터 마이그레이션 필요
- ⚠️ UI 추가 필요 (과세 여부 체크박스)

#### **수정 범위**:
```
settings.js (수당 구조)
settings.html (수당 UI)
salary-calculator.js (과세 계산)
```

---

### 📌 **방안 2: 현재 상태 유지** (간단)

#### **장점**:
- ✅ 수정 불필요
- ✅ 모든 수당 과세 = 안전

#### **단점**:
- ❌ 유연성 없음
- ❌ 특정 수당을 비과세로 설정 불가

---

## 🎯 **권장 구현: 방안 1 (isTaxable 추가)**

### **Step 1: 수당 데이터 구조 확장**

#### settings.js (Line 106-114, 119-127, 132-140)
```javascript
// 수정 전
companySettings.allowances.push({
    id: 'allowance_attendance',
    name: '개근수당',
    amount: companySettings.attendanceBonus,
    enabled: true,
    onAbsence: 'zero',
    onExcusedAbsence: 'proportional',
    onAnnualLeave: 'proportional'
});

// 수정 후
companySettings.allowances.push({
    id: 'allowance_attendance',
    name: '개근수당',
    amount: companySettings.attendanceBonus,
    enabled: true,
    onAbsence: 'zero',
    onExcusedAbsence: 'proportional',
    onAnnualLeave: 'proportional',
    isTaxable: true,  // ← 추가!
    description: '출근율 100% 달성 시 지급',
    legalBasis: '회사 내규'
});
```

---

### **Step 2: 수당 추가/수정 UI**

#### settings.html (수당 모달)
```html
<!-- 기존 항목들 -->
<div class="form-group">
    <label>수당명</label>
    <input type="text" id="allowanceName">
</div>

<div class="form-group">
    <label>금액</label>
    <input type="number" id="allowanceAmount">
</div>

<!-- 새로 추가 -->
<div class="form-group">
    <label style="display: flex; align-items: center; gap: 10px;">
        <input type="checkbox" id="allowanceIsTaxable" checked>
        <span>과세 대상 수당 (일반적으로 체크 유지)</span>
    </label>
    <span class="helper-text">
        ※ 대부분의 수당은 과세 대상입니다. 법적 근거가 확실한 경우에만 해제하세요.
    </span>
</div>

<div class="form-group">
    <label>수당 설명 (선택사항)</label>
    <textarea id="allowanceDescription" rows="2"
              placeholder="예: 업무 성격, 책임 및 기여도에 따라 지급"></textarea>
</div>
```

---

### **Step 3: 수당 저장 로직**

#### settings.js (saveAllowance 함수)
```javascript
// 수정 전 (Line 732-782)
const newAllowance = {
    id: 'allowance_' + Date.now(),
    name,
    amount,
    onAbsence,
    onExcusedAbsence,
    onAnnualLeave,
    enabled
};

// 수정 후
const newAllowance = {
    id: 'allowance_' + Date.now(),
    name,
    amount,
    onAbsence,
    onExcusedAbsence,
    onAnnualLeave,
    enabled,
    isTaxable: document.getElementById('allowanceIsTaxable').checked,  // ← 추가!
    description: document.getElementById('allowanceDescription').value.trim() || ''
};
```

---

### **Step 4: 과세 소득 계산 수정**

#### salary-calculator.js (Line 721-772, 807-808)

**현재**:
```javascript
// 모든 수당을 과세 소득에 포함
const taxableIncome = normalPay + taxableOvertime + nightTaxable + taxableSunday
                     + taxableMeal + totalOtherAllowances - totalDeduction;
```

**수정 후**:
```javascript
// 수당을 과세/비과세로 분리
const allowances = companySettings.allowances || [];
let totalTaxableAllowances = 0;  // 과세 수당
let totalNonTaxableAllowances = 0;  // 비과세 수당

allowances.forEach(allowance => {
    if (!allowance.enabled) return;

    let amount = 0;
    // ... (기존 출퇴근 규칙 로직) ...

    // 과세 여부에 따라 분류
    if (allowance.isTaxable !== false) {  // 기본값 true
        totalTaxableAllowances += amount;
    } else {
        totalNonTaxableAllowances += amount;
    }
});

// 과세 소득 계산
const taxableIncome = normalPay + taxableOvertime + nightTaxable + taxableSunday
                     + taxableMeal + totalTaxableAllowances  // ← 과세 수당만!
                     - totalDeduction;
```

---

### **Step 5: 마이그레이션 (기존 데이터 호환)**

#### settings.js (loadSettingsForYear 함수)
```javascript
// 기존 수당에 isTaxable 속성 추가 (하위 호환성)
if (companySettings.allowances) {
    companySettings.allowances = companySettings.allowances.map(allowance => {
        if (allowance.isTaxable === undefined) {
            allowance.isTaxable = true;  // 기본값: 과세
        }
        if (!allowance.description) {
            allowance.description = '';
        }
        return allowance;
    });
}
```

---

## 🎁 **특수수당 템플릿 추가** (옵션)

### settings.html (수당 추가 버튼 옆에)

```html
<button onclick="addSpecialAllowanceTemplate()"
        class="btn"
        style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
    ✨ 특수수당 템플릿
</button>
```

### settings.js (함수 추가)

```javascript
window.addSpecialAllowanceTemplate = function() {
    // 특수수당 템플릿 자동 입력
    document.getElementById('allowanceName').value = '특수수당 (Phụ cấp đặc biệt)';
    document.getElementById('allowanceAmount').value = '';  // 금액은 수동 입력
    document.getElementById('allowanceOnAbsence').value = 'proportional';
    document.getElementById('allowanceOnExcusedAbsence').value = 'proportional';
    document.getElementById('allowanceOnAnnualLeave').value = 'proportional';
    document.getElementById('allowanceEnabled').checked = true;
    document.getElementById('allowanceIsTaxable').checked = true;  // 과세!
    document.getElementById('allowanceDescription').value =
        '업무 성격, 책임 및 직원의 기여도에 따라 지급\n(Phụ cấp đặc biệt tùy theo tính chất công việc, trách nhiệm và mức độ đóng góp)';

    // 모달 열기
    openAllowanceModal();

    alert('✨ 특수수당 템플릿이 입력되었습니다!\n\n금액을 입력하고 저장하세요.');
};
```

---

## 📊 **구현 우선순위**

| 순위 | 작업 | 소요 시간 | 중요도 |
|-----|-----|----------|--------|
| 1 | isTaxable 속성 추가 (데이터 구조) | 10분 | 🔴 필수 |
| 2 | 마이그레이션 (기존 데이터 호환) | 10분 | 🔴 필수 |
| 3 | 과세 소득 계산 수정 | 20분 | 🔴 필수 |
| 4 | UI 추가 (과세 여부 체크박스) | 20분 | 🟡 권장 |
| 5 | 특수수당 템플릿 | 15분 | 🟢 옵션 |
| **총 예상 시간** | **1시간 15분** | | |

---

## 🧪 **테스트 시나리오**

### 시나리오 1: 기존 수당 (과세)
```
수당: 개근수당 300,000 VND
isTaxable: true (기본값)
→ 과세 소득에 포함
→ 소득세 증가
```

### 시나리오 2: 특수수당 (과세)
```
수당: 특수수당 5,000,000 VND
isTaxable: true
description: "관리직 책임 수당"
→ 과세 소득에 포함
→ 합법 (회사 내규 명시 조건)
```

### 시나리오 3: 비과세 수당 (예외적)
```
수당: 특별 비과세 수당 1,000,000 VND
isTaxable: false
description: "법적 근거: XXX"
→ 과세 소득에서 제외
→ 소득세 감소
```

---

## ⚠️ **주의사항**

### 1. **기본값 = 과세**
- 모든 새 수당은 `isTaxable: true` 기본값
- 사용자가 명시적으로 체크 해제해야 비과세
- 안전한 방향

### 2. **비과세 수당 사용 시**
- 법적 근거 필수 기재
- description 필드에 명확히 작성
- 세무 조사 대비

### 3. **회사 내부 규정**
- 특수수당 지급 시 반드시 내규 문서화
- 제공된 베트남어 문구 사용
- 급여 대장에 공식 기록

---

## 📝 **최종 권장사항**

### ✅ **즉시 구현 권장**:
1. **isTaxable 속성 추가** (필수)
   - 유연성 확보
   - 미래 대비

2. **마이그레이션** (필수)
   - 기존 수당 모두 `isTaxable: true` 자동 설정
   - 하위 호환성 보장

3. **UI 개선** (권장)
   - 과세 여부 체크박스
   - 수당 설명 입력란

### 🟢 **선택 사항**:
4. **특수수당 템플릿**
   - 빠른 입력
   - 사용자 편의성

---

## 🎯 **다음 단계**

사용자님께 질문:

1. **isTaxable 속성 추가하시겠습니까?**
   - ✅ 예 → 지금 바로 구현
   - ❌ 아니오 → 현재 상태 유지

2. **특수수당 템플릿 추가하시겠습니까?**
   - ✅ 예 → 빠른 입력 버튼 추가
   - ❌ 아니오 → 수동 입력

3. **회사 내부 규정 문서 생성하시겠습니까?**
   - ✅ 예 → 베트남어/한국어 규정 문서 생성
   - ❌ 아니오 → 추후 작성

---

**분석 완료 일시**: 2025-11-17
**다음**: 사용자 결정 대기
