export const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);

export const sum = (list, key) => list.reduce((acc, item) => acc + (Number(key ? item[key] : item) || 0), 0);

export const toEscPos = (text) => text.replace(/[^\x00-\x7F]+/g, '');
