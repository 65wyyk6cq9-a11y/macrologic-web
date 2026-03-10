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

const goalText = {
  lose: 'To support fat loss',
  maintain: 'To maintain weight',
  gain: 'To support muscle gain',
};

const goalTip = {
  lose: 'Aim to keep protein high, monitor weekly scale trends, and adjust calories if progress stalls for multiple weeks.',
  maintain: 'Use this target as a baseline and adjust slightly if weight trends up or down over time.',
  gain: 'Prioritize consistent protein intake, progressive training, and monitor bodyweight changes weekly.',
};

unitButtons.forEach((btn) => {
  btn.addEventListener('click', () => setUnitSystem(btn.dataset.unit));
});

choiceCards.forEach((card) => {
  card.addEventListener('click', () => {
    choiceCards.forEach((c) => c.classList.remove('active'));
    card.classList.add('active');
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
  const activityFactor = parseFloat(document.getElementById('activity').value);
  const goal = form.querySelector('input[name="goal"]:checked').value;

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

  return { sex, age, activityFactor, goal, heightCm, weightKg };
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

function calculateMacros(data) {
  const bmr = data.sex === 'male'
    ? (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.age) + 5
    : (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.age) - 161;

  const tdee = bmr * data.activityFactor;

  const calorieAdjustments = {
    lose: -450,
    maintain: 0,
    gain: 300,
  };

  const calories = Math.max(1200, tdee + calorieAdjustments[data.goal]);

  let proteinGrams;
  let fatGrams;

  if (data.goal === 'lose') {
    proteinGrams = data.weightKg * 2.2;
    fatGrams = data.weightKg * 0.8;
  } else if (data.goal === 'gain') {
    proteinGrams = data.weightKg * 2.0;
    fatGrams = data.weightKg * 0.9;
  } else {
    proteinGrams = data.weightKg * 1.9;
    fatGrams = data.weightKg * 0.85;
  }

  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories);
  const carbGrams = carbCalories / 4;

  const finalCalories = (round(proteinGrams) * 4) + (round(fatGrams) * 9) + (round(carbGrams) * 4);

  return {
    calories: round(finalCalories),
    bmr: round(bmr),
    protein: round(proteinGrams),
    carbs: round(carbGrams),
    fats: round(fatGrams),
  };
}

function updateResults(result, data) {
  emptyState.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  statusBadge.textContent = 'Calculated';

  document.getElementById('caloriesValue').textContent = result.calories.toLocaleString();
  document.getElementById('bmrValue').textContent = `${result.bmr} kcal`;
  document.getElementById('goalSummary').textContent = goalText[data.goal];
  document.getElementById('proteinValue').textContent = `${result.protein}g`;
  document.getElementById('carbsValue').textContent = `${result.carbs}g`;
  document.getElementById('fatsValue').textContent = `${result.fats}g`;

  const totalMacroGrams = result.protein + result.carbs + result.fats;
  document.getElementById('proteinBar').style.width = `${(result.protein / totalMacroGrams) * 100}%`;
  document.getElementById('carbsBar').style.width = `${(result.carbs / totalMacroGrams) * 100}%`;
  document.getElementById('fatsBar').style.width = `${(result.fats / totalMacroGrams) * 100}%`;

  document.getElementById('profileSummary').textContent = `${round(data.weightKg)}kg • ${round(data.heightCm)}cm • ${data.age}y`;
  document.getElementById('activitySummary').textContent = document.getElementById('activity').selectedOptions[0].textContent;

  const proteinPct = round((result.protein * 4 / result.calories) * 100);
  const carbPct = round((result.carbs * 4 / result.calories) * 100);
  const fatPct = round((result.fats * 9 / result.calories) * 100);
  document.getElementById('splitSummary').textContent = `${proteinPct}% P • ${carbPct}% C • ${fatPct}% F`;
  document.getElementById('tipText').textContent = goalTip[data.goal];

  state.lastResult = { ...result, ...data, proteinPct, carbPct, fatPct };
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
  document.getElementById('activity').value = '1.55';
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
  const goalLabels = {
    lose: 'Lose Weight',
    maintain: 'Maintain Weight',
    gain: 'Gain Muscle',
  };

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
            <p style="text-transform:uppercase; letter-spacing:.14em; font-size:12px; opacity:.8;">Estimated BMR</p>
            <h3 style="font-size:28px; margin-top:8px;">${result.bmr} kcal</h3>
          </div>
        </div>

        <div class="grid">
          <div class="tile"><h3>Protein</h3><strong>${result.protein}g</strong></div>
          <div class="tile"><h3>Carbs</h3><strong>${result.carbs}g</strong></div>
          <div class="tile"><h3>Fats</h3><strong>${result.fats}g</strong></div>
        </div>

        <div class="bars">
          <div class="row"><div class="row-head"><span>Protein</span><strong>${result.proteinPct}%</strong></div><div class="track"><div class="fill protein"></div></div></div>
          <div class="row"><div class="row-head"><span>Carbs</span><strong>${result.carbPct}%</strong></div><div class="track"><div class="fill carbs"></div></div></div>
          <div class="row"><div class="row-head"><span>Fats</span><strong>${result.fatPct}%</strong></div><div class="track"><div class="fill fats"></div></div></div>
        </div>

        <div class="tips">
          <p style="text-transform:uppercase; letter-spacing:.14em; font-size:12px; color:#3971ae; margin-bottom:10px;">Guidance</p>
          <p class="muted" style="line-height:1.7;">This report provides estimated calorie and macro targets based on your inputs. Use it as a starting point, then review your bodyweight trend, training performance, appetite, and recovery over time before making changes.</p>
        </div>

        <div class="footer">
          <span>Profile: ${Math.round(result.weightKg)}kg • ${Math.round(result.heightCm)}cm • ${result.age} years</span>
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
