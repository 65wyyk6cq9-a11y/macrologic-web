const state = {
  unitSystem: 'metric',
  lastResult: null,
};

const unitButtons = document.querySelectorAll('.segmented-btn');
const metricFields = document.getElementById('metricFields');
const imperialFields = document.getElementById('imperialFields');
const form = document.getElementById('macroForm');
const resetBtn = document.getElementById('resetBtn');
const infoBtn = document.getElementById('infoBtn');
const infoModal = document.getElementById('infoModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const emptyState = document.getElementById('emptyState');
const resultsContent = document.getElementById('resultsContent');
const statusBadge = document.getElementById('statusBadge');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const choiceCards = document.querySelectorAll('.choice-card');
const cutIntensityWrap = document.getElementById('cutIntensityWrap');

const goalTip = {
  lose: 'Use the recommended cut target as your starting point, then review weekly bodyweight trend, training performance, appetite, and recovery before adjusting.',
  maintain: 'Use this target as a maintenance baseline and monitor weekly scale trends to confirm it matches your real-world output.',
  gain: 'Aim for steady performance, recovery, and gradual bodyweight increases rather than forcing the highest possible surplus.',
};

const trainingMap = {
  '0': { label: 'No structured training', mult: 1.00 },
  '1': { label: 'Light training — 1 to 2 days/week', mult: 1.08 },
  '2': { label: 'Moderate training — 3 to 4 days/week', mult: 1.15 },
  '3': { label: 'Heavy training — 6 to 7 days/week', mult: 1.22 },
  '4': { label: 'Athlete — twice daily / very high volume', mult: 1.30 },
};

const lifestyleMap = {
  '0': { label: 'Desk / mostly sitting', mult: 1.08 },
  '1': { label: 'Mixed movement', mult: 1.16 },
  '2': { label: 'Active job', mult: 1.24 },
  '3': { label: 'Highly physical work', mult: 1.32 },
};

const stepsMap = {
  '0': { label: 'Under 4,000', mult: 0.97 },
  '1': { label: '4,000 – 7,000', mult: 1.00 },
  '2': { label: '7,000 – 10,000', mult: 1.04 },
  '3': { label: '10,000 – 14,000', mult: 1.08 },
  '4': { label: '14,000+', mult: 1.12 },
};

const cutMap = {
  conservative: { label: 'Conservative cut', mult: 0.90 },
  moderate: { label: 'Moderate cut', mult: 0.83 },
  aggressive: { label: 'Aggressive cut', mult: 0.76 },
};

const goalLabels = {
  lose: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain: 'Gain Muscle',
};

unitButtons.forEach((btn) => {
  btn.addEventListener('click', () => setUnitSystem(btn.dataset.unit));
});

choiceCards.forEach((card) => {
  card.addEventListener('click', () => {
    choiceCards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
    toggleCutIntensity();
  });
});

function setUnitSystem(unit) {
  state.unitSystem = unit;
  unitButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.unit === unit));

  const metricActive = unit === 'metric';
  metricFields.classList.toggle('hidden', !metricActive);
  imperialFields.classList.toggle('hidden', metricActive);

  document.getElementById('heightCm').required = metricActive;
  document.getElementById('weightKg').required = metricActive;
  document.getElementById('heightFt').required = !metricActive;
  document.getElementById('heightIn').required = !metricActive;
  document.getElementById('weightLb').required = !metricActive;
}

function toggleCutIntensity() {
  const goal = form.querySelector('input[name="goal"]:checked').value;
  cutIntensityWrap.classList.toggle('hidden', goal !== 'lose');
}

function kgFromLb(lb) {
  return lb * 0.45359237;
}

function cmFromFeetInches(feet, inches) {
  return ((feet * 12) + inches) * 2.54;
}

function round(value) {
  return Math.round(value);
}

function getFormData() {
  const sex = document.getElementById('sex').value;
  const age = parseInt(document.getElementById('age').value, 10);
  const goal = form.querySelector('input[name="goal"]:checked').value;
  const trainingFrequency = document.getElementById('trainingFrequency').value;
  const lifestyleActivity = document.getElementById('lifestyleActivity').value;
  const dailySteps = document.getElementById('dailySteps').value;
  const cutIntensity = document.getElementById('cutIntensity').value;

  let heightCm;
  let weightKg;

  if (state.unitSystem === 'metric') {
    heightCm = parseFloat(document.getElementById('heightCm').value);
    weightKg = parseFloat(document.getElementById('weightKg').value);
  } else {
    const feet = parseFloat(document.getElementById('heightFt').value);
    const inches = parseFloat(document.getElementById('heightIn').value);
    const pounds = parseFloat(document.getElementById('weightLb').value);

    heightCm = cmFromFeetInches(feet, inches);
    weightKg = kgFromLb(pounds);
  }

  return { sex, age, goal, trainingFrequency, lifestyleActivity, dailySteps, cutIntensity, heightCm, weightKg };
}

function validateData(data) {
  if (!Number.isFinite(data.age) || data.age < 15 || data.age > 100) {
    return 'Enter a valid age between 15 and 100.';
  }
  if (!Number.isFinite(data.heightCm) || data.heightCm < 100 || data.heightCm > 260) {
    return 'Enter a valid height.';
  }
  if (!Number.isFinite(data.weightKg) || data.weightKg < 35 || data.weightKg > 300) {
    return 'Enter a valid weight.';
  }
  return null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function calculateMacros(data) {
  const bmr = data.sex === 'male'
    ? (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.age) + 5
    : (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.age) - 161;

  const trainingMult = trainingMap[data.trainingFrequency].mult;
  const lifestyleMult = lifestyleMap[data.lifestyleActivity].mult;
  const stepsMult = stepsMap[data.dailySteps].mult;

  const maintenance = bmr * trainingMult * lifestyleMult * stepsMult;

  let targetCalories = maintenance;
  let secondaryMetricLabel = 'Maintenance';
  let secondaryMetricValue = `${round(maintenance).toLocaleString()} kcal`;
  let rangeSummary = 'Based on your selected goal.';

  if (data.goal === 'lose') {
    const selectedCut = maintenance * cutMap[data.cutIntensity].mult;
    const conservative = maintenance * cutMap.conservative.mult;
    const moderate = maintenance * cutMap.moderate.mult;
    const aggressive = maintenance * cutMap.aggressive.mult;
    targetCalories = selectedCut;
    secondaryMetricLabel = 'Maintenance';
    secondaryMetricValue = `${round(maintenance).toLocaleString()} kcal`;
    rangeSummary = `Cut options: ${round(conservative).toLocaleString()} / ${round(moderate).toLocaleString()} / ${round(aggressive).toLocaleString()} kcal`;
  } else if (data.goal === 'gain') {
    targetCalories = maintenance + Math.min(350, maintenance * 0.10);
    secondaryMetricLabel = 'Maintenance';
    secondaryMetricValue = `${round(maintenance).toLocaleString()} kcal`;
    rangeSummary = 'Lean surplus target based on estimated maintenance.';
  }

  let proteinPerKg = 1.9;
  let fatPerKg = 0.8;

  if (data.goal === 'lose') {
    proteinPerKg = data.cutIntensity === 'aggressive' ? 2.3 : data.cutIntensity === 'moderate' ? 2.2 : 2.0;
    fatPerKg = data.cutIntensity === 'aggressive' ? 0.65 : data.cutIntensity === 'moderate' ? 0.7 : 0.8;
  } else if (data.goal === 'gain') {
    proteinPerKg = 1.9;
    fatPerKg = 0.85;
  } else {
    proteinPerKg = 1.95;
    fatPerKg = 0.8;
  }

  let proteinGrams = data.weightKg * proteinPerKg;
  let fatGrams = data.weightKg * fatPerKg;
  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  let carbCalories = targetCalories - proteinCalories - fatCalories;

  if (carbCalories < 0) {
    fatGrams = Math.max(0.55 * data.weightKg, (targetCalories - proteinCalories) / 9);
    carbCalories = targetCalories - proteinCalories - (fatGrams * 9);
  }

  const carbGrams = Math.max(0, carbCalories / 4);

  const protein = round(proteinGrams);
  const fats = round(fatGrams);
  const carbs = round(carbGrams);
  const calories = (protein * 4) + (fats * 9) + (carbs * 4);

  const proteinPct = clamp(round((protein * 4 / calories) * 100), 0, 100);
  const carbPct = clamp(round((carbs * 4 / calories) * 100), 0, 100);
  const fatPct = clamp(round((fats * 9 / calories) * 100), 0, 100);

  return {
    calories,
    maintenance: round(maintenance),
    bmr: round(bmr),
    protein,
    carbs,
    fats,
    proteinPct,
    carbPct,
    fatPct,
    secondaryMetricLabel,
    secondaryMetricValue,
    rangeSummary,
  };
}

function updateResults(result, data) {
  emptyState.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  statusBadge.textContent = 'Calculated';

  document.getElementById('caloriesValue').textContent = result.calories.toLocaleString();
  document.getElementById('proteinValue').textContent = `${result.protein}g`;
  document.getElementById('carbsValue').textContent = `${result.carbs}g`;
  document.getElementById('fatsValue').textContent = `${result.fats}g`;
  document.getElementById('secondaryMetricLabel').textContent = result.secondaryMetricLabel;
  document.getElementById('secondaryMetricValue').textContent = result.secondaryMetricValue;
  document.getElementById('rangeSummary').textContent = result.rangeSummary;

  let goalSummary = 'Recommended starting calories';
  if (data.goal === 'lose') {
    goalSummary = `${cutMap[data.cutIntensity].label} target for fat loss`;
  } else if (data.goal === 'maintain') {
    goalSummary = 'Estimated maintenance calories';
  } else if (data.goal === 'gain') {
    goalSummary = 'Lean gain calorie target';
  }
  document.getElementById('goalSummary').textContent = goalSummary;

  document.getElementById('proteinBar').style.width = `${result.proteinPct}%`;
  document.getElementById('carbsBar').style.width = `${result.carbPct}%`;
  document.getElementById('fatsBar').style.width = `${result.fatPct}%`;

  const profileUnitLabel = `${round(data.weightKg)}kg • ${round(data.heightCm)}cm • ${data.age}y`;
  document.getElementById('profileSummary').textContent = profileUnitLabel;
  document.getElementById('activitySummary').textContent = `${trainingMap[data.trainingFrequency].label} • ${lifestyleMap[data.lifestyleActivity].label} • ${stepsMap[data.dailySteps].label} steps`;
  document.getElementById('splitSummary').textContent = `${result.proteinPct}% P • ${result.carbPct}% C • ${result.fatPct}% F`;
  document.getElementById('tipText').textContent = `${goalTip[data.goal]} Estimated BMR: ${result.bmr.toLocaleString()} kcal.`;

  state.lastResult = { ...result, ...data };
}

function openModal() {
  infoModal.classList.remove('hidden');
  infoModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  infoModal.classList.add('hidden');
  infoModal.setAttribute('aria-hidden', 'true');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = getFormData();
  const validationError = validateData(data);

  if (validationError) {
    statusBadge.textContent = 'Check inputs';
    alert(validationError);
    return;
  }

  const result = calculateMacros(data);
  updateResults(result, data);
});

resetBtn.addEventListener('click', () => {
  form.reset();
  setUnitSystem('metric');
  choiceCards.forEach((c) => c.classList.remove('active'));
  choiceCards[0].classList.add('active');
  document.querySelector('input[name="goal"][value="lose"]').checked = true;
  document.getElementById('trainingFrequency').value = '3';
  document.getElementById('lifestyleActivity').value = '1';
  document.getElementById('dailySteps').value = '2';
  document.getElementById('cutIntensity').value = 'moderate';
  toggleCutIntensity();
  statusBadge.textContent = 'Ready';
  resultsContent.classList.add('hidden');
  emptyState.classList.remove('hidden');
  state.lastResult = null;
});

infoBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
infoModal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'modal') closeModal();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal();
});

function buildPdfHtml(result) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>MacroLogic Report</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; background: #eef4fb; color: #102845; }
      .page { max-width: 900px; margin: 0 auto; padding: 36px; }
      .card { background: white; border-radius: 24px; padding: 30px; box-shadow: 0 20px 40px rgba(15,39,71,0.08); }
      .header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 26px; }
      .brand { display:flex; gap:14px; align-items:center; }
      .mark { width:52px; height:52px; border-radius:16px; background:#0f2747; padding:10px; display:grid; grid-template-columns:repeat(3,1fr); gap:4px; }
      .mark span { align-self:end; border-radius:99px; background: linear-gradient(180deg, #1e7bff, #56a2ff); }
      .mark span:nth-child(1){height:46%;}
      .mark span:nth-child(2){height:72%;}
      .mark span:nth-child(3){height:100%; background: linear-gradient(180deg, #ffffff, #81c2ff);}      
      h1,h2,h3,p { margin: 0; }
      .muted { color:#6280a5; }
      .hero { background: linear-gradient(135deg, #0f2747, #173761); color:white; border-radius:22px; padding:24px; display:flex; justify-content:space-between; gap:16px; margin-bottom:20px; }
      .hero h2 { font-size: 48px; line-height: 1; margin: 8px 0 6px; }
      .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:20px; }
      .tile { background:#f4f8fd; border-radius:18px; padding:18px; }
      .tile h3 { font-size: 14px; color:#5f7997; margin-bottom:8px; text-transform:uppercase; letter-spacing:.12em; }
      .tile strong { font-size: 28px; color:#102845; }
      .bars { margin-top:22px; display:grid; gap:14px; }
      .row { background:#f8fbff; border-radius:18px; padding:16px; }
      .row-head { display:flex; justify-content:space-between; margin-bottom:10px; }
      .track { height:12px; border-radius:999px; background:#dce8f5; overflow:hidden; }
      .fill { height:100%; border-radius:999px; }
      .protein { background: linear-gradient(90deg, #1e7bff, #56a2ff); width:${result.proteinPct}%; }
      .carbs { background: linear-gradient(90deg, #6ab7ff, #bde2ff); width:${result.carbPct}%; }
      .fats { background: linear-gradient(90deg, #6b7e9b, #a6b7ce); width:${result.fatPct}%; }
      .tips { margin-top:22px; background:#eff6ff; border-radius:18px; padding:18px; }
      .footer { margin-top:22px; color:#6a86a5; font-size:14px; display:flex; justify-content:space-between; gap:12px; }
      .meta { display:grid; gap:8px; margin-top:18px; color:#58738f; }
      @media print { .page { padding: 0; } body { background: white; } .card { box-shadow: none; } }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="card">
        <div class="header">
          <div class="brand">
            <div class="mark"><span></span><span></span><span></span></div>
            <div>
              <h1>MacroLogic</h1>
              <p class="muted">Precision Nutrition</p>
            </div>
          </div>
          <div class="muted">Generated ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="hero">
          <div>
            <p style="text-transform:uppercase; letter-spacing:.14em; font-size:12px; opacity:.8;">Daily Calories</p>
            <h2>${result.calories.toLocaleString()}</h2>
            <p style="opacity:.86;">${goalLabels[result.goal]}</p>
          </div>
          <div style="text-align:right; align-self:end;">
            <p style="text-transform:uppercase; letter-spacing:.14em; font-size:12px; opacity:.8;">Maintenance</p>
            <h3 style="font-size:28px; margin-top:8px;">${result.maintenance.toLocaleString()} kcal</h3>
          </div>
        </div>

        <div class="grid">
          <div class="tile"><h3>Protein</h3><strong>${result.protein}g</strong></div>
          <div class="tile"><h3>Carbs</h3><strong>${result.carbs}g</strong></div>
          <div class="tile"><h3>Fats</h3><strong>${result.fats}g</strong></div>
        </div>

        <div class="meta">
          <div><strong>Profile:</strong> ${Math.round(result.weightKg)}kg • ${Math.round(result.heightCm)}cm • ${result.age} years</div>
          <div><strong>Training:</strong> ${trainingMap[result.trainingFrequency].label}</div>
          <div><strong>Lifestyle:</strong> ${lifestyleMap[result.lifestyleActivity].label}</div>
          <div><strong>Daily Steps:</strong> ${stepsMap[result.dailySteps].label}</div>
          ${result.goal === 'lose' ? `<div><strong>Cut Intensity:</strong> ${cutMap[result.cutIntensity].label}</div>` : ''}
        </div>

        <div class="bars">
          <div class="row"><div class="row-head"><span>Protein</span><strong>${result.proteinPct}%</strong></div><div class="track"><div class="fill protein"></div></div></div>
          <div class="row"><div class="row-head"><span>Carbs</span><strong>${result.carbPct}%</strong></div><div class="track"><div class="fill carbs"></div></div></div>
          <div class="row"><div class="row-head"><span>Fats</span><strong>${result.fatPct}%</strong></div><div class="track"><div class="fill fats"></div></div></div>
        </div>

        <div class="tips">
          <p style="text-transform:uppercase; letter-spacing:.14em; font-size:12px; color:#3971ae; margin-bottom:10px;">Guidance</p>
          <p class="muted" style="line-height:1.7;">${goalTip[result.goal]} Estimated BMR: ${result.bmr.toLocaleString()} kcal. Maintenance estimate: ${result.maintenance.toLocaleString()} kcal.</p>
        </div>

        <div class="footer">
          <span>${result.rangeSummary}</span>
          <span>Generated by MacroLogic</span>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

downloadPdfBtn.addEventListener('click', () => {
  if (!state.lastResult) return;
  const pdfWindow = window.open('', '_blank');
  if (!pdfWindow) {
    alert('Please allow pop-ups to generate the PDF view.');
    return;
  }
  pdfWindow.document.open();
  pdfWindow.document.write(buildPdfHtml(state.lastResult));
  pdfWindow.document.close();
  pdfWindow.focus();
  setTimeout(() => pdfWindow.print(), 400);
});

setUnitSystem('metric');
toggleCutIntensity();
