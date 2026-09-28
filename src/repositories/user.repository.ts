import type { Prisma, User } from "../generated/prisma/client";
import { prisma } from "../utils/prisma";

// Repository for managing user data in the database
// Pick = a TypeScript utility type used to select specific properties from the User type
export type CreateUserData = Pick<
	User,
	"first_name" | "last_name" | "email" | "password"
> & {
	team_id?: number | null;
};

// Repository class for performing CRUD operations on the User model in the database
export class UserRepository {
	findByEmail(email: string): Promise<User | null> {
        // Find a user by their email address in the database
		return prisma.user.findUnique({ where: { email } });
	}

    // Create a new user in the database with the provided data
	create(data: CreateUserData): Promise<User> {
        // Prepare the data for creating a new user, including optional team_id if provided
		const createData: Prisma.UserUncheckedCreateInput = {
			first_name: data.first_name,
			last_name: data.last_name,
			email: data.email,
			password: data.password,
			...(data.team_id !== undefined && { team_id: data.team_id }),
		};

        // Create the new user in the database using the prepared data
		return prisma.user.create({ data: createData });
	}
}