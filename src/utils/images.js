const getImageUrl = (path) => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
};

export const IMAGES = {
  bills: getImageUrl('images/bills.png'),
  claude_round: getImageUrl('images/claude_round.png'),
  commute: getImageUrl('images/commute.png'),
  currency: getImageUrl('images/currency.png'),
  currency_conversion: getImageUrl('images/currency_conversion.png'),
  education: getImageUrl('images/education.png'),
  emi: getImageUrl('images/emi.png'),
  entertainment: getImageUrl('images/entertainment.png'),
  favicon: getImageUrl('images/favicon.png'),
  flywire: getImageUrl('images/flywire.jpg'),
  food: getImageUrl('images/food.png'),
  gemini_round: getImageUrl('images/gemini_round.png'),
  healthcare: getImageUrl('images/healthcare.png'),
  insurance: getImageUrl('images/insurance.png'),
  loan_balance: getImageUrl('images/loan_balance.png'),
  misc: getImageUrl('images/misc.png'),
  poll: getImageUrl('images/poll.png'),
  prepayment_target: getImageUrl('images/prepayment_target.png'),
  rent: getImageUrl('images/rent.png'),
  save: getImageUrl('images/save.png'),
  shopping: getImageUrl('images/shopping.png'),
  target: getImageUrl('images/target.png'),
  perplexity_round: getImageUrl('images/perplexity_round.png'),
  renuka_contact: getImageUrl('images/renuka_contact.png'),
};

export default IMAGES;
