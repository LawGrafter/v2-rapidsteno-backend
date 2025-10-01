// Centralized subscription cycle logic
// Extended plans and durations:
// - silver: 1 month (30 days)
// - gold: 1 or 3 months (30 or 90 days)
// - ahc: 1 or 3 months (30 or 90 days)
// - diamond: 1 or 3 months (30 or 90 days)

function planDays(planTypeRaw) {
  const planType = String(planTypeRaw || '').trim().toLowerCase();
  if (planType === 'gold') return 90; // legacy default (3 months)
  if (planType === 'silver') return 30;
  if (planType === 'ahc') return 30; // default to 1 month if unspecified
  if (planType === 'diamond') return 30; // default to 1 month if unspecified
  // fallback for unknown/empty plan types
  return 30;
}

function allowedDurationsForPlan(planTypeRaw) {
  const planType = String(planTypeRaw || '').trim().toLowerCase();
  if (planType === 'silver') return [30];
  if (['gold', 'ahc', 'diamond'].includes(planType)) return [30, 90];
  return [30];
}

function validatePlanAndMonths(planTypeRaw, monthsRaw) {
  const plan = String(planTypeRaw || '').trim().toLowerCase();
  const months = Number(monthsRaw);
  if (!plan || Number.isNaN(months)) return { ok: false, reason: 'Invalid plan or months' };
  const allowed = allowedDurationsForPlan(plan);
  const days = months === 1 ? 30 : months === 3 ? 90 : null;
  if (!days || !allowed.includes(days)) {
    return { ok: false, reason: `Invalid duration for plan ${plan}. Allowed months: ${allowed.map(d=>d===30?1:3).join(', ')}` };
  }
  return { ok: true, plan, days };
}

// Given a user document, compute the next cycle start and end
// - Extends from existing paidUntil if it is in the future to avoid shortening paid access
// - Otherwise starts from now
function computeNextCycle(user, overridePlanType) {
  const days = planDays(overridePlanType || user?.SubscriptionPlanType);
  const now = new Date();

  // base date is the later of now or existing paidUntil
  const baseDate = (user && user.paidUntil && new Date(user.paidUntil) > now)
    ? new Date(user.paidUntil)
    : now;

  const endDate = new Date(baseDate);
  endDate.setDate(endDate.getDate() + days);

  return {
    days,
    startDate: baseDate,
    endDate,
  };
}

// Compute cycle using explicit months (1 or 3)
function computeCycleWithMonths(startDateRaw, monthsRaw) {
  const months = Number(monthsRaw);
  const days = months === 3 ? 90 : 30;
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + days);

  return { days, startDate, endDate };
}

module.exports = {
  planDays,
  allowedDurationsForPlan,
  validatePlanAndMonths,
  computeNextCycle,
  computeCycleWithMonths,
};
