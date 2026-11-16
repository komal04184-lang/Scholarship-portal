CREATE TABLE Student (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT
);

CREATE TABLE StudentProfile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    category VARCHAR(50),
    annual_income DECIMAL(12, 2),
    family_size INT,
    city VARCHAR(50),
    state VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE
);

CREATE TABLE AcademicDetails (
    academic_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    institution_name VARCHAR(150),
    course VARCHAR(100),
    branch VARCHAR(100),
    semester INT,
    passing_year INT,
    cgpa DECIMAL(4, 2),
    FOREIGN KEY (student_id) REFERENCES Student(student_id) ON DELETE CASCADE
);

CREATE TABLE Scholarship (
    scholarship_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE'
);

CREATE TABLE EligibilityCriteria (
    criteria_id INT AUTO_INCREMENT PRIMARY KEY,
    scholarship_id INT NOT NULL,
    minimum_cgpa DECIMAL(4, 2),
    maximum_income DECIMAL(12, 2),
    eligible_course VARCHAR(100),
    eligible_category VARCHAR(50),
    minimum_age INT,
    maximum_age INT,
    FOREIGN KEY (scholarship_id) REFERENCES Scholarship(scholarship_id) ON DELETE CASCADE
);

CREATE TABLE RequiredDocument (
    requirement_id INT AUTO_INCREMENT PRIMARY KEY,
    scholarship_id INT NOT NULL,
    document_name VARCHAR(100) NOT NULL,
    mandatory BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (scholarship_id) REFERENCES Scholarship(scholarship_id) ON DELETE CASCADE
);

CREATE TABLE Reviewer (
    reviewer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

CREATE TABLE Application (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    scholarship_id INT NOT NULL,
    reviewer_id INT,
    grant_id INT,
    status VARCHAR(30) DEFAULT 'DRAFT',
    application_date DATE,
    submitted_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (scholarship_id) REFERENCES Scholarship(scholarship_id),
    FOREIGN KEY (reviewer_id) REFERENCES Reviewer(reviewer_id)
);

CREATE TABLE ApplicationStatus (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Application(application_id) ON DELETE CASCADE
);

CREATE TABLE ApplicationDocument (
    application_document_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    document_id INT,
    verification_status VARCHAR(30) DEFAULT 'PENDING',
    reviewer_comment TEXT,
    verified_at DATETIME,
    FOREIGN KEY (application_id) REFERENCES Application(application_id) ON DELETE CASCADE
);

CREATE TABLE Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    transaction_date DATETIME,
    FOREIGN KEY (application_id) REFERENCES Application(application_id)
);