import {Injectable} from '@angular/core';
import {DBEntity} from '../../orm/db/db-entity';
import {AdmParametrageModel} from '../../../models/adm-parametrage-model';


@Injectable()
export class AdmParametrageDBBase  extends DBEntity<AdmParametrageModel> {
    protected name: string = "adm_supervision_parametrage";
    protected attributes: any = {
        nom: {
            type: 'string'
        },
        valeur: {
            type: 'json'
        }
    };


    constructor() {
        super(AdmParametrageModel);
    }

}
