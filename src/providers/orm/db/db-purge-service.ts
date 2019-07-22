import { Injectable } from '@angular/core';
import { DB } from './db';

import { SyncDB } from '../sync/db/sync-db';
import { UserDB } from '../../db/user-db';
import { RefEmplacementDB } from '../../db/ref-emplacement-db';
import { WrkGroupeDB } from '../../db/wrk-groupe-db';
import { WrkInventaireDB } from '../../db/wrk-inventaire-db';
import { WrkMouvementDB } from '../../db/wrk-mouvement-db';
import { AdmParametrageDB } from '../../db/adm-parametrage-db';

/*
  Generated class for the Bdd provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
*/
@Injectable()
export class DBPurgeService {
    protected db: DB;

    private allTables = [
        { name: "sync", object: new SyncDB() },
        { name: "wrk_mouvement", object: new WrkMouvementDB() },
        { name: "wrk_groupe", object: new WrkGroupeDB() },
        { name: "ref_emplacement", object: new RefEmplacementDB() },
        { name: "wrk_inventaire", object: new WrkInventaireDB() },
        { name: "user", object: new UserDB() },
        { name: "adm_supervision_parametrage", object: new AdmParametrageDB() },
    ];


    constructor() {
        this.db = new DB();
    }

    dropAll() {
        let promises = [];
        for (let table of this.allTables) {
            let promise = this.db.dropTable(table.name);

            promises.push(promise);
        }

        return Promise.all(promises);
    }

    createAll() {
        let promises = [];
        for (let table of this.allTables) {
            let promise = table.object.createTable();

            promises.push(promise);
        }

        return Promise.all(promises);
    }

}
