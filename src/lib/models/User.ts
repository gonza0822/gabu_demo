import { usuariosModel } from '@/generated/prisma/models';
import { getPrisma } from '@/lib/prisma/prisma';

class User {
    userName: string;
    password: string;
    client: string;

    constructor(userName: string, password: string, client: string) {
        this.userName = userName;
        this.password = password;
        this.client = client;
    }

    async login() : Promise<{ result : boolean, token : string, supervisor: boolean }> {
        const prisma = getPrisma();
        const listUsers : usuariosModel[] = await prisma.usuarios.findMany();
        const matchedUser = listUsers.find(
            (user) => this.userName.trim() === user.idUsuario && this.password.trim() === user.clave
        );
        let token : string = '';
        if (matchedUser) {
            token = Math.random().toString(36).substring(2);
        }

        if(token === ''){
            return {
                result: false,
                token: '',
                supervisor: false,
            };
        } else {
            return {
                result: true,
                token: token,
                supervisor: !!matchedUser?.supervisor,
            };
        }
    }
}

export default User;  