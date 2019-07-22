import { Injectable } from '@angular/core';
import { DBEntity } from '../../orm/db/db-entity';
import { WrkMouvementModel } from '../../../models/wrk-mouvement-model';


@Injectable()
export class WrkMouvementDBBase extends DBEntity<WrkMouvementModel> {
    protected name: string = "wrk_mouvement";
    protected attributes: any = {
        id_utilisateur: {
            type: 'integer',
            model: 'user'
        },
        heure_prise: {
            type: 'datetime'
        },
        ref_produit: {
            type: 'string'
        },
        code_emplacement: {
            type: 'string'
        },
        type: {
            type: 'string'
        },
        groupe: {
            type: 'string'
        },
        commentaire: {
            type: 'string'
        },
        quantite: {
            type: 'integer'
        },
        signature: {
            type: 'file'
        },
        photos: {
            type: 'file'
        }
    };


    constructor() {
        super(WrkMouvementModel);


    }

}
