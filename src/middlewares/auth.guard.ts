import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Request } from 'express';
import { jwtDecrypt } from "jose";

@Injectable()
export class AuthGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {

            const request = context.switchToHttp().getRequest<Request>();
            console.log(request.cookies)
            const sessionToken = request.cookies['next-auth.session-token'];

            if (!sessionToken) {
                console.log('No session token found');
                return false;
            }
            const textEncoder = new TextEncoder();
            const encodedToken = textEncoder.encode(process.env.AUTH_SECRET || 'default_secret');
            const hash = await crypto.subtle.digest("SHA-256", encodedToken);
            const { payload } = await jwtDecrypt(sessionToken as string, Buffer.from(hash));
            const userId = payload['sub'];
            const role = (payload['name'] as string).split("@")[1];
            if (!userId || !(role === "ADMIN" || role === "ENGINEER" || role === "MAINTENANCE")) {
                console.log('Invalid session token: no user ID');
                return false;
            }

            request["user"] = {
                id: userId,
                role: role,
            }
            return true;
        } catch (error) {
            console.error('Error in AuthGuard:', error);
            return false;
        }
    }
}