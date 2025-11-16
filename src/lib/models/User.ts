const users : {
    client: string,
    userName: string,
    password: string
}[] = [
    {
        client: 'Ypf',
        userName: 'Gonza',
        password: 'gonza22'
    },
    {
        client: 'Shell',
        userName: 'Daniel',
        password: 'daniel27'
    },
    {
        client: 'Axion',
        userName: 'Rodrigo',
        password: 'Rodri22'
    }
]

class User {
    userName: string;
    password: string;
    client: string;

    constructor(userName: string, password: string, client: string) {
        this.userName = userName;
        this.password = password;
        this.client = client;
    }

    login() : { result : boolean, token : string} {
        let token : string = '';
        users.forEach(user => {
            if(this.userName === user.userName && this.password === user.password && this.client === user.client){
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