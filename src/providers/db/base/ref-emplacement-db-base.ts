import {Injectable} from '@angular/core';
import {DBEntity} from '../../orm/db/db-entity';
import {RefEmplacementModel} from '../../../models/ref-emplacement-model';


@Injectable()
export class RefEmplacementDBBase extends DBEntity<RefEmplacementModel> {
    protected name: string = "ref_emplacement";
    protected attributes: any = {
        code_emplacement: {
            type: 'string'
        },
        libelle: {
            type: 'string'
        }
    };


    constructor() {
        super(RefEmplacementModel);
    }

}
