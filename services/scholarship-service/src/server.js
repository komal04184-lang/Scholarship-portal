require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 3002;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  const initSql = path.join(__dirname, '../../database/init.sql');
  if (fs.existsSync(initSql)) {
    const sql = fs.readFileSync(initSql, 'utf8');
    await pool.query(sql);
  }
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM scholarships');
  if (rows[0].total === 0) {
    await pool.query(`INSERT INTO scholarships
      (name, description, category, amount, min_cgpa, max_income, department, deadline, total_slots, status, eligibility_criteria, required_documents)
      VALUES
      ('National Merit Scholarship', 'Award for academic excellence across all disciplines', 'merit', 75000, 8.0, 800000, 'Engineering', '2027-03-31', 25, 'open', '[]', '["Grade Sheet","Income Certificate","College ID"]'),
      ('Need-Based Financial Aid', 'Support for economically disadvantaged students', 'need-based', 45000, 5.0, 250000, 'All Departments', '2027-04-30', 50, 'open', '[]', '["Income Certificate","BPL Card","Academic Marksheet"]'),
      ('Research Fellowship', 'Competitive fellowship for post-graduate research students', 'research', 120000, 7.0, 1000000, 'Computer Science', '2027-06-30', 10, 'open', '[]', '["Research Proposal","Faculty Recommendation","Academic Marksheet"]'),
      ('Women in STEM Scholarship', 'Encouraging women pursuing STEM education', 'stem', 100000, 7.5, 600000, 'Science & Engineering', '2027-05-01', 15, 'open', '[]', '["Transcripts","Income Certificate","Admission Proof"]'),
      ('SC/ST Welfare Scholarship', 'Government-funded scholarship for SC/ST students', 'welfare', 50000, 6.0, 300000, 'All Departments', '2027-04-15', 30, 'open', '[]', '["Caste Certificate","Income Certificate","Academic Marksheet"]')
    `);
    console.log('Seeded 5 sample scholarships into scholarship_db');
  }
}

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to scholarship_db');
    await initDB();
    app.listen(PORT, () => console.log(`Scholarship Service running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('Could not connect to PostgreSQL. Check DATABASE_URL:', error.message);
    // Start anyway in resilient mode
    app.listen(PORT, () => console.log(`Scholarship Service running (DB unavailable) at http://localhost:${PORT}`));
  }
}

start();
