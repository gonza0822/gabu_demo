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

    async login() : Promise<{ result : boolean, token : string}> {
        const prisma = getPrisma();
        const listUsers = await prisma.usuarios.findMany();
        let token : string = '';
        listUsers.forEach(user => {
            if(this.userName.trim() === user.idUsuario && this.password.trim() === user.clave){
                token = Math.random().toString(36).substring(2)
            }
        })

        if(token === ''){
            return {
                result: false,
                token: ''
            };
        } else {
            return {
                result: true,
                token: token
            };
        }
    }
}

export default User;  