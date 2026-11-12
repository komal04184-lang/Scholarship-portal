const ALLOWED_CATEGORIES = ["Merit", "STEM", "Need-Based", "Research", "International"];

function validateScholarship(body, partial = false) {
  const errors = [];
  const required = ["name", "description", "category", "amount", "deadline"];

  if (!partial) {
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        errors.push(`${key} is required`);
      }
    }
  }

  if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length < 3)) {
    errors.push("name must contain at least 3 characters");
  }
  if (body.category !== undefined && !ALLOWED_CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${ALLOWED_CATEGORIES.join(", ")}`);
  }
  if (body.amount !== undefined && (!Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0)) {
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
  if (body.deadline !== undefined && Number.isNaN(Date.parse(body.deadline))) {
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
