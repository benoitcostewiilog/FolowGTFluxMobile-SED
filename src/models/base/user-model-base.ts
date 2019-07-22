import { ModelEntity } from '../../providers/orm/db/model-entity';
import { UserDB } from '../../providers/db/user-db';
import { UserModel } from '../user-model';

export class UserModelBase extends ModelEntity<UserModel> {

    public db: UserDB = new UserDB();

    public username: string;
    public firstname: string;
    public lastname: string;
    public password_nomade: string;
    public last_login: string;



    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);
        this.username = this.createFromArrayExtractValue(data.username);
        this.firstname = this.createFromArrayExtractValue(data.firstname);
        this.lastname = this.createFromArrayExtractValue(data.lastname);
        this.last_login = this.createFromArrayExtractValue(data.last_login);
        this.password_nomade = this.createFromArrayExtractValue(data.password_nomade);

    }

    toArray(): any {
        let array = {
            username: this.username,
            firstname: this.firstname,
            lastname: this.lastname,
            last_login: this.last_login,
            password_nomade: this.password_nomade,
        };

        return this.toArrayAddDefaultAttribut(array);
    }


}
