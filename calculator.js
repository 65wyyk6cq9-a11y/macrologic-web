const state = {
  unitSystem: 'metric',
  lastResult: null,
};

const SESSION_FORM_KEY = 'macrologic_form_state_v1';
const SESSION_RESULT_KEY = 'macrologic_result_state_v1';

window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));
});

function animateNumber(element, endValue, suffix = '', duration = 900) {
  const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (mediaReduced) {
    element.textContent = `${Math.round(endValue).toLocaleString()}${suffix}`;
    return;
  }

  const startValue = Number(String(element.textContent).replace(/[^\d.-]/g, '')) || 0;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = startValue + ((endValue - startValue) * eased);
    element.textContent = `${Math.round(current).toLocaleString()}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function animateMacroBar(element, pct) {
  element.style.width = '0%';
  requestAnimationFrame(() => {
    element.style.width = `${pct}%`;
  });
}

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
const openInAppBtn = document.getElementById('openInAppBtn');
const appImportNote = document.getElementById('appImportNote');
const choiceCards = document.querySelectorAll('.choice-card');
const cutIntensityWrap = document.getElementById('cutIntensityWrap');

const goalTip = {
  lose: 'Use the recommended cut target as your starting point, then review weekly bodyweight trend, training performance, appetite, and recovery before adjusting.',
  maintain: 'Use this target as a maintenance baseline and monitor weekly scale trends to confirm it matches your real-world output.',
  gain: 'Aim for steady performance, recovery, and gradual bodyweight increases rather than forcing the highest possible surplus.',
};

const trainingMap = {
  '0': { label: 'No structured training', mult: 1.00 },
  '1': { label: 'Train 1 day/week', mult: 1.04 },
  '2': { label: 'Train 2 days/week', mult: 1.08 },
  '3': { label: 'Train 3 days/week', mult: 1.12 },
  '4': { label: 'Train 4 days/week', mult: 1.16 },
  '5': { label: 'Train 5 days/week', mult: 1.20 },
  '6': { label: 'Train 6 days/week', mult: 1.24 },
  '7': { label: 'Train 7 days/week', mult: 1.28 },
  '8': { label: 'Athlete — twice daily / very high volume', mult: 1.34 },
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

  const proteinGrams = data.weightKg * proteinPerKg;
  let fatGrams = data.weightKg * fatPerKg;
  const proteinCalories = proteinGrams * 4;
  let carbCalories = targetCalories - proteinCalories - (fatGrams * 9);

  if (carbCalories < 0) {
    fatGrams = Math.max(0.55 * data.weightKg, (targetCalories - proteinCalories) / 9);
    carbCalories = targetCalories - proteinCalories - (fatGrams * 9);
  }

  const carbGrams = Math.max(0, carbCalories / 4);

  const protein = round(proteinGrams);
  const fats = round(fatGrams);
  const carbs = round(carbGrams);
  const calories = (protein * 4) + (fats * 9) + (carbs * 4);

  const proteinPct = calories > 0 ? clamp(round((protein * 4 / calories) * 100), 0, 100) : 0;
  const carbPct = calories > 0 ? clamp(round((carbs * 4 / calories) * 100), 0, 100) : 0;
  const fatPct = calories > 0 ? clamp(round((fats * 9 / calories) * 100), 0, 100) : 0;

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

function isFromMacroLoggerApp() {
  const params = new URLSearchParams(window.location.search);
  const fromApp = params.get('fromApp');
  const source = params.get('source');
  return fromApp === '1' || fromApp === 'true' || source === 'macrologger';
}

function setAppImportVisibility() {
  const visible = isFromMacroLoggerApp();

  if (openInAppBtn) {
    openInAppBtn.classList.toggle('hidden', !visible);
  }

  if (appImportNote) {
    appImportNote.classList.toggle('hidden', !visible);
  }
}

function getCurrentFormSnapshot() {
  return {
    unitSystem: state.unitSystem,
    sex: document.getElementById('sex').value,
    age: document.getElementById('age').value,
    heightCm: document.getElementById('heightCm').value,
    weightKg: document.getElementById('weightKg').value,
    heightFt: document.getElementById('heightFt').value,
    heightIn: document.getElementById('heightIn').value,
    weightLb: document.getElementById('weightLb').value,
    goal: form.querySelector('input[name="goal"]:checked')?.value || 'lose',
    trainingFrequency: document.getElementById('trainingFrequency').value,
    lifestyleActivity: document.getElementById('lifestyleActivity').value,
    dailySteps: document.getElementById('dailySteps').value,
    cutIntensity: document.getElementById('cutIntensity').value,
  };
}

function saveFormSession() {
  try {
    sessionStorage.setItem(SESSION_FORM_KEY, JSON.stringify(getCurrentFormSnapshot()));
  } catch (_) {
  }
}

function saveResultSession(result, data) {
  try {
    sessionStorage.setItem(SESSION_RESULT_KEY, JSON.stringify({ result, data }));
  } catch (_) {
  }
}

function clearCalculatorSession() {
  try {
    sessionStorage.removeItem(SESSION_FORM_KEY);
    sessionStorage.removeItem(SESSION_RESULT_KEY);
  } catch (_) {
  }
}

function applyFormSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;

  const unitSystem = snapshot.unitSystem === 'imperial' ? 'imperial' : 'metric';
  setUnitSystem(unitSystem);

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = String(value);
  };

  setValue('sex', snapshot.sex);
  setValue('age', snapshot.age);
  setValue('heightCm', snapshot.heightCm);
  setValue('weightKg', snapshot.weightKg);
  setValue('heightFt', snapshot.heightFt);
  setValue('heightIn', snapshot.heightIn);
  setValue('weightLb', snapshot.weightLb);
  setValue('trainingFrequency', snapshot.trainingFrequency);
  setValue('lifestyleActivity', snapshot.lifestyleActivity);
  setValue('dailySteps', snapshot.dailySteps);
  setValue('cutIntensity', snapshot.cutIntensity);

  const goal = snapshot.goal || 'lose';
  const radio = form.querySelector(`input[name="goal"][value="${goal}"]`);
  if (radio) radio.checked = true;
  choiceCards.forEach((card) => {
    const input = card.querySelector('input[name="goal"]');
    card.classList.toggle('active', Boolean(input && input.value === goal));
  });

  toggleCutIntensity();
}

function restoreCalculatorSession() {
  let savedForm = null;
  let savedResultState = null;

  try {
    const rawForm = sessionStorage.getItem(SESSION_FORM_KEY);
    if (rawForm) savedForm = JSON.parse(rawForm);
  } catch (_) {
  }

  try {
    const rawResult = sessionStorage.getItem(SESSION_RESULT_KEY);
    if (rawResult) savedResultState = JSON.parse(rawResult);
  } catch (_) {
  }

  if (savedForm) {
    applyFormSnapshot(savedForm);
  }

  if (savedResultState && savedResultState.result && savedResultState.data) {
    try {
      updateResults(savedResultState.result, savedResultState.data);
      statusBadge.textContent = 'Calculated';
    } catch (_) {
      clearCalculatorSession();
    }
  }
}

function setAppImportState(enabled) {
  if (!openInAppBtn) return;

  openInAppBtn.disabled = !enabled;
  openInAppBtn.setAttribute('aria-disabled', String(!enabled));

  if (enabled) {
    openInAppBtn.classList.remove('is-disabled');
  } else {
    openInAppBtn.classList.add('is-disabled');
  }

  if (appImportNote) {
    appImportNote.textContent = enabled
      ? 'Save these calculated targets for the MacroLogger app.'
      : 'Calculate your targets first, then save them for the MacroLogger app.';
  }
}

function buildMacroLoggerDeepLink(result) {
  if (!result) return null;

  const requiredValues = [result.calories, result.protein, result.carbs, result.fats];
  const hasRequiredValues = requiredValues.every((value) => Number.isFinite(Number(value)));

  if (!hasRequiredValues) return null;

  const params = new URLSearchParams({
    calories: String(result.calories),
    protein: String(result.protein),
    carbs: String(result.carbs),
    fats: String(result.fats),
    source: 'macrologic-web',
  });

  if (result.goal) params.set('goal', String(result.goal));
  if (Number.isFinite(Number(result.maintenance))) params.set('maintenance', String(result.maintenance));
  if (Number.isFinite(Number(result.bmr))) params.set('bmr', String(result.bmr));

  return `macrologger://import-targets?${params.toString()}`;
}

function buildMacroLogicClipboardText(result) {
  if (!result) return '';

  const calories = Number(result.calories);
  const protein = Number(result.protein);
  const carbs = Number(result.carbs);
  const fats = Number(result.fats);

  // Strict whole-number payload only.
  const allWhole = [calories, protein, carbs, fats].every((v) => Number.isFinite(v) && Number.isInteger(v));
  if (!allWhole) return '';

  return [
    `Calories: ${calories}`,
    `Protein: ${protein}g`,
    `Carbs: ${carbs}g`,
    `Fat: ${fats}g`,
  ].join('\n');
}

async function copyTargetsFallback(result) {
  const text = buildMacroLogicClipboardText(result);
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (_) {
    return false;
  }
}

function openClipboardModal() {
  const clipboardModal = document.getElementById('clipboardModal');
  if (!clipboardModal) return;
  clipboardModal.classList.remove('hidden');
  clipboardModal.setAttribute('aria-hidden', 'false');
}

function closeClipboardModal() {
  const clipboardModal = document.getElementById('clipboardModal');
  if (!clipboardModal) return;
  clipboardModal.classList.add('hidden');
  clipboardModal.setAttribute('aria-hidden', 'true');
}

async function copyTargetsToClipboard(result) {
  const text = buildMacroLogicClipboardText(result);
  if (!text) return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {
    // Fall through to legacy copy method.
  }

  return copyTargetsFallback(result);
}

async function openMacroLoggerImport(result) {
  const clipboardText = buildMacroLogicClipboardText(result);
  if (!clipboardText) {
    if (appImportNote) {
      appImportNote.textContent = "Calculate your targets first before saving them for MacroLogger.";
    }
    return;
  }

  const clipboardCopied = await copyTargetsToClipboard(result);

  if (appImportNote) {
    appImportNote.textContent = clipboardCopied
      ? 'Targets saved for MacroLogger. Return to the app to import them.'
      : "Couldn’t save targets automatically. Please copy them manually.";
  }

  if (clipboardCopied) {
    openClipboardModal();
  }
}

function updateResults(result, data) {
  emptyState.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  statusBadge.textContent = 'Calculated';

  animateNumber(document.getElementById('caloriesValue'), result.calories);
  animateNumber(document.getElementById('proteinValue'), result.protein, 'g', 820);
  animateNumber(document.getElementById('carbsValue'), result.carbs, 'g', 920);
  animateNumber(document.getElementById('fatsValue'), result.fats, 'g', 980);
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

  animateMacroBar(document.getElementById('proteinBar'), result.proteinPct);
  animateMacroBar(document.getElementById('carbsBar'), result.carbPct);
  animateMacroBar(document.getElementById('fatsBar'), result.fatPct);

  const profileUnitLabel = `${round(data.weightKg)}kg • ${round(data.heightCm)}cm • ${data.age}y`;
  document.getElementById('profileSummary').textContent = profileUnitLabel;
  document.getElementById('activitySummary').textContent = `${trainingMap[data.trainingFrequency].label} • ${lifestyleMap[data.lifestyleActivity].label} • ${stepsMap[data.dailySteps].label} steps`;
  document.getElementById('splitSummary').textContent = `${result.proteinPct}% P • ${result.carbPct}% C • ${result.fatPct}% F`;
  document.getElementById('tipText').textContent = `${goalTip[data.goal]} Estimated BMR: ${result.bmr.toLocaleString()} kcal.`;

  const resultsCard = document.querySelector('.results-card');
  resultsCard.classList.remove('flash');
  void resultsCard.offsetWidth;
  resultsCard.classList.add('flash');

  state.lastResult = { ...result, ...data };
  saveResultSession(result, data);

  // Enable button only when we can build a strict clipboard payload.
  const clipboardText = buildMacroLogicClipboardText(result);
  setAppImportState(Boolean(clipboardText));
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
  setAppImportState(false);
  clearCalculatorSession();
});


form.addEventListener('input', () => {
  saveFormSession();
});

form.addEventListener('change', () => {
  saveFormSession();
});

infoBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
infoModal.addEventListener('click', (event) => {
  if (event.target.dataset.close === 'modal') closeModal();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
    closeClipboardModal();
  }
});

const clipboardModal = document.getElementById('clipboardModal');
const closeClipboardModalBtn = document.getElementById('closeClipboardModalBtn');
const clipboardModalOkBtn = document.getElementById('clipboardModalOkBtn');

if (closeClipboardModalBtn) {
  closeClipboardModalBtn.addEventListener('click', closeClipboardModal);
}

if (clipboardModalOkBtn) {
  clipboardModalOkBtn.addEventListener('click', closeClipboardModal);
}

if (clipboardModal) {
  clipboardModal.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'clipboard-modal') closeClipboardModal();
  });
}

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

if (openInAppBtn) {
  openInAppBtn.addEventListener('click', () => {
    openMacroLoggerImport(state.lastResult);
  });
}

setUnitSystem('metric');
toggleCutIntensity();
setAppImportVisibility();
setAppImportState(false);
restoreCalculatorSession();
saveFormSession();
