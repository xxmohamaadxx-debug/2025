export const safeNumber = (v, d = 0) => {
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  if (typeof v === 'string') {
    const parsed = parseFloat(v.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return d;
};

export default { safeNumber };
