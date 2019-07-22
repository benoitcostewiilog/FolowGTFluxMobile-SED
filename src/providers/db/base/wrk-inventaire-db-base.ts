import { Injectable } from '@angular/core';
import { DBEntity } from '../../orm/db/db-entity';
import { WrkInventaireModel } from '../../../models/wrk-inventaire-model';


@Injectable()
export class WrkInventaireDBBase extends DBEntity<WrkInventaireModel> {
    protected name: string = "wrk_inventaire";
    protected attributes: any = {
        id_utilisateur: {
            type: 'integer',
            model: 'user'
        },
        ref_produit: {
            type: 'string'
        },
        code_emplacement: {
            type: 'string'
        },
        heure_prise: {
            type: 'datetime'
        },
        quantite: {
            type: 'integer'
        }
    };


    constructor() {
        super(WrkInventaireModel);

    }

}
