const ALLOWED_CATEGORIES = [
  "Merit",
  "STEM",
  "Need-Based",
  "Research",
  "International",
  "Government",
  "General"
];

function normalizeCategoryName(cat) {
  if (!cat) return "";
  return String(cat).toLowerCase().replace(/[\s_-]+/g, "");
}

function validateScholarship(body, partial = false) {
  const errors = [];
  const name = body.name || body.title;
  const amount = body.amount !== undefined ? body.amount : body.award_amount;
  const deadline = body.deadline || body.application_end_date;
  const category = body.category || body.category_name;

  if (!partial) {
    if (!name) errors.push("name or title is required");
    if (!body.description) errors.push("description is required");
    if (!category) errors.push("category is required");
    if (amount === undefined || amount === null || amount === "") errors.push("amount or award_amount is required");
    if (!deadline) errors.push("deadline or application_end_date is required");
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length < 3)) {
    errors.push("name/title must contain at least 3 characters");
  }
  if (category !== undefined && !ALLOWED_CATEGORIES.some(c => normalizeCategoryName(c) === normalizeCategoryName(category))) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }
  if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    errors.push("amount must be a positive number");
  }
  if (body.min_cgpa !== undefined && body.min_cgpa !== null &&
      (!Number.isFinite(Number(body.min_cgpa)) || Number(body.min_cgpa) < 0 || Number(body.min_cgpa) > 10)) {
    errors.push("min_cgpa must be between 0 and 10");
  }
  if (body.max_income !== undefined && body.max_income !== null &&
      (!Number.isFinite(Number(body.max_income)) || Number(body.max_income) < 0)) {
    errors.push("max_income must be zero or a positive number");
  }
  if (deadline !== undefined && Number.isNaN(Date.parse(deadline))) {
    errors.push("deadline must be a valid date");
  }
  if (body.total_slots !== undefined && body.total_slots !== null &&
      (!Number.isInteger(Number(body.total_slots)) || Number(body.total_slots) < 1)) {
    errors.push("total_slots must be a positive integer");
  }
  for (const key of ["eligibility_criteria", "required_documents"]) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      errors.push(`${key} must be an array`);
    }
  }
  return errors;
}

module.exports = { validateScholarship, ALLOWED_CATEGORIES };
