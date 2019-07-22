import { Injectable } from '@angular/core';
import { SyncDataService } from './sync-data-service'
import * as moment from 'moment';

@Injectable()
export class SyncPurgeDataService {

    /**
    * Table a purger
    *  { table: nom de la table,  filter: gestion de condition de suppression},
    */
    protected tablesToPurge: any = [
        { table: "wrk_mouvement", filter: { field: "heure_prise", operator: "<", value: 30, type: "days" } },
        { table: "wrk_inventaire", filter: { field: "heure_prise", operator: "<", value: 2, type: "days" } }
    ];


    constructor() {
    }

    /**
     * Purge de toutes les tables à purger
     */
    purgeAllTables() {
        let promises = [];
        for (let table of this.tablesToPurge) {
            let promise = this.purgeOneTable(table);
            promises.push(promise);
        }

        return Promise.all(promises);

    }

    /**
     * Purge d'une table
     * @param tableToPurge 
     */
    purgeOneTable(tableToPurge) {
        let table = SyncDataService.tablesToSync[tableToPurge.table];
        let tableDB = table.tableDB;

        let attribut = tableToPurge.filter.field;
        let operator = tableToPurge.filter.operator;
        let value = moment().subtract(tableToPurge.filter.value, tableToPurge.filter.type).format('YYYY-MM-DD HH:mm:ss');


        return tableDB.destroyWhere(attribut, operator, value, false);


    }

}