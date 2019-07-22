import { Injectable } from '@angular/core';
import { SyncDBBase } from './base/sync-db-base';
import { SyncModel } from '../model/sync-model';

@Injectable()
export class SyncDB extends SyncDBBase {
    constructor() {
        super();
    }

    insertIfNotExist(tableName: string, tableServerName: string) {
        let parent = this;
        var p1 = new Promise<SyncModel>(function (resolve, reject) {
            parent.findBy("name", tableName, true).then(function (data) {
                if (data.length == 0) {
                    let model: SyncModel = new SyncModel();
                    model.name = tableName;
                    model.nameServer = tableServerName;
                    model.syncAt = '0000-00-00 00:00:00';
                    model.nbRow = 0;
                    parent.create(model).then(function (data) {

                        resolve(model);

                    }, function (raison) {
                        reject(raison);
                    });
                } else {
                    resolve(null);
                }

            }, function (raison) {
                reject(raison);
            });
        });
        return p1;
    }

    getSyncData(tableName: string[]): Promise<any> {
        let parent = this;
        return new Promise<any>(function (resolve, reject) {
            let promise: Promise<SyncModel[]>;
            if (tableName.length > 0) {
                promise = parent.findBy("name", tableName, true);
            } else {
                promise = parent.findAll(true);
            }

            promise.then(function (data) {
                let res: any = [];
                for (let item of data) {
                    res.push({ name: item.nameServer, syncAt: item.syncAt, nbRow: item.nbRow });
                }
                resolve(res);
            }, function (raison) {
                reject(raison);
            });
        });
    }


}
