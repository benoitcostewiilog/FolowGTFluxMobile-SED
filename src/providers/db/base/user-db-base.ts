import { Injectable } from '@angular/core';
import { DBEntity } from '../../orm/db/db-entity';
import { UserModel } from '../../../models/user-model';

@Injectable()
export class UserDBBase extends DBEntity<UserModel> {
    protected name: string = "user";
    protected attributes: any = {
        username: {
            type: 'string'
        },
        firstname: {
            type: 'string'
        },
        lastname: {
            type: 'string'
        },
        password_nomade: {
            type: 'string'
        },
        last_login: {
            type: 'datetime'
        },
    };


    constructor() {
        super(UserModel);


    }

}
