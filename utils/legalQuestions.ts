export const legalQuestions = [
  {
    id: 'name',
    text: 'מה שמך המלא?',
    type: 'text',
    next: 'gender'
  },
  {
    id: 'gender',
    text: 'מין',
    type: 'select',
    options: [
      { value: 'male', label: 'גבר' },
      { value: 'female', label: 'אישה' }
    ],
    next: 'age'
  },
  {
    id: 'age',
    text: 'בן / בת כמה את/ה?',
    type: 'number',
    next: 'income'
  },
  {
    id: 'income',
    text: 'הכנסה חודשית ממוצעת (ברוטו)',
    type: 'number',
    next: (state: any) => {
      if (state.income < 6000) {
        return (state.age >= state.retirementAge) ? 'medicalCondition' : 'workStatus';
      }
      return 'taxPaid';
    }
  },
  {
    id: 'taxPaid',
    text: 'כמה מס הכנסה שולם בממוצע בחודש (ב-6 השנים האחרונות)?',
    type: 'number',
    next: (state: any) => {
      if (state.age >= state.retirementAge) {
        return 'medicalCondition';
      }
      return 'workStatus';
    }
  },
  {
    id: 'workStatus',
    text: 'סטטוס תעסוקתי נוכחי',
    type: 'select',
    options: [
      { value: 'working', label: 'עובד' },
      { value: 'stopped', label: 'הפסיק לעבוד בגלל המצב' },
      { value: 'unemployed', label: 'לא עבד לפני המקרה' }
    ],
    next: 'pensionActive'
  },
  {
    id: 'pensionActive',
    text: 'האם יש קרן פנסיה פעילה או ביטוח מנהלים?',
    type: 'select',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' }
    ],
    next: 'medicalCondition'
  },
  {
    id: 'medicalCondition',
    text: 'האם אובחנה מחלה משמעותית?',
    type: 'select',
    options: [
      { value: 'cancer', label: 'סרטן' },
      { value: 'stroke', label: 'שבץ מוחי' },
      { value: 'injury', label: 'פציעה / תאונה' },
      { value: 'other', label: 'אחר' },
      { value: 'none', label: 'ללא אבחנה ספציפית' }
    ],
    next: (state: any) => {
      if (state.medicalCondition === 'cancer') {
        if (state.taxPaid < 1000) return 'hasAdlDifficulty';
        return 'workedDuringTreatments';
      }
      if (state.medicalCondition === 'stroke') return 'strokeDetails';
      if (state.medicalCondition === 'injury') return 'workAccident';
      return 'hasAdlDifficulty';
    }
  },
  {
    id: 'workedDuringTreatments',
    text: 'האם עבדת ושילמת מס במהלך תקופת הטיפולים האקטיביים?',
    type: 'select',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' }
    ],
    next: 'hasAdlDifficulty'
  },
  {
    id: 'strokeDetails',
    text: 'האם היה אשפוז או שיקום בעקבות השבץ?',
    type: 'select',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' }
    ],
    next: 'hasAdlDifficulty'
  },
  {
    id: 'workAccident',
    text: 'האם מדובר בתאונת עבודה שהוכרה ע"י ביטוח לאומי?',
    type: 'select',
    options: [
      { value: 'yes', label: 'כן' },
      { value: 'no', label: 'לא' }
    ],
    next: 'hasAdlDifficulty'
  },
  {
    id: 'hasAdlDifficulty',
    text: 'האם יש קושי משמעותי בתפקוד היומיומי בתוך הבית?',
    type: 'select',
    options: [
      { value: 'yes', label: 'כן, יש קושי' },
      { value: 'no', label: 'לא, עצמאי לחלוטין' }
    ],
    next: (state: any) => {
      if (state.hasAdlDifficulty === 'yes') return 'adlDetails';
      return 'existingBenefits';
    }
  },
  {
    id: 'adlDetails',
    text: 'באילו פעולות הלקוח זקוק לעזרה?',
    type: 'multiselect',
    options: [
      { value: 'bath', label: 'רחצה' },
      { value: 'dress', label: 'לבוש' },
      { value: 'mobility', label: 'ניידות בתוך הבית' },
      { value: 'supervision', label: 'זקוק להשגחה מתמדת' }
    ],
    next: 'existingBenefits'
  },
  {
    id: 'existingBenefits',
    text: 'אילו קצבאות הלקוח כבר מקבל כיום?',
    type: 'multiselect',
    options: [
      { value: 'general', label: 'נכות כללית' },
      { value: 'attendance', label: 'שר"מ' },
      { value: 'nursing', label: 'סיעוד' },
      { value: 'mobility', label: 'ניידות' },
      { value: 'tax_exempt', label: 'פטור ממס' },
      { value: 'none', label: 'לא מקבל קצבאות' }
    ],
    next: 'results'
  }
];
