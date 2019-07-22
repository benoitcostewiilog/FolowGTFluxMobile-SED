import { Injectable } from '@angular/core';
import { WrkInventaireDBBase } from './base/wrk-inventaire-db-base';

@Injectable()
export class WrkInventaireDB extends WrkInventaireDBBase {
    constructor() {
        super();
    }

    getNbInventaire(idUser) {
        return new Promise<number>((resolve, reject) => {
            let query = "SELECT COUNT(*) as nb FROM " + this.getName() + " WHERE id_utilisateur=?AND strftime('%Y-%m-%d', heure_prise) = date('now') AND deletedFlag=0";
            let params = [idUser];

            this.db.executeQuery(query, params).then((data) => {
                resolve(data.rows.item(0).nb);
            }).catch(function (error) {
                reject(error);
            });
        });
    }
}
