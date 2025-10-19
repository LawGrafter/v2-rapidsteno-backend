// Centralized subscription cycle logic
// Expanded durations support:
// - Months: 1 (30d), 2 (60d), 3 (90d), 12 (365d)
// - Custom: any positive number of days

function normalizePlan(planTypeRaw) {
  return String(planTypeRaw || '').trim().toLowerCase();
}

function planDays(planTypeRaw) {
  const planType = normalizePlan(planTypeRaw);
  if (planType === 'gold') return 90; // legacy default (3 months)
  if (planType === 'silver') return 30;
  if (planType === 'ahc') return 30; // default to 1 month if unspecified
  if (planType === 'diamond') return 30; // default to 1 month if unspecified
  return 30; // fallback for unknown/empty plan types
}

function allowedDurationsForPlan(planTypeRaw) {
  // Allow 30, 60, 90, 365 for all known plans; custom days handled separately
  const _ = normalizePlan(planTypeRaw);
  return [30, 60, 90, 365];
}

function validatePlanAndMonths(planTypeRaw, monthsRaw) {
  const plan = normalizePlan(planTypeRaw);
  const monthsNum = Number(monthsRaw);
  if (!plan || Number.isNaN(monthsNum) || monthsNum <= 0) {
    return { ok: false, reason: 'Invalid plan or months' };
  }

  const monthsToDays = { 1: 30, 2: 60, 3: 90, 12: 365 };
  let days = monthsToDays[monthsNum];

  // If months not in map, interpret provided number as days (custom support)
  if (!days) days = monthsNum;

  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, reason: 'Invalid duration days' };
  }

  // Advisory check (non-blocking): known allowed preset durations
  const allowed = allowedDurationsForPlan(plan);
  // We permit custom days even if not in allowed presets
  return { ok: true, plan, days };
}

function validatePlanAndDays(planTypeRaw, daysRaw) {
  const plan = normalizePlan(planTypeRaw);
  const daysNum = Number(daysRaw);
  if (!plan || Number.isNaN(daysNum) || daysNum <= 0) {
    return { ok: false, reason: 'Invalid plan or days' };
  }
  return { ok: true, plan, days: Math.floor(daysNum) };
}

// Given a user document, compute the next cycle start and end
// - Extends from existing paidUntil if it is in the future
// - Otherwise starts from now
function computeNextCycle(user, overridePlanType) {
  const days = planDays(overridePlanType || user?.SubscriptionPlanType);
  const now = new Date();

  const baseDate = (user && user.paidUntil && new Date(user.paidUntil) > now)
    ? new Date(user.paidUntil)
    : now;

  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + days);

  return { days, startDate: baseDate, endDate };
}

// Compute cycle using explicit months or custom (months treated as days if not 1/2/3/12)
function computeCycleWithMonths(startDateRaw, monthsRaw) {
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const monthsNum = Number(monthsRaw);
  const monthsToDays = { 1: 30, 2: 60, 3: 90, 12: 365 };
  const days = monthsToDays[monthsNum] ?? monthsNum; // custom days fallback

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + Math.floor(days));

  return { days: Math.floor(days), startDate, endDate };
}

function computeCycleWithDays(startDateRaw, daysRaw) {
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const days = Math.floor(Number(daysRaw));
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);
  return { days, startDate, endDate };
}

module.exports = {
  planDays,
  allowedDurationsForPlan,
  validatePlanAndMonths,
  validatePlanAndDays,
  computeNextCycle,
  computeCycleWithMonths,
  computeCycleWithDays,
};
