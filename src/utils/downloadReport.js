/**
 * Freedom Plan™ — Dynamic Repayment Strategy Engine & Executive PDF Generator Suite
 * Report 1: Financial Overview Report (Dashboard → Overview → Download Report)
 * Report 2: Loan Repayment Strategy Report (Dashboard → Analytics → Repayment Plan → Download PDF)
 */

/**
 * Standard Reducing Balance Monthly EMI Formula Helper
 */
function calcEMI(principal, annualRate, totalMonths) {
  if (principal <= 0 || totalMonths <= 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  const emiFactor = Math.pow(1 + monthlyRate, totalMonths);
  return Math.round((principal * monthlyRate * emiFactor) / (emiFactor - 1));
}

/**
 * Dynamic Loan Repayment Engine
 */
export function calculateDynamicSchedule(storeState = {}) {
  const defaultLoan = 2300000;
  const defaultInterestRate = 11;
  const defaultExchangeRate = 108.5;
  const defaultTenureYears = 15;

  // Single Source of Truth: Active User Inputs
  const loanAmount = Number(storeState.basicLoan) > 0 ? Number(storeState.basicLoan) : defaultLoan;
  const interestRate = Number(storeState.interestRate) > 0 ? Number(storeState.interestRate) : defaultInterestRate;
  const marketRate = Number(storeState.rate) > 0 ? Number(storeState.rate) : defaultExchangeRate;
  const tenureYears = Number(storeState.tenureYears) > 0 ? Number(storeState.tenureYears) : defaultTenureYears;

  // Business Rules: Forex Rate Markup (+₹2 processing fee)
  const forexMarkup = 2.0;
  const freedomPlanRate = marketRate + forexMarkup;

  // Business Rules: Credit Advance & Grace Period
  const creditAdvanceFee = Math.round(loanAmount * 0.01); // 1% Service Fee
  const netAmountReceived = Math.max(0, loanAmount - creditAdvanceFee);
  const gracePeriodMonths = Number(storeState.moratoriumMonths) > 0 ? Number(storeState.moratoriumMonths) : 36;
  const gracePeriodMonthlyPayment = Math.round((loanAmount * (interestRate / 100)) / 12);

  // Year 1 Initial EMI (used for baseline comparison)
  const initialMonthlyEMI = calcEMI(loanAmount, interestRate, tenureYears * 12);
  const initialAnnualEMI = initialMonthlyEMI * 12;

  // Yearly Prepayment Target
  const yearlyPrepaymentTarget = storeState.derived?.targetYearlyLumpSumINR || Math.round(loanAmount / 3 - initialAnnualEMI / 1.5);
  const yearlyPrepayment = Math.max(0, yearlyPrepaymentTarget);

  const yrSchedule = [];
  let currentBalance = loanAmount;
  let cumInterest = 0;
  let cumPrincipalRepaid = 0;

  // Baseline without prepayments (for interest savings math & missed target scenarios)
  let baseBalance = loanAmount;
  let baseCumInterest = 0;
  const baseYrSchedule = [];

  for (let i = 0; i < 3; i++) {
    // 1. Opening Balance for current year (Year k starts from Year k-1 closing balance)
    const opening = Math.max(0, currentBalance);

    if (opening === 0) {
      yrSchedule.push({
        year: i + 1,
        opening: 0,
        monthlyEMI: 0,
        annualEMI: 0,
        yearlyPrepayment: 0,
        interest: 0,
        principalRepaid: 0,
        closing: 0,
      });
      continue;
    }

    // 2. Dynamic EMI Recalculation based on remaining loan balance & remaining tenure
    const remainingTenureMonths = Math.max(12, (tenureYears - i) * 12);
    const dynamicMonthlyEMI = calcEMI(opening, interestRate, remainingTenureMonths);
    const dynamicAnnualEMI = dynamicMonthlyEMI * 12;

    // 3. Interest Charged During Year (calculated dynamically on remaining opening balance)
    const interest = Math.round(opening * (interestRate / 100));

    // 4. EMI Paid (12 Months, capped at balance + interest)
    const emiPaid = Math.min(dynamicAnnualEMI, opening + interest);

    // 5. Yearly Prepayment Applied
    const prepaymentApplied = Math.min(yearlyPrepayment, Math.max(0, opening + interest - emiPaid));

    // 6. Total Payment & Principal Repaid
    const totalPayment = emiPaid + prepaymentApplied;
    const principalRepaid = Math.min(opening, Math.max(0, totalPayment - interest));

    // 7. Remaining Loan Balance
    const closing = Math.max(0, opening - principalRepaid);

    cumInterest += interest;
    cumPrincipalRepaid += principalRepaid;

    // Baseline calculation (No prepayments made, standard unadjusted EMI)
    const baseOpening = Math.max(0, baseBalance);
    const baseInterest = Math.round(baseOpening * (interestRate / 100));
    const baseEmiPaid = Math.min(initialAnnualEMI, baseOpening + baseInterest);
    const basePrincipalPaid = Math.min(baseOpening, Math.max(0, baseEmiPaid - baseInterest));
    const baseClosing = Math.max(0, baseOpening - basePrincipalPaid);
    baseCumInterest += baseInterest;
    baseBalance = baseClosing;

    baseYrSchedule.push({
      year: i + 1,
      opening: baseOpening,
      monthlyEMI: initialMonthlyEMI,
      annualEMI: baseEmiPaid,
      yearlyPrepayment: 0,
      interest: baseInterest,
      principalRepaid: basePrincipalPaid,
      closing: baseClosing,
    });

    yrSchedule.push({
      year: i + 1,
      opening,
      monthlyEMI: dynamicMonthlyEMI,
      annualEMI: emiPaid,
      yearlyPrepayment: prepaymentApplied,
      interest,
      principalRepaid,
      closing,
    });

    // Pass closing balance as opening balance for next year
    currentBalance = closing;
  }

  const totalInterestSaved = Math.max(0, baseCumInterest - cumInterest);
  const estimatedMonthsSaved = cumPrincipalRepaid > 0 ? Math.min(180, Math.round((cumPrincipalRepaid / initialMonthlyEMI) * 1.5)) : 0;
  const estimatedYearsSaved = (estimatedMonthsSaved / 12).toFixed(1);
  const progressPct = loanAmount > 0 ? Math.min(100, (cumPrincipalRepaid / loanAmount) * 100).toFixed(1) : '100';

  const missedTargetDiffBalance = baseBalance - (yrSchedule[2]?.closing || 0);
  const missedTargetExtraInterest = baseCumInterest - cumInterest;

  return {
    reportDate: new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
    reportId: 'FP-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    loanAmount,
    interestRate,
    tenureYears,
    marketRate,
    freedomPlanRate,
    forexMarkup,
    creditAdvanceFee,
    netAmountReceived,
    gracePeriodMonths,
    gracePeriodMonthlyPayment,
    monthlyEMI: initialMonthlyEMI,
    annualEMI: initialAnnualEMI,
    yearlyPrepayment,
    yrSchedule,
    baseYrSchedule,
    cumInterest,
    cumPrincipalRepaid,
    finalBalance: yrSchedule[2]?.closing || 0,
    baseFinalBalance: baseBalance,
    totalInterestSaved,
    estimatedMonthsSaved,
    estimatedYearsSaved,
    progressPct,
    missedTargetDiffBalance,
    missedTargetExtraInterest,
  };
}

/**
 * Helpers to format Currency
 */
const fmtINR = (n) => '₹' + Math.abs(Math.round(n || 0)).toLocaleString('en-IN');
const fmtGBP = (n) => '£' + Math.abs(Math.round(n || 0)).toLocaleString('en-GB');

/**
 * Common Styles for Executive Template
 */
const COMMON_PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 10mm 10mm 10mm 10mm; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background: #ffffff;
    padding: 20px 24px;
    line-height: 1.45;
    font-size: 12px;
    -webkit-font-smoothing: antialiased;
  }
  h1 { font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.02em; text-transform: uppercase; margin: 0; }
  h2.section-header { font-size: 13px; font-weight: 800; color: #84cc16; text-transform: uppercase; letter-spacing: 0.05em; margin: 18px 0 10px 0; display: flex; align-items: center; gap: 6px; }
  h3.section-header { font-size: 11px; font-weight: 800; color: #84cc16; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .hdr-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; position: relative; }
  .hdr-left-poly { background: #1e293b; color: #ffffff; padding: 16px 40px 16px 20px; width: 58%; position: relative; clip-path: polygon(0 0, 100% 0, 86% 100%, 0 100%); display: flex; align-items: center; gap: 12px; }
  .hdr-left-poly::after { content: ''; position: absolute; top: 0; right: -24px; width: 24px; height: 100%; background: #84cc16; clip-path: polygon(0 0, 100% 0, 50% 100%, 0 100%); }
  .company-logo { width: 32px; height: 32px; background: #84cc16; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; color: #ffffff; }
  .hdr-right-meta { text-align: right; width: 40%; padding-top: 4px; }
  .hdr-doc-type { font-size: 22px; font-weight: 900; color: #84cc16; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1; }
  .hdr-doc-meta { font-size: 10.5px; color: #64748b; margin-top: 6px; }
  .hdr-doc-meta strong { color: #1e293b; }
  .info-cols { display: flex; justify-content: space-between; margin-bottom: 22px; gap: 20px; }
  .info-col { width: 48%; }
  .info-col-title { font-size: 11px; font-weight: 800; color: #84cc16; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .info-col-name { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
  .info-col-detail { font-size: 10.5px; color: #475569; line-height: 1.5; }
  table.template-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
  table.template-table th { padding: 10px 10px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border: none; }
  table.template-table th.th-green { background: #84cc16; color: #ffffff; text-align: left; }
  table.template-table th.th-navy { background: #1e293b; color: #ffffff; text-align: right; }
  table.template-table td { padding: 9.5px 10px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  table.template-table td.td-num { text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 700; }
  table.template-table tr:nth-child(even) td { background: #f8fafc; }
  .bottom-section { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
  .left-bottom { width: 52%; }
  .left-bottom-grid { font-size: 10.5px; color: #334155; margin-top: 4px; line-height: 1.6; }
  .left-bottom-grid strong { color: #0f172a; }
  .signature-box { margin-top: 20px; display: flex; flex-direction: column; align-items: flex-start; }
  .sig-img { font-family: 'Dancing Script', 'Caveat', 'Great Vibes', cursive; font-size: 24px; color: #0f172a; font-weight: 700; border-bottom: 1.5px dashed #94a3b8; padding-bottom: 2px; width: 170px; letter-spacing: 0.05em; }
  .sig-lbl { font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .right-bottom { width: 44%; display: flex; flex-direction: column; align-items: flex-end; }
  .sum-row { display: flex; justify-content: space-between; width: 100%; padding: 4px 0; font-size: 11px; color: #475569; }
  .sum-row strong { font-family: 'JetBrains Mono', monospace; color: #0f172a; }
  .total-box-green { background: #84cc16; color: #ffffff; width: 100%; padding: 12px 14px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; box-shadow: 0 4px 6px -1px rgba(132, 204, 22, 0.2); }
  .total-lbl { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
  .total-val { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 900; }
  .terms-box { border-top: 1px solid #e2e8f0; padding-top: 10px; margin-bottom: 20px; }
  .terms-text { font-size: 9.5px; color: #64748b; line-height: 1.4; }
  .exec-footer-bar { background: #1e293b; color: #ffffff; border-radius: 8px; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; }
  .footer-left { display: flex; align-items: center; gap: 16px; }
  .footer-item { display: flex; align-items: center; gap: 6px; color: #e2e8f0; }
  .footer-icon { width: 20px; height: 20px; background: #84cc16; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ffffff; font-weight: 800; }
  .footer-right { font-weight: 800; letter-spacing: 0.03em; color: #ffffff; }
  @media print { body { padding: 0; } .no-print { display: none; } }
`;

/**
 * Report 1: Financial Overview Report
 * Focus: Personal financial planning, UK living expenses budget, savings capacity & goal progress.
 */
function generateFinancialOverviewPDFHTML(storeState) {
  const data = calculateDynamicSchedule(storeState);

  const customPlan = storeState.customPlan || {};
  const monthlyIncome = customPlan.monthlyIncome || 1300;
  const rent = customPlan.rentMid || 300;
  const bills = customPlan.bills || 100;
  const travel = customPlan.travel || 100;
  const food = customPlan.food || 120;
  const shopping = customPlan.shopping || 0;
  const health = customPlan.health || 0;
  const education = customPlan.education || 0;
  const insurance = customPlan.insurance || 0;
  const misc = customPlan.misc || 0;
  const extraExpenses = shopping + health + education + insurance + misc;

  const totalExpenses = rent + bills + travel + food + extraExpenses;
  const monthlySavingsTarget = customPlan.monthlySavingsTarget || Math.ceil((data.yearlyPrepayment / data.freedomPlanRate) / 12) || 650;
  const yearlySavingsPotential = monthlySavingsTarget * 12;
  const buffer = monthlyIncome - totalExpenses - monthlySavingsTarget;
  const emergencyFundTarget = totalExpenses * 3; // 3-month living buffer

  const healthScore = buffer >= 0 ? 88 : 65;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Financial Overview Report — ${data.reportId}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
      <style>${COMMON_PDF_STYLES}</style>
    </head>
    <body>

      <!-- Geometric Top Header Banner -->
      <div class="hdr-container">
        <div class="hdr-left-poly">
          <div class="company-logo">FP</div>
          <div>
            <h1>FREEDOM PLAN</h1>
            <p style="font-size:10px; color:#cbd5e1; font-weight:600;">PERSONAL FINANCIAL PLANNING & BUDGET ANALYSIS</p>
          </div>
        </div>
        <div class="hdr-right-meta">
          <div class="hdr-doc-type">FINANCIAL OVERVIEW</div>
          <div class="hdr-doc-meta">
            <p><strong>Report Reference:</strong> #${data.reportId}</p>
            <p><strong>Issued Date:</strong> ${data.reportDate}</p>
          </div>
        </div>
      </div>

      <!-- Client & Address Info -->
      <div class="info-cols">
        <div class="info-col">
          <div class="info-col-title">Personal Financial Summary:</div>
          <div class="info-col-name">Personal Budget Strategy</div>
          <div class="info-col-detail">
            Monthly Income (UK): <strong>${fmtGBP(monthlyIncome)}</strong><br>
            Total Monthly Living Outgoings: <strong>${fmtGBP(totalExpenses)}</strong><br>
            Monthly Savings Target: <strong>${fmtGBP(monthlySavingsTarget)}</strong> (Buffer: <strong>${buffer >= 0 ? '+' : '-'}${fmtGBP(Math.abs(buffer))}</strong>)
          </div>
        </div>
        <div class="info-col">
          <div class="info-col-title">Issued By:</div>
          <div class="info-col-name">Freedom Plan System</div>
          <div class="info-col-detail">
            Support Email: <strong>freedomplan786@gmail.com</strong><br>
            Web Platforms: <strong>https://freedomplan.vercel.app/</strong> | <strong>freedomplan.guru</strong><br>
            Finance Partners: <strong>Credila | Avanse | Finsly</strong>
          </div>
        </div>
      </div>

      <!-- Section 1: Monthly Budget & Expense Breakdown Table -->
      <h2 class="section-header">1. Personal Budget & Monthly Expense Breakdown</h2>
      <table class="template-table">
        <thead>
          <tr>
            <th class="th-green" style="width:45px;">NO.</th>
            <th class="th-green">BUDGET CATEGORY</th>
            <th class="th-navy">MONTHLY ALLOCATION (GBP)</th>
            <th class="th-navy">ANNUAL OUTGOING (GBP)</th>
            <th class="th-navy">PERCENT OF INCOME</th>
            <th class="th-navy">CATEGORY STATUS</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:800; color:#84cc16;">01</td>
            <td style="font-weight:700;">Housing & Rent</td>
            <td class="td-num">${fmtGBP(rent)}</td>
            <td class="td-num">${fmtGBP(rent * 12)}</td>
            <td class="td-num">${((rent / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#0f172a; font-weight:700;">Fixed Essential</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">02</td>
            <td style="font-weight:700;">Bills & Utilities</td>
            <td class="td-num">${fmtGBP(bills)}</td>
            <td class="td-num">${fmtGBP(bills * 12)}</td>
            <td class="td-num">${((bills / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#0f172a; font-weight:700;">Fixed Essential</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">03</td>
            <td style="font-weight:700;">Food & Groceries</td>
            <td class="td-num">${fmtGBP(food)}</td>
            <td class="td-num">${fmtGBP(food * 12)}</td>
            <td class="td-num">${((food / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#0f172a; font-weight:700;">Living Essential</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">04</td>
            <td style="font-weight:700;">Transportation & Travel</td>
            <td class="td-num">${fmtGBP(travel)}</td>
            <td class="td-num">${fmtGBP(travel * 12)}</td>
            <td class="td-num">${((travel / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#0f172a; font-weight:700;">Living Essential</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">05</td>
            <td style="font-weight:700;">Shopping & Discretionary</td>
            <td class="td-num">${fmtGBP(shopping)}</td>
            <td class="td-num">${fmtGBP(shopping * 12)}</td>
            <td class="td-num">${((shopping / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#64748b;">Discretionary</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">06</td>
            <td style="font-weight:700;">Other Expenses (Health/Misc)</td>
            <td class="td-num">${fmtGBP(extraExpenses - shopping)}</td>
            <td class="td-num">${fmtGBP((extraExpenses - shopping) * 12)}</td>
            <td class="td-num">${(((extraExpenses - shopping) / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#64748b;">Variable</td>
          </tr>
          <tr style="background:#f1f5f9; font-weight:800;">
            <td style="font-weight:800; color:#84cc16;">∑</td>
            <td style="font-weight:800; color:#0f172a;">TOTAL MONTHLY EXPENSES</td>
            <td class="td-num" style="color:#0f172a; font-weight:900;">${fmtGBP(totalExpenses)}</td>
            <td class="td-num" style="color:#0f172a; font-weight:900;">${fmtGBP(totalExpenses * 12)}</td>
            <td class="td-num" style="color:#0f172a; font-weight:900;">${((totalExpenses / monthlyIncome) * 100).toFixed(1)}%</td>
            <td class="td-num" style="color:#059669; font-weight:900;">Budget Base</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 2: Loan Summary Overview -->
      <h2 class="section-header">2. Loan Overview & Prepayment Goals</h2>
      <table class="template-table">
        <thead>
          <tr>
            <th class="th-green" style="width:45px;">NO.</th>
            <th class="th-green">LOAN PARAMETER</th>
            <th class="th-navy">VALUE (INR)</th>
            <th class="th-navy">VALUE (GBP EQUIVALENT)</th>
            <th class="th-navy">DETAILS / POLICY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:800; color:#84cc16;">L1</td>
            <td style="font-weight:700;">Initial Principal Loan Amount</td>
            <td class="td-num">${fmtINR(data.loanAmount)}</td>
            <td class="td-num">${fmtGBP(data.loanAmount / data.freedomPlanRate)}</td>
            <td class="td-num" style="color:#0f172a;">Education Principal</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">L2</td>
            <td style="font-weight:700;">Annual Interest Rate</td>
            <td class="td-num">${data.interestRate}% p.a.</td>
            <td class="td-num">${data.interestRate}% p.a.</td>
            <td class="td-num" style="color:#0f172a;">Reducing Balance Rate</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">L3</td>
            <td style="font-weight:700;">Grace Period Moratorium</td>
            <td class="td-num">${data.gracePeriodMonths} Months</td>
            <td class="td-num">${fmtGBP(data.gracePeriodMonthlyPayment / data.freedomPlanRate)}/mo</td>
            <td class="td-num" style="color:#0f172a;">Study Moratorium Interest</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">L4</td>
            <td style="font-weight:700;">Current Monthly EMI</td>
            <td class="td-num">${fmtINR(data.monthlyEMI)}</td>
            <td class="td-num">${fmtGBP(data.monthlyEMI / data.freedomPlanRate)}/mo</td>
            <td class="td-num" style="color:#0f172a;">Standard Monthly EMI</td>
          </tr>
          <tr>
            <td style="font-weight:800; color:#84cc16;">L5</td>
            <td style="font-weight:700;">Target Yearly Prepayment Goal</td>
            <td class="td-num" style="color:#059669; font-weight:800;">${fmtINR(data.yearlyPrepayment)}</td>
            <td class="td-num" style="color:#059669; font-weight:800;">${fmtGBP(data.yearlyPrepayment / data.freedomPlanRate)}/yr</td>
            <td class="td-num" style="color:#059669; font-weight:800;">Lump Sum Prepayment Goal</td>
          </tr>
        </tbody>
      </table>

      <!-- Bottom Split Section -->
      <div class="bottom-section">
        <div class="left-bottom">
          <h3 class="section-header">Financial Analysis & Capacity:</h3>
          <div class="left-bottom-grid">
            <p><strong>Income vs Expenses:</strong> Living outgoings consume ${((totalExpenses / monthlyIncome) * 100).toFixed(1)}% of monthly net UK income.</p>
            <p><strong>Savings Capacity:</strong> ${((monthlySavingsTarget / monthlyIncome) * 100).toFixed(1)}% (£${monthlySavingsTarget}/mo) is committed to debt freedom goals.</p>
            <p><strong>Recommended Emergency Fund:</strong> ${fmtGBP(emergencyFundTarget)} (3 Months Reserve)</p>
            <p><strong>Financial Goal Progress:</strong> <strong>${data.progressPct}%</strong> achieved toward overall loan freedom.</p>
          </div>

          <div class="signature-box">
            <div class="sig-img">Freedom Plan</div>
            <div class="sig-lbl">Authorised Signature</div>
          </div>
        </div>

        <div class="right-bottom">
          <div class="sum-row">
            <span>Financial Health Score:</span>
            <strong style="color:#059669;">${healthScore} / 100 (${healthScore >= 80 ? 'EXCELLENT' : 'GOOD'})</strong>
          </div>
          <div class="sum-row">
            <span>Monthly Saving Potential:</span>
            <strong>${fmtGBP(monthlyIncome - totalExpenses)}/mo</strong>
          </div>
          <div class="sum-row">
            <span>Yearly Saving Potential:</span>
            <strong>${fmtGBP((monthlyIncome - totalExpenses) * 12)}/yr</strong>
          </div>
          <div class="sum-row">
            <span>Estimated Loan Completion:</span>
            <strong style="color:#059669;">${data.estimatedYearsSaved} Years Shaved Off</strong>
          </div>

          <!-- Lime Green Highlight Box -->
          <div class="total-box-green">
            <div class="total-lbl">Target Annual Savings</div>
            <div class="total-val">${fmtGBP(yearlySavingsPotential)} / ${fmtINR(data.yearlyPrepayment)}</div>
          </div>
        </div>
      </div>

      <!-- Recommended Next Steps -->
      <div class="terms-box">
        <h3 class="section-header">Recommended Next Steps:</h3>
        <p class="terms-text">
          1. <strong>Automate Monthly Savings:</strong> Set up a standing order for <strong>${fmtGBP(monthlySavingsTarget)}/month</strong> immediately post-payday.<br>
          2. <strong>Build Emergency Buffer:</strong> Hold <strong>${fmtGBP(emergencyFundTarget)}</strong> in instant access savings before making extra prepayments.<br>
          3. <strong>Annual Transfer:</strong> Transfer accumulated UK savings every December to execute principal prepayments.<br>
          4. <strong>Track Forex Rates:</strong> Monitor live FX movements at <strong>https://freedomplan.vercel.app/</strong> and <strong>freedomplan.guru</strong>.
        </p>
      </div>

      <!-- Dark Navy Footer Bar -->
      <div class="exec-footer-bar">
        <div class="footer-left">
          <div class="footer-item">
            <div class="footer-icon">✉</div>
            <span>freedomplan786@gmail.com</span>
          </div>
          <div class="footer-item">
            <div class="footer-icon">🌐</div>
            <span>https://freedomplan.vercel.app/ | freedomplan.guru</span>
          </div>
        </div>
        <div class="footer-right">
          Thank You For Your Business — Freedom Plan™
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Report 2: Loan Repayment Strategy Report
 * Focus: Education loan repayment strategy, dynamic 3-year schedule, interest savings & Freedom Plan analytics.
 */
function generateLoanRepaymentPDFHTML(storeState) {
  const data = calculateDynamicSchedule(storeState);

  const customPlan = storeState.customPlan || {};
  const monthlySavingsTarget = customPlan.monthlySavingsTarget || Math.ceil((data.yearlyPrepayment / data.freedomPlanRate) / 12) || 650;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Loan Repayment Strategy Report — ${data.reportId}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
      <style>${COMMON_PDF_STYLES}</style>
    </head>
    <body>

      <!-- Geometric Top Header Banner -->
      <div class="hdr-container">
        <div class="hdr-left-poly">
          <div class="company-logo">FP</div>
          <div>
            <h1>FREEDOM PLAN</h1>
            <p style="font-size:10px; color:#cbd5e1; font-weight:600;">EDUCATION LOAN REPAYMENT & INTEREST ACCELERATION</p>
          </div>
        </div>
        <div class="hdr-right-meta">
          <div class="hdr-doc-type">REPAYMENT REPORT</div>
          <div class="hdr-doc-meta">
            <p><strong>Report Reference:</strong> #${data.reportId}</p>
            <p><strong>Issued Date:</strong> ${data.reportDate}</p>
          </div>
        </div>
      </div>

      <!-- Loan Information (Lime Green Titles) -->
      <div class="info-cols">
        <div class="info-col">
          <div class="info-col-title">Loan Information:</div>
          <div class="info-col-name">Education Loan Repayment Strategy</div>
          <div class="info-col-detail">
            Initial Principal Loan: <strong>${fmtINR(data.loanAmount)}</strong> (${fmtGBP(data.loanAmount / data.freedomPlanRate)})<br>
            Interest Rate: <strong>${data.interestRate}% p.a.</strong> (Reducing Balance)<br>
            Grace Period: <strong>${data.gracePeriodMonths} Months</strong> (Interest: <strong>${fmtINR(data.gracePeriodMonthlyPayment)}/mo</strong>)
          </div>
        </div>
        <div class="info-col">
          <div class="info-col-title">Issued By:</div>
          <div class="info-col-name">Freedom Plan Analytics</div>
          <div class="info-col-detail">
            Support Email: <strong>freedomplan786@gmail.com</strong><br>
            Website Platforms: <strong>https://freedomplan.vercel.app/</strong> | <strong>freedomplan.guru</strong><br>
            Monthly EMI / Target: <strong>${fmtINR(data.monthlyEMI)}/mo</strong> | Prepayment: <strong>${fmtINR(data.yearlyPrepayment)}/yr</strong>
          </div>
        </div>
      </div>

      <!-- Dynamic 3-Year Repayment Schedule Table -->
      <h2 class="section-header">Dynamic 3-Year Loan Repayment Schedule</h2>
      <table class="template-table">
        <thead>
          <tr>
            <th class="th-green" style="width:45px;">NO.</th>
            <th class="th-green">REPAYMENT ITEM / YEAR</th>
            <th class="th-navy">OPENING BALANCE</th>
            <th class="th-navy">12M EMI PAID</th>
            <th class="th-navy">YEARLY PREPAYMENT</th>
            <th class="th-navy">INTEREST CHARGED</th>
            <th class="th-navy">PRINCIPAL REPAID</th>
            <th class="th-navy">CLOSING BALANCE</th>
          </tr>
        </thead>
        <tbody>
          ${data.yrSchedule.map((yr, idx) => `
            <tr>
              <td style="font-weight:800; color:#84cc16;">0${yr.year}</td>
              <td style="font-weight:700;">Year ${yr.year} Schedule (Recalculated EMI: ${fmtINR(yr.monthlyEMI)}/mo)</td>
              <td class="td-num">${fmtINR(yr.opening)}</td>
              <td class="td-num">${fmtINR(yr.annualEMI)}</td>
              <td class="td-num" style="color:#059669; font-weight:800;">${fmtINR(yr.yearlyPrepayment)}</td>
              <td class="td-num" style="color:#c2410c;">${fmtINR(yr.interest)}</td>
              <td class="td-num" style="color:#15803d; font-weight:800;">${fmtINR(yr.principalRepaid)}</td>
              <td class="td-num" style="color:#0f172a; font-weight:900;">${fmtINR(yr.closing)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Freedom Plan Benefits & Analytics Section -->
      <div class="bottom-section">
        <div class="left-bottom">
          <h3 class="section-header">Freedom Plan Benefits:</h3>
          <div class="left-bottom-grid">
            <p><strong>Early Loan Closure:</strong> Shaves off <strong>${data.estimatedYearsSaved} Years</strong> from total tenure.</p>
            <p><strong>Lower Interest Cost:</strong> Saves <strong>${fmtINR(data.totalInterestSaved)}</strong> in compounding interest.</p>
            <p><strong>Credit Advance Fee (1%):</strong> ${fmtINR(data.creditAdvanceFee)} (Net Received: ${fmtINR(data.netAmountReceived)})</p>
            <p><strong>Grace Period Moratorium:</strong> ${data.gracePeriodMonths} Months (${fmtINR(data.gracePeriodMonthlyPayment)}/mo interest)</p>
          </div>

          <div class="signature-box">
            <div class="sig-img">Freedom Plan</div>
            <div class="sig-lbl">Authorised Signature</div>
          </div>
        </div>

        <div class="right-bottom">
          <div class="sum-row">
            <span>Total 3Y Interest Paid:</span>
            <strong style="color:#c2410c;">${fmtINR(data.cumInterest)}</strong>
          </div>
          <div class="sum-row">
            <span>Total Principal Repaid:</span>
            <strong>${fmtINR(data.cumPrincipalRepaid)}</strong>
          </div>
          <div class="sum-row">
            <span>Final 3Y Remaining Balance:</span>
            <strong>${fmtINR(data.finalBalance)}</strong>
          </div>
          <div class="sum-row">
            <span>Debt-Free Percentage:</span>
            <strong style="color:#059669;">${data.progressPct}%</strong>
          </div>

          <!-- Lime Green Highlight Box -->
          <div class="total-box-green">
            <div class="total-lbl">Total Interest Saved</div>
            <div class="total-val">${fmtINR(data.totalInterestSaved)}</div>
          </div>
        </div>
      </div>

      <!-- Warning Section: Missed Targets -->
      <div class="terms-box">
        <h3 class="section-header">If You Miss the Yearly Target:</h3>
        <p class="terms-text">
          1. <strong>Outstanding Balance Stays Higher:</strong> Missing a planned prepayment leaves ${fmtINR(data.yearlyPrepayment)} in unpaid principal, causing interest to compound on a higher balance.<br>
          2. <strong>Accrued Interest Increases:</strong> Skipping prepayments results in approximately <strong>${fmtINR(data.missedTargetExtraInterest)} extra</strong> in compounding interest.<br>
          3. <strong>Extended Tenure:</strong> Your debt freedom timeline will be delayed by up to <strong>${data.estimatedYearsSaved} years</strong>.<br>
          4. <strong>Correction Note:</strong> Principal does <em>not automatically increase</em> when targets are missed; unpaid principal remains outstanding, incurring interest charges over time.
        </p>
      </div>

      <!-- Contact Support & Dark Navy Footer Bar -->
      <div class="exec-footer-bar">
        <div class="footer-left">
          <div class="footer-item">
            <div class="footer-icon">✉</div>
            <span>freedomplan786@gmail.com</span>
          </div>
          <div class="footer-item">
            <div class="footer-icon">🌐</div>
            <span>https://freedomplan.vercel.app/ | freedomplan.guru</span>
          </div>
        </div>
        <div class="footer-right">
          Thank You For Your Business — Freedom Plan™
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;
}

/**
 * Common PDF Open Handler with automatic pop-up blocker fallback download
 */
function triggerFallbackFileDownload(title, htmlContent) {
  try {
    const cleanTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${cleanTitle}.html`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }, 200);
  } catch (e) {
    console.error('Fallback report download failed:', e);
  }
}

function openPDFWindow(title, htmlContent) {
  try {
    const printWindow = window.open('', '_blank', 'width=1050,height=950');
    if (printWindow && !printWindow.closed) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      triggerFallbackFileDownload(title, htmlContent);
    }
  } catch (e) {
    console.warn('Pop-up window blocked, triggering file download fallback:', e);
    triggerFallbackFileDownload(title, htmlContent);
  }
}

/**
 * Report 1: Financial Overview Report (Dashboard → Overview → Download Report)
 */
export function triggerDashboardPDFReport(storeState = {}) {
  const htmlContent = generateFinancialOverviewPDFHTML(storeState);
  openPDFWindow('Freedom Plan — Financial Overview Report', htmlContent);
}

/**
 * Report 2: Loan Repayment Strategy Report (Dashboard → Analytics → Repayment Plan → Download PDF)
 */
export function triggerRepaymentPDFReport(storeState = {}) {
  const htmlContent = generateLoanRepaymentPDFHTML(storeState);
  openPDFWindow('Freedom Plan — Loan Repayment Strategy Report', htmlContent);
}

/**
 * Financial Summary Report (Mapped to Repayment Strategy Report)
 */
export function triggerFinancialSummaryPDFReport(storeState = {}) {
  const htmlContent = generateLoanRepaymentPDFHTML(storeState);
  openPDFWindow('Freedom Plan — Financial Summary Report', htmlContent);
}

/**
 * Freedom Plan Comprehensive Report (Mapped to Repayment Strategy Report)
 */
export function triggerFreedomPlanPDFReport(storeState = {}) {
  const htmlContent = generateLoanRepaymentPDFHTML(storeState);
  openPDFWindow('Freedom Plan — Comprehensive Strategy Report', htmlContent);
}

/**
 * Legacy Aliases
 */
export function triggerReportDownload(storeState = {}) {
  triggerRepaymentPDFReport(storeState);
}

export function triggerOverviewReportDownload(storeState = {}) {
  triggerDashboardPDFReport(storeState);
}
