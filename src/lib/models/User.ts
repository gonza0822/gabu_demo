import { usuariosModel } from '@/generated/prisma/models';
import { getPrisma } from '@/lib/prisma/prisma';
import {
    getLoginExpirationSeconds,
    validateUserLogin,
    ValidateUserLoginErrorReason,
} from '@/lib/auth/validateUserLogin';

type LoginResult =
    | { result: true; token: string; supervisor: boolean; expirationSeconds: number }
    | { result: false; reason: ValidateUserLoginErrorReason | "expired" };

class User {
    userName: string;
    password: string;
    client: string;

    constructor(userName: string, password: string, client: string) {
        this.userName = userName;
        this.password = password;
        this.client = client;
    }

    async login(): Promise<LoginResult> {
        const apiLogin = await validateUserLogin(this.userName, this.password);

        if (!apiLogin.ok) {
            return {
                result: false,
                reason: apiLogin.reason,
            };
        }

        const expirationSeconds = getLoginExpirationSeconds(apiLogin.expiracion);

        if (expirationSeconds <= 0) {
            return {
                result: false,
                reason: "expired",
            };
        }

        const prisma = getPrisma(this.client);
        const listUsers: usuariosModel[] = await prisma.usuarios.findMany();
        const matchedUser = listUsers.find(
            (user) => this.userName.trim() === user.idUsuario
        );

        return {
            result: true,
            token: apiLogin.token,
            supervisor: !!matchedUser?.supervisor,
            expirationSeconds,
        };
    }
}

export default User;
