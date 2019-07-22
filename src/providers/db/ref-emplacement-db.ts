import { Injectable } from '@angular/core';
import { RefEmplacementDBBase } from './base/ref-emplacement-db-base';
import { RefEmplacementModel } from '../../models/ref-emplacement-model';

@Injectable()
export class RefEmplacementDB extends RefEmplacementDBBase {
    constructor() {
        super();
    }

    getEmplacementTriees() {
        return new Promise<RefEmplacementModel[]>((resolve, reject) => {
            let query = "SELECT * FROM " + this.getName() + " WHERE deletedFlag=0 ORDER BY libelle";
            let params = [];

            this.db.executeQuery(query, params).then((data) => {
                let objects: RefEmplacementModel[] = [];
                objects = this.queryResultToArray(data);
                resolve(objects);
            }).catch(function (error) {
                reject(error);
            });
        });
    }
}
