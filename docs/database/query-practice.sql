-- =============================================================================
-- Topic: Querying, Joins, and Safe Modifying Operations (Sandbox Track)
-- =============================================================================

-- =============================================================================
-- 🏗️ PART 1: Sandbox Schema Creation & Seed Data
-- =============================================================================

-- 1. Create and isolate the sandbox database
CREATE DATABASE IF NOT EXISTS sandbox;
USE sandbox;

-- 2. Drop existing tables if they exist to ensure clean replication
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

-- 3. Create the parent 'departments' table
CREATE TABLE departments (
  id   INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL
);

-- 4. Create the child 'employees' table with a referential Foreign Key
CREATE TABLE employees (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 5. Seed 'departments' with 4 distinct business units (1 is left empty)
INSERT INTO departments (name) VALUES 
('Finance'),     -- id: 1
('Marketing'),   -- id: 2
('Engineering'), -- id: 3
('HR');          -- id: 4 (Empty Department - No Employees assigned)

-- 6. Seed 'employees' with 6 records (1 has a NULL department_id)
INSERT INTO employees (name, department_id) VALUES 
('Alice', 1),    -- Finance
('Ben', 2),      -- Marketing
('Charlie', 3),  -- Engineering
('David', 3),    -- Engineering
('Emma', 1),     -- Finance
('Frank', NULL); -- NULL Department (Employee with no department assigned)


-- =============================================================================
-- 🔍 PART 2: The Five Mastery Queries & Verification
-- =============================================================================

-- Query 1: INNER JOIN (Selects matching names from both tables)
-- Returns: 5 rows (Frank is omitted because he does not have a matching department_id)
SELECT 
    e.name AS employee_name, 
    d.name AS department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.id;


-- Query 2: LEFT JOIN (Keeps all employees, even those with unmatched departments)
-- Returns: 6 rows (Frank is included in the output, showing NULL under department_name)
SELECT 
    e.name AS employee_name, 
    d.name AS department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;


-- Query 3: Finding the Empty Department (Where no employees are assigned)
-- Returns: 1 row (HR department, as its linked employee ID resolves to NULL)
SELECT 
    d.name AS empty_department
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id
WHERE e.id IS NULL;


-- Query 4: Grouped Count (Counting employee presence per department)
-- Returns: 4 rows (Engineering: 2, Finance: 2, Marketing: 1, HR: 0)
-- Crucial Note: We count 'e.id' rather than '*' so that empty rows resolve to 0 instead of 1.
SELECT 
    d.name AS department_name, 
    COUNT(e.id) AS total_employees
FROM departments d
LEFT JOIN employees e ON d.id = e.department_id
GROUP BY d.id, d.name;


-- Query 5a: Safe UPDATE (Moving David from Engineering to HR)
-- Returns: Exactly 1 row affected (Verified using unique Primary Key in WHERE filter)
UPDATE employees 
SET department_id = 4 
WHERE id = 4;


-- Query 5b: Safe DELETE (Removing David from the table entirely)
-- Returns: Exactly 1 row affected (Filters using 'id = 4' to prevent systemic data loss)
DELETE FROM employees 
WHERE id = 4;


-- =============================================================================
-- 🧠 PART 3: Architectural Join Reflections 
-- =============================================================================

/*
  LEFT JOIN vs. INNER JOIN Decision Matrix:
  
  - Choose INNER JOIN when you only care about complete, fully matched relationships.
    For example: "Show me all active room bookings along with their room names." 
    If a booking doesn't point to an active room, it's structurally incomplete.
  
  - Choose LEFT JOIN when you need to identify missing data, optional relationships,
    or preserve a complete list of records from your primary source table.
    For example: "Show me all 80 desks and who has booked them today."
    Using an INNER JOIN here would hide any free desks, leaving you with an empty result 
    set for desks that have not been reserved.
    
  - The COUNT(*) Pitfall:
    When executing a LEFT JOIN on an empty group (like the HR department), the engine 
    still yields one row containing NULL fields. COUNT(*) counts every returned row 
    indiscriminately, resulting in an erroneous count of '1'. Counting a specific, non-null 
    column on the joined table (like COUNT(e.id)) resolves this, as NULL values are skipped 
    by aggregate operations, correctly yielding a count of '0'.
*/
