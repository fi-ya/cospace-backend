# Authentication

- Install Security Tools: bcrypt hashes passwords; jsonwebtoken signs and verifies tokens.	
`npm install bcrypt jsonwebtoken`	
- Install Type Definitions: Adds the TypeScript definitions for both libraries.	
`npm install -D @types/bcrypt @types/jsonwebtoken`	

.env
```env
JWT_SECRET=replace_this_with_a_long_random_string
```