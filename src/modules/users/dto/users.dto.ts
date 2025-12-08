import { Role } from "@prisma/client";

export class CreateUserDTO {
    email: string;
    password: string;
    name: string;
    role: Role;
}
export class UpdateUserDTO {
    email:string;
    name:string;
    role:Role;
    password?:string;
}