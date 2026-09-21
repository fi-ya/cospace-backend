# 🗄️ Database Tables & Constraints Design

This document details the physical implementation, schema parameters, and validation rules for the `users` table created within our standalone MySQL training environment.

---

## 🏗️ 1. CREATE TABLE SQL Statement

To support robust profile tracking, we implemented the following table structure utilizing appropriate relational data types, nullability, and default options.

```sql
CREATE DATABASE IF NOT EXISTS training;
USE training;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    age INT,
    active BOOLEAN DEFAULT TRUE
);
```

### Data Type Selection Rationales

* **`id INT AUTO_INCREMENT PRIMARY KEY`**: Ensures that each record receives a unique, system-generated identity. Using an integer makes queries and indexing significantly faster than textual keys.
* **`name VARCHAR(100) NOT NULL`**: Accommodates varying name lengths up to 100 characters. We marked this as `NOT NULL` because an anonymous profile is structurally invalid.
* **`email VARCHAR(255) NOT NULL`**: Aligns with the maximum theoretical size of email addresses according to RFC standards.
* **`age INT`**: Stores a whole number representing age. This column allows `NULL` values to accommodate employees who choose not to disclose their age.
* **`active BOOLEAN DEFAULT TRUE`**: Internally initialized as a `TINYINT(1)` by the MySQL engine. It represents active status and defaults to `TRUE` (`1`) so that new users are active automatically.

---

## 📊 2. Table Structural Properties (DESCRIBE users)

Running the query `DESCRIBE users;` returns the following structural metadata mapping our constraints:

| Field | Type | Null | Key | Default | Extra |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **id** | int | NO | PRI | NULL | auto_increment |
| **name** | varchar(100) | NO | | NULL | |
| **email** | varchar(255) | NO | | NULL | |
| **age** | int | YES | | NULL | |
| **active** | tinyint(1) | YES | | 1 | |

---

## 🚨 3. Constraint Validation & Error Testing

### Scenario 1: Violating a `NOT NULL` Constraint
When attempting to insert a record with a missing, required `name` value:

```sql
INSERT INTO users (email, age)
VALUES ('john.doe@example.com', 32);
```

#### MySQL Error Response Received:
```text
ERROR 1364 (HY000): Field 'name' doesn't have a default value
```

### 🧠 Why Database Enforcement Beats API Code Checks
Enforcing constraints at the database level is significantly more robust than relying purely on application-level or API-level verification. Here is why:

1. **Guarantees a Single Source of Truth:** Your database might be accessed by multiple services, scripts, reporting tools, or microservices. If validation only exists in one API's source code, a direct script or a second service could easily inject corrupted or incomplete data. 
2. **Maintains Strict Structural Integrity:** The database engine is highly optimized to run checks at the infrastructure level. Offloading validation directly to MySQL stops corrupt records before they can ever write to disk, ensuring that structural rules remain consistent regardless of how the data was submitted.

---

## ⚙️ 4. Default Values and Column Sizing Tests

### Inserting Data Without Specifying Active Status
```sql
INSERT INTO users (name, email, age)
VALUES ('Sarah Connor', 'sarah@resistance.com', 29);
```

#### Selection Result:
```sql
SELECT * FROM users WHERE name = 'Sarah Connor';
```

| id | name | email | age | active |
| :--- | :--- | :--- | :--- | :--- |
| **2** | Sarah Connor | sarah@resistance.com | 29 | **1** |

*Note: The system automatically initialized the `active` field to `1` (representing `TRUE` in MySQL's boolean structure).*

### Testing Column Overflow Bounds
Attempting to insert a text string that exceeds the specified maximum constraint size of the database:

```sql
INSERT INTO users (name, email, age)
VALUES ('A Extremely Long Name That Intentionally Exceeds One Hundred Characters To Trigger The Database Structural Limit Check', 'test@example.com', 25);
```

#### MySQL Error Response Received:
```text
ERROR 1406 (22001): Data too long for column 'name' at row 1
```
