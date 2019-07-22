import { ModelEntity } from '../../providers/orm/db/model-entity';
import { RefEmplacementDB } from '../../providers/db/ref-emplacement-db';
import { RefEmplacementModel } from '../ref-emplacement-model';


import { UserModel } from '../user-model'

import { UserDB } from '../../providers/db/user-db'

export class RefEmplacementModelBase extends ModelEntity<RefEmplacementModel> {

    public db: RefEmplacementDB = new RefEmplacementDB();

    public code_emplacement: string;
    public libelle: string;

    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);
        this.code_emplacement = this.createFromArrayExtractValue(data.code_emplacement);
        this.libelle = this.createFromArrayExtractValue(data.libelle);
    }

    toArray(): any {
        let array = {
            code_emplacement:this.code_emplacement,
            libelle: this.libelle,
        };

        return this.toArrayAddDefaultAttribut(array);
    }


}
