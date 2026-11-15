-- Scholarship Service Database Init
-- Creates scholarships table in scholarship_db if it doesn't exist

CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  amount DECIMAL(12,2) NOT NULL,
  min_cgpa DECIMAL(3,1),
  max_income DECIMAL(12,2),
  department VARCHAR(255),
  deadline DATE,
  total_slots INTEGER,
  status VARCHAR(50) DEFAULT 'open',
  eligibility_criteria JSONB DEFAULT '[]',
  required_documents JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarships_status ON scholarships(status);
CREATE INDEX IF NOT EXISTS idx_scholarships_category ON scholarships(category);
CREATE INDEX IF NOT EXISTS idx_scholarships_created_at ON scholarships(created_at DESC);
