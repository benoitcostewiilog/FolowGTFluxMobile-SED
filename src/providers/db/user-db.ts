import { Injectable } from '@angular/core';
import { UserDBBase } from './base/user-db-base';
import { UserModel } from '../../models/user-model';

@Injectable()
export class UserDB extends UserDBBase {
    constructor() {
        super();
    }

    getAllExcept(idUser) {
        let parent = this;
        return new Promise<UserModel[]>(function (resolve, reject) {
            let query = "SELECT * FROM " + parent.getName() + " WHERE id<>? AND deletedFlag=0";
            let params = [idUser];

            parent.db.executeQuery(query, params).then(function (data) {
                let objects: UserModel[] = [];
                objects = parent.queryResultToArray(data);
                resolve(objects);
            }).catch(function (error) {
                reject(error);
            });
        });
    }

}
