export const calculateRetirementAge = (age: number, gender: 'male' | 'female') => {
  if (gender === 'male') return 67;

  const currentYear = 2026; 
  const birthYear = currentYear - age;

  if (gender === 'female') {
    if (birthYear < 1960) return 62;
    if (birthYear === 1960) return 62.33; 
    if (birthYear === 1961) return 62.66; 
    if (birthYear === 1962) return 63;
    if (birthYear === 1963) return 63.25;
    if (birthYear === 1964) return 63.5;
    if (birthYear === 1965) return 63.75;
    if (birthYear === 1966) return 64;
    if (birthYear === 1967) return 64.25;
    if (birthYear === 1968) return 64.5;
    if (birthYear === 1969) return 64.75;
    return 65; 
  }
  return 67;
};

export interface LegalResult {
  id: string;
  title: string;
  description: string;
  type: string;
}

export const evaluateResults = (state: any): LegalResult[] => {
  const results: LegalResult[] = [];
  const { 
    taxPaid = 0, 
    medicalCondition, 
    workedDuringTreatments, 
    age, 
    retirementAge,
    currentBenefits = [],
    workStatus,
    pensionActive,
    adlDetails = []
  } = state;

  const isRetired = age >= retirementAge;
  const receivingTaxExempt = currentBenefits.includes('tax_exempt');
  const receivingGeneral = currentBenefits.includes('general');
  const receivingAttendance = currentBenefits.includes('attendance');
  const receivingNursing = currentBenefits.includes('nursing');

  // 1. Tax Refund / Exemption
  if (taxPaid >= 1000 && !receivingTaxExempt) {
    if (medicalCondition === 'cancer') {
      if (workedDuringTreatments === 'yes') {
        results.push({
          id: 'tax_retro',
          title: "החזר מס רטרואקטיבי (יגיעה אישית)",
          description: "זכאות פוטנציאלית עקב עבודה במהלך הטיפולים ותשלום מס מעל 1,000 ש\"ח.",
          type: "tax"
        });
      }
    } else {
      results.push({
        id: 'tax_general',
        title: "החזר מס / פטור ממס",
        description: "בדיקת זכאות להחזר מס רטרואקטיבי או פטור עקב נכות רפואית גבוהה.",
        type: "tax"
      });
    }
  }

  // 2. Loss of Work Capacity (Pension)
  if (workStatus === 'stopped' && pensionActive === 'yes') {
    results.push({
      id: 'pension_disability',
      title: "אובדן כושר עבודה (פנסיית נכות)",
      description: "קיימת קרן פנסיה פעילה והפסקת עבודה. ניתן לתבוע קצבת נכות מהקרן.",
      type: "pension"
    });
  }

  // 3. Benefits (General Disability / Attendance / Nursing)
  const adlTotal = adlDetails.length;
  const needsSupervision = adlDetails.includes('supervision');

  if (!isRetired) {
    if (state.income < 8000 && !receivingGeneral) {
      results.push({
        id: 'disability_general',
        title: "קצבת נכות כללית",
        description: "הכנסה נמוכה מ-8,000 ש\"ח וקיום ליקוי רפואי.",
        type: "benefit"
      });
    }
    if (state.income < 60000 && (adlTotal >= 2 || needsSupervision) && !receivingAttendance) {
      results.push({
        id: 'services_special',
        title: "קצבת שירותים מיוחדים (שר\"מ)",
        description: "קושי בתפקוד היומיומי והכנסה מתחת ל-60,000 ש\"ח.",
        type: "benefit"
      });
    }
  } else {
    if ((adlTotal >= 1 || needsSupervision) && !receivingNursing) {
      results.push({
        id: 'nursing_benefit',
        title: "קצבת סיעוד",
        description: "זכאות לקצבת סיעוד לאחר גיל פרישה עקב צורך בעזרה בתפקודי היומיום.",
        type: "benefit"
      });
    }
  }

  // 4. Worsening of Condition
  const isWorsening = (receivingAttendance || receivingNursing) && (adlTotal >= 3 || needsSupervision);
  if (isWorsening) {
    results.push({
      id: 'worsening',
      title: "החמרת מצב",
      description: "הלקוח כבר מקבל קצבה, אך רמת התפקוד הנוכחית מעידה על הידרדרות שעשויה להגדיל את הזכאות.",
      type: "worsening"
    });
  }

  if (results.length === 0) {
    results.push({
      id: 'full_exhaustion',
      title: "הלקוח ממצה את זכויותיו",
      description: "על סמך הנתונים שהוזנו, הלקוח כבר מקבל את כל הזכויות והקצבאות האפשריות.",
      type: "info"
    });
  }

  return results;
};
