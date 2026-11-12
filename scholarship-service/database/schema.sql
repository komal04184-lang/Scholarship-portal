CREATE TABLE IF NOT EXISTS scholarships (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('Merit','STEM','Need-Based','Research','International')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    min_cgpa NUMERIC(3,2) CHECK (min_cgpa IS NULL OR (min_cgpa >= 0 AND min_cgpa <= 10)),
    max_income NUMERIC(14,2) CHECK (max_income IS NULL OR max_income >= 0),
    department VARCHAR(120),
    deadline DATE NOT NULL,
    total_slots INTEGER CHECK (total_slots IS NULL OR total_slots > 0),
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
    eligibility_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarships_category ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_scholarships_department ON scholarships(department);
CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_deadline ON scholarships(deadline);

-- Demo records
INSERT INTO scholarships
(name, description, category, amount, min_cgpa, max_income, department, deadline, total_slots, eligibility_criteria, required_documents)
VALUES
('Merit Scholarship', 'Financial support for students with strong academic performance.', 'Merit', 25000, 8.0, 500000, 'Computer Science', '2027-03-31', 50,
 '["Minimum CGPA 8.0","Must be a currently enrolled student"]'::jsonb,
 '["Latest marksheet","College ID","Income certificate"]'::jsonb),
('Need Based Scholarship', 'Support for students who need financial assistance.', 'Need-Based', 30000, 6.0, 250000, 'All Departments', '2027-04-15', 100,
 '["Family income must be within the stated limit","Must be currently enrolled"]'::jsonb,
 '["Income certificate","Latest marksheet","Bank passbook"]'::jsonb)
ON CONFLICT DO NOTHING;
