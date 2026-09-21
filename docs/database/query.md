 ## Mastery Step 1: The Disappearing Employee (INNER JOIN Test)

```sql
SELECT u.first_name, t.name AS team_name
FROM users u
INNER JOIN teams t ON u.team_id = t.id;

```

Expected Result: 5 rows returned.
The Lesson: Charlie has vanished from the output because his team_id is NULL.


## Mastery Step 2: Keeping Everyone on the Map (LEFT JOIN Test)
```sql
SELECT u.first_name, COALESCE(t.name, 'No Team') AS team_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id;
```
Expected Result: 6 rows returned.
The Lesson: Charlie remains in the output, and his team is represented as NULL (or "No Team").


## Mastery Step 3: Finding Empty Entities (LEFT JOIN + NULL Filter)
```sql
SELECT t.name AS empty_team
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
WHERE u.id IS NULL;
```
Expected Result: 1 row ('Finance').
The Lesson: This is how administrators query for resources or categories that have zero active associations.

## Mastery Step 4: Correct Aggregations (COUNT Trap)

```sql
-- WRONG WAY (Apprentices will do this first!)
SELECT t.name, COUNT(*) AS employee_count
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
GROUP BY t.id;
-- Result: 'Finance' shows a count of 1.

-- CORRECT WAY (What they should submit)
SELECT t.name, COUNT(u.id) AS employee_count
FROM teams t
LEFT JOIN users u ON t.id = u.team_id
GROUP BY t.id;
-- Result: 'Finance' correctly shows a count of 0.

```