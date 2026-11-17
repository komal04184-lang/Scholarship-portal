const ALLOWED_CATEGORIES = [
  "Merit",
  "Merit Based",
  "STEM",
  "Need-Based",
  "Need Based",
  "Research",
  "International",
  "Government",
  "General"
];

function normalizeCategoryName(cat) {
  if (!cat) return "";
  return String(cat).toLowerCase().replace(/[\s_-]+/g, "").replace(/based$/i, "");
}

function validateScholarship(body, partial = false) {
  const errors = [];
  const name = body.name || body.title;
  const amount = body.amount !== undefined ? body.amount : body.award_amount;
  const deadline = body.deadline || body.application_end_date;
  const category = body.category || body.category_name;
  const minCgpa = body.min_cgpa !== undefined ? body.min_cgpa : body.min_gpa;
  const totalSlots = body.total_slots !== undefined ? body.total_slots : body.seats;

  if (!partial) {
    if (!name || (typeof name === "string" && !name.trim())) {
      errors.push("name or title is required");
    }
    if (!body.description || (typeof body.description === "string" && !body.description.trim())) {
      errors.push("description is required");
    }
    if (!category) {
      errors.push("category is required");
    }
    if (amount === undefined || amount === null || amount === "") {
      errors.push("amount or award_amount is required");
    }
    if (!deadline) {
      errors.push("deadline or application_end_date is required");
    }
  }

  if (name !== undefined && (typeof name !== "string" || name.trim().length < 3)) {
    errors.push("name/title must contain at least 3 characters");
  }
  if (category !== undefined) {
    const norm = normalizeCategoryName(category);
    const matched = ALLOWED_CATEGORIES.some(c => normalizeCategoryName(c) === norm);
    if (!matched) {
      errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
    }
  }
  if (amount !== undefined && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    errors.push("amount must be a positive number");
  }
  if (minCgpa !== undefined && minCgpa !== null && minCgpa !== "") {
    const parsed = Number(minCgpa);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
      errors.push("minimum CGPA must be between 0 and 10");
    }
  }
  if (body.max_income !== undefined && body.max_income !== null && body.max_income !== "") {
    const parsedIncome = Number(body.max_income);
    if (!Number.isFinite(parsedIncome) || parsedIncome < 0) {
      errors.push("max_income must be zero or a positive number");
    }
  }
  if (deadline !== undefined) {
    if (Number.isNaN(Date.parse(deadline))) {
      errors.push("deadline must be a valid date (e.g. YYYY-MM-DD)");
    }
  }
  if (totalSlots !== undefined && totalSlots !== null && totalSlots !== "") {
    const parsedSlots = Number(totalSlots);
    if (!Number.isInteger(parsedSlots) || parsedSlots < 1) {
      errors.push("total_slots/seats must be a positive integer");
    }
  }
  for (const key of ["eligibility_criteria", "required_documents"]) {
    if (body[key] !== undefined && !Array.isArray(body[key])) {
      errors.push(`${key} must be an array`);
    }
  }
  return errors;
}

module.exports = { validateScholarship, ALLOWED_CATEGORIES, normalizeCategoryName };
