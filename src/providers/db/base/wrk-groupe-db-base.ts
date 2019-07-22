import { Injectable } from '@angular/core';
import { DBEntity } from '../../orm/db/db-entity';
import { WrkGroupeModel } from '../../../models/wrk-groupe-model';

@Injectable()
export class WrkGroupeDBBase extends DBEntity<WrkGroupeModel> {
    protected name: string = "wrk_groupe";
    protected attributes: any = {
        id_utilisateur: {
            type: 'integer',
            model: 'user'
        },
        libelle: {
            type: 'text'
        },
        ref_produit: {
            type: 'text'
        },
        date: {
            type: 'datetime'
        },
        quantite: {
            type: 'integer'
        }
    };


    constructor() {
        super(WrkGroupeModel);

    }

}
