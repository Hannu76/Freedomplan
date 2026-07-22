/**
 * Freedom Plan™ — Single Source of Truth & Dynamic Repayment Strategy Engine
 * Calculates reducing balance loan schedule starting directly from initial loan amount.
 */

export function calculateDynamicSchedule(storeState = {}) {
  const defaultLoan = 2300000;
  const defaultRate = 11;
  const defaultExchangeRate = 108.5;
  const defaultTenureYears = 15;

  // Single Source of Truth: Active User Inputs with Default Fallbacks
  const loanAmount = Number(storeState.basicLoan) > 0 ? Number(storeState.basicLoan) : defaultLoan;
  const interestRate = Number(storeState.interestRate) > 0 ? Number(storeState.interestRate) : defaultRate;
  const rate = Number(storeState.rate) > 0 ? Number(storeState.rate) : defaultExchangeRate;
  const tenureYears = Number(storeState.tenureYears) > 0 ? Number(storeState.tenureYears) : defaultTenureYears;

  // Standard Reducing Balance Monthly EMI Formula
  const totalMonths = tenureYears * 12;
  const monthlyRate = interestRate / 12 / 100;
  const emiFactor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyEMI = Math.round((loanAmount * monthlyRate * emiFactor) / (emiFactor - 1));
  const annualEMI = monthlyEMI * 12;

  // Yearly Prepayment Target
  const yearlyPrepaymentTarget = storeState.derived?.targetYearlyLumpSumINR || Math.round(loanAmount / 3 - annualEMI / 1.5);
  const yearlyPrepayment = Math.max(0, yearlyPrepaymentTarget);

  // Year 1 Opening Balance MUST equal the Initial Loan Amount
  const yrSchedule = [];
  let currentBalance = loanAmount;
  let cumInterest = 0;
  let cumPrincipalRepaid = 0;

  // Baseline without prepayments for interest savings math
  let baseBalance = loanAmount;
  let baseCumInterest = 0;

  for (let i = 0; i < 3; i++) {
    // 1. Opening Balance for current year
    const opening = Math.max(0, currentBalance);

    if (opening === 0) {
      yrSchedule.push({
        year: i + 1,
        opening: 0,
        annualEMI: 0,
        yearlyPrepayment: 0,
        interest: 0,
        principalRepaid: 0,
        closing: 0,
      });
      continue;
    }

    // 2. Interest Charged During Year (calculated on outstanding balance)
    const interest = Math.round(opening * (interestRate / 100));

    // 3. EMI Paid (12 Months)
    const emiPaid = Math.min(annualEMI, opening + interest);

    // 4. Yearly Prepayment Applied
    const prepaymentApplied = Math.min(yearlyPrepayment, Math.max(0, opening + interest - emiPaid));

    // 5. Total Payment & Principal Repaid
    const totalPayment = emiPaid + prepaymentApplied;
    const principalRepaid = Math.min(opening, Math.max(0, totalPayment - interest));

    // 6. Remaining Loan Balance
    const closing = Math.max(0, opening - principalRepaid);

    cumInterest += interest;
    cumPrincipalRepaid += principalRepaid;

    // Baseline calculation (No prepayments)
    const baseOpening = Math.max(0, baseBalance);
    const baseInterest = Math.round(baseOpening * (interestRate / 100));
    const baseEmiPaid = Math.min(annualEMI, baseOpening + baseInterest);
    const basePrincipalPaid = Math.min(baseOpening, Math.max(0, baseEmiPaid - baseInterest));
    const baseClosing = Math.max(0, baseOpening - basePrincipalPaid);
    baseCumInterest += baseInterest;
    baseBalance = baseClosing;

    yrSchedule.push({
      year: i + 1,
      opening,
      annualEMI: emiPaid,
      yearlyPrepayment: prepaymentApplied,
      interest,
      principalRepaid,
      closing,
    });

    currentBalance = closing;
  }

  // --- Strict Validation Suite ---
  const vErrors = [];
  if (yrSchedule[0].opening !== loanAmount) {
    vErrors.push(`Year 1 Opening Balance (${yrSchedule[0].opening}) does not match Initial Loan (${loanAmount}).`);
  }
  if (yrSchedule[1].opening !== yrSchedule[0].closing) {
    vErrors.push(`Year 2 Opening Balance (${yrSchedule[1].opening}) does not match Year 1 Closing (${yrSchedule[0].closing}).`);
  }
  if (yrSchedule[2].opening !== yrSchedule[1].closing) {
    vErrors.push(`Year 3 Opening Balance (${yrSchedule[2].opening}) does not match Year 2 Closing (${yrSchedule[1].closing}).`);
  }
  yrSchedule.forEach((yr) => {
    if (yr.closing < 0) vErrors.push(`Year ${yr.year} closing balance is negative (${yr.closing}).`);
    if (yr.principalRepaid > yr.opening) vErrors.push(`Year ${yr.year} principal repaid (${yr.principalRepaid}) exceeds opening (${yr.opening}).`);
  });

  if (vErrors.length > 0) {
    console.error('Repayment Schedule Validation Error(s):', vErrors);
  }

  const totalInterestSaved = Math.max(0, baseCumInterest - cumInterest);
  const estimatedMonthsSaved = cumPrincipalRepaid > 0 ? Math.min(180, Math.round((cumPrincipalRepaid / monthlyEMI) * 1.5)) : 0;
  const estimatedYearsSaved = (estimatedMonthsSaved / 12).toFixed(1);
  const progressPct = loanAmount > 0 ? Math.min(100, (cumPrincipalRepaid / loanAmount) * 100).toFixed(1) : '100';

  return {
    reportDate: new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
    reportId: 'FP-3YR-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    loanAmount,
    interestRate,
    tenureYears,
    rate,
    monthlyEMI,
    annualEMI,
    yearlyPrepayment,
    yrSchedule,
    cumInterest,
    cumPrincipalRepaid,
    finalBalance: yrSchedule[2]?.closing || 0,
    totalInterestSaved,
    estimatedMonthsSaved,
    estimatedYearsSaved,
    progressPct,
  };
}

export function triggerReportDownload(storeState = {}) {
  const data = calculateDynamicSchedule(storeState);
  const fmt = (n) => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
  const fmtGBP = (n) => '£' + Math.abs(Math.round(n)).toLocaleString('en-GB');

  // 1. Generate Plain Text Report
  const textContent = `===================================================================
FREEDOM PLAN™ — DYNAMIC 3-YEAR REPAYMENT STRATEGY REPORT
===================================================================
Prepared for: Your Account
Report Date: ${data.reportDate}
Reference ID: ${data.reportId}

-------------------------------------------------------------------
1. LOAN INPUT PARAMETERS
-------------------------------------------------------------------
- Initial Loan Amount:          ${fmt(data.loanAmount)} (${fmtGBP(data.loanAmount / data.rate)})
- Annual Interest Rate:        ${data.interestRate}% p.a.
- Loan Tenure:                 ${data.tenureYears} Years
- Estimated Monthly EMI:       ${fmt(data.monthlyEMI)}
- Planned Yearly Prepayment:  ${fmt(data.yearlyPrepayment)}
- Exchange Rate Baseline:      £1 = ₹${data.rate.toFixed(2)}

-------------------------------------------------------------------
2. DYNAMIC 3-YEAR REPAYMENT SCHEDULE
-------------------------------------------------------------------
${data.yrSchedule.map(yr => `
YEAR ${yr.year}:
- Opening Loan Balance:   ${fmt(yr.opening)}
- EMI Paid (12M):        ${fmt(yr.annualEMI)}
- Yearly Prepayment:     ${fmt(yr.yearlyPrepayment)}
- Interest Charged:      ${fmt(yr.interest)}
- Principal Repaid:      ${fmt(yr.principalRepaid)}
- Remaining Loan Balance: ${fmt(yr.closing)}
-------------------------------------------------------------------`).join('\n')}

-------------------------------------------------------------------
3. FINAL 3-YEAR SUMMARY & OUTCOMES
-------------------------------------------------------------------
- Total Interest Paid:        ${fmt(data.cumInterest)}
- Total Principal Repaid:     ${fmt(data.cumPrincipalRepaid)}
- Remaining Loan Balance:      ${fmt(data.finalBalance)}
- Estimated Time Saved:       ${data.estimatedYearsSaved} Years (${data.estimatedMonthsSaved} Months)
- Estimated Interest Saved:   ${fmt(data.totalInterestSaved)}
- Debt Freedom Progress:      ${data.progressPct}%

===================================================================
Freedom Plan™ Financial Analytics — https://freedom-plan.app/
===================================================================
`;

  // Trigger File Download
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `FreedomPlan_3Year_Repayment_Strategy_${data.reportId}.txt`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);

  // 2. Open Formatted PDF Print Window
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=950');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>3-Year Repayment Strategy - ${data.reportId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; line-height: 1.5; background: #fff; }
            .header { border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { color: #0369a1; font-size: 24px; margin: 0 0 4px 0; font-weight: 800; }
            .subtitle { color: #64748b; font-size: 13px; margin: 0; }
            .meta { text-align: right; font-size: 12px; color: #64748b; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
            .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .card-val { font-size: 16px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #0f172a; color: #fff; text-align: right; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
            th:first-child { text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; text-align: right; }
            td:first-child { text-align: left; font-weight: 700; }
            tr:nth-child(even) { background: #f8fafc; }
            .summary-box { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 18px; margin-top: 24px; }
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
            .sum-item { text-align: center; background: #fff; padding: 10px; border-radius: 8px; border: 1px solid #dcfce7; }
            .sum-lbl { font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase; }
            .sum-val { font-size: 16px; font-weight: 800; color: #14532d; margin-top: 2px; }
            .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Freedom Plan™ — 3-Year Repayment Strategy</h1>
              <p class="subtitle">Personalized Dynamic Loan & Interest Analysis</p>
            </div>
            <div class="meta">
              <p><strong>Ref:</strong> ${data.reportId}</p>
              <p><strong>Date:</strong> ${data.reportDate}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Initial Loan Amount</div>
              <div class="card-val">${fmt(data.loanAmount)}</div>
            </div>
            <div class="card">
              <div class="card-title">Interest Rate</div>
              <div class="card-val">${data.interestRate}% p.a.</div>
            </div>
            <div class="card">
              <div class="card-title">Monthly EMI</div>
              <div class="card-val">${fmt(data.monthlyEMI)}</div>
            </div>
            <div class="card">
              <div class="card-title">Yearly Prepayment Target</div>
              <div class="card-val">${fmt(data.yearlyPrepayment)}</div>
            </div>
          </div>

          <h3>Dynamic 3-Year Repayment Schedule</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Opening Loan Balance</th>
                <th>EMI Paid (12M)</th>
                <th>Yearly Prepayment</th>
                <th>Interest Charged</th>
                <th>Principal Repaid</th>
                <th>Remaining Loan Balance</th>
              </tr>
            </thead>
            <tbody>
              ${data.yrSchedule.map(yr => `
                <tr>
                  <td>Year ${yr.year}</td>
                  <td>${fmt(yr.opening)}</td>
                  <td>${fmt(yr.annualEMI)}</td>
                  <td>${fmt(yr.yearlyPrepayment)}</td>
                  <td style="color:#c2410c; font-weight:700;">${fmt(yr.interest)}</td>
                  <td style="color:#15803d; font-weight:700;">${fmt(yr.principalRepaid)}</td>
                  <td><strong>${fmt(yr.closing)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-box">
            <strong style="color:#14532d; font-size:14px;">Final 3-Year Summary & Outcomes:</strong>
            <div class="summary-grid">
              <div class="sum-item">
                <div class="sum-lbl">Total Interest Paid</div>
                <div class="sum-val">${fmt(data.cumInterest)}</div>
              </div>
              <div class="sum-item">
                <div class="sum-lbl">Total Principal Repaid</div>
                <div class="sum-val">${fmt(data.cumPrincipalRepaid)}</div>
              </div>
              <div class="sum-item">
                <div class="sum-lbl">Remaining Balance</div>
                <div class="sum-val">${fmt(data.finalBalance)}</div>
              </div>
              <div class="sum-item">
                <div class="sum-lbl">Estimated Time Saved</div>
                <div class="sum-val">${data.estimatedYearsSaved} Years</div>
              </div>
              <div class="sum-item">
                <div class="sum-lbl">Estimated Interest Saved</div>
                <div class="sum-val">${fmt(data.totalInterestSaved)}</div>
              </div>
              <div class="sum-item">
                <div class="sum-lbl">Debt-Free Progress</div>
                <div class="sum-val">${data.progressPct}%</div>
              </div>
            </div>
          </div>

          <div class="footer">
            Freedom Plan™ Financial Analytics — Dynamically calculated based on user input.
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
      `);
      printWindow.document.close();
    }
  } catch (e) {
    console.warn('PDF Print window pop-up blocked by browser settings, file download used as fallback.', e);
  }
}

export function triggerOverviewReportDownload(storeState = {}) {
  const defaultLoan = 2300000;
  const defaultRate = 108.5;

  const loanAmount = Number(storeState.basicLoan) > 0 ? Number(storeState.basicLoan) : defaultLoan;
  const rate = Number(storeState.rate) > 0 ? Number(storeState.rate) : defaultRate;

  const customPlan = storeState.customPlan || {};
  const derived = storeState.derived || {};

  const monthlyIncome = customPlan.monthlyIncome || 1300;
  const rent = customPlan.rentMid || 300;
  const bills = customPlan.bills || 100;
  const travel = customPlan.travel || 100;
  const food = customPlan.food || 120;
  const extraExpenses = (customPlan.shopping || 0) + (customPlan.entertainment || 0) + (customPlan.health || 0) + (customPlan.education || 0) + (customPlan.insurance || 0) + (customPlan.misc || 0);
  const totalExpenses = rent + bills + travel + food + extraExpenses;
  const monthlySavingsTarget = customPlan.monthlySavingsTarget || derived.targetMonthlySavingsGBP || 650;
  const buffer = monthlyIncome - totalExpenses - monthlySavingsTarget;

  const fmtINR = (n) => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
  const fmtGBP = (n) => '£' + Math.abs(Math.round(n)).toLocaleString('en-GB');

  const reportDate = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const reportId = 'FP-OVR-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  // 1. Text File Download
  const textContent = `===================================================================
FREEDOM PLAN™ — OVERVIEW FINANCIAL & BUDGET REPORT
===================================================================
Prepared for: Your Account
Report Date: ${reportDate}
Reference ID: ${reportId}

-------------------------------------------------------------------
1. LOAN & OVERVIEW SNAPSHOT
-------------------------------------------------------------------
- Initial Loan Principal:       ${fmtINR(loanAmount)} (${fmtGBP(loanAmount / rate)})
- Exchange Rate Baseline:      £1 = ₹${rate.toFixed(2)}
- Accumulated Savings (All Time): ${fmtGBP(derived.savedAllTime || 0)}
- Progress Toward Freedom:      ${derived.progressPct || '0.0'}%

-------------------------------------------------------------------
2. UK MONTHLY BUDGET & CASH FLOW
-------------------------------------------------------------------
- Monthly Income:              ${fmtGBP(monthlyIncome)}
- Total Living Expenses:        ${fmtGBP(totalExpenses)}
  * Housing / Rent:             ${fmtGBP(rent)}
  * Bills & Utilities:         ${fmtGBP(bills)}
  * Travel & Transport:        ${fmtGBP(travel)}
  * Food & Groceries:          ${fmtGBP(food)}
  * Lifestyle & Extra:          ${fmtGBP(extraExpenses)}
- Monthly Savings Target:      ${fmtGBP(monthlySavingsTarget)}
- Available Buffer:            ${buffer >= 0 ? '+' : '-'}${fmtGBP(Math.abs(buffer))}

-------------------------------------------------------------------
3. REPAYMENT RECOMMENDATIONS & STRATEGY
-------------------------------------------------------------------
- Maintain your monthly target of ${fmtGBP(monthlySavingsTarget)} to stay on track.
- Transfer savings annually to execute lump-sum prepayments toward principal.
- ${buffer > 0 ? `Your ${fmtGBP(buffer)} buffer provides flexibility to allocate extra funds toward early debt freedom.` : `Your budget is tight. Monitor discretionary spending to safeguard your monthly savings goal.`}

===================================================================
Freedom Plan™ Financial Planner — https://freedom-plan.app/
===================================================================
`;

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `FreedomPlan_Overview_Report_${reportId}.txt`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 100);

  // 2. Formatted PDF Print Window
  try {
    const printWindow = window.open('', '_blank', 'width=950,height=950');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Freedom Plan Overview Report - ${reportId}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; padding: 40px; line-height: 1.5; background: #fff; }
            .header { border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
            h1 { color: #0369a1; font-size: 24px; margin: 0 0 4px 0; font-weight: 800; }
            .subtitle { color: #64748b; font-size: 13px; margin: 0; }
            .meta { text-align: right; font-size: 12px; color: #64748b; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
            .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .card-val { font-size: 18px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
            th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px 12px; }
            tr:nth-child(even) { background: #f8fafc; }
            .box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin-top: 24px; color: #1e40af; font-size: 13px; }
            .footer { margin-top: 36px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Freedom Plan™ — Overview Financial Report</h1>
              <p class="subtitle">UK Cash Flow, Living Expenses & Savings Strategy</p>
            </div>
            <div class="meta">
              <p><strong>Ref:</strong> ${reportId}</p>
              <p><strong>Date:</strong> ${reportDate}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Initial Loan Principal</div>
              <div class="card-val">${fmtINR(loanAmount)}</div>
            </div>
            <div class="card">
              <div class="card-title">Monthly Income (UK)</div>
              <div class="card-val">${fmtGBP(monthlyIncome)}</div>
            </div>
            <div class="card">
              <div class="card-title">Monthly Savings Target</div>
              <div class="card-val">${fmtGBP(monthlySavingsTarget)}</div>
            </div>
          </div>

          <h3>Monthly Cash Flow & Expenses Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Monthly Allocation</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Monthly Income</td><td><strong>${fmtGBP(monthlyIncome)}</strong></td><td>Income Baseline</td></tr>
              <tr><td>Housing / Rent</td><td>${fmtGBP(rent)}</td><td>Fixed Expense</td></tr>
              <tr><td>Bills & Utilities</td><td>${fmtGBP(bills)}</td><td>Fixed Expense</td></tr>
              <tr><td>Travel & Transport</td><td>${fmtGBP(travel)}</td><td>Living Expense</td></tr>
              <tr><td>Food & Groceries</td><td>${fmtGBP(food)}</td><td>Essential Expense</td></tr>
              <tr><td>Lifestyle & Extra Expenses</td><td>${fmtGBP(extraExpenses)}</td><td>Discretionary</td></tr>
              <tr><td>Total Monthly Outgoings</td><td><strong>${fmtGBP(totalExpenses)}</strong></td><td>Living Cost</td></tr>
              <tr><td>Monthly Savings Target</td><td><strong style="color:#0284c7">${fmtGBP(monthlySavingsTarget)}</strong></td><td>Target Savings</td></tr>
              <tr><td>Available Monthly Buffer</td><td><strong style="color:${buffer >= 0 ? '#15803d' : '#b91c1c'}">${buffer >= 0 ? '+' : '-'}${fmtGBP(Math.abs(buffer))}</strong></td><td>${buffer >= 0 ? 'Surplus' : 'Deficit'}</td></tr>
            </tbody>
          </table>

          <div class="box">
            <strong>Financial Recommendations:</strong>
            <p style="margin-top:6px; margin-bottom:0;">
              ${buffer >= 0 ? `Your UK monthly budget is in good health with a positive ${fmtGBP(buffer)} buffer. Continue transferring savings annually to execute lump-sum prepayments toward principal.` : `Your budget is currently running a deficit. Consider reviewing discretionary expenses to safeguard your ${fmtGBP(monthlySavingsTarget)} monthly repayment target.`}
            </p>
          </div>

          <div class="footer">
            Freedom Plan™ Financial Overview — Generated dynamically based on user input.
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
      `);
      printWindow.document.close();
    }
  } catch (e) {
    console.warn('PDF Print window pop-up blocked by browser settings, file download used as fallback.', e);
  }
}
