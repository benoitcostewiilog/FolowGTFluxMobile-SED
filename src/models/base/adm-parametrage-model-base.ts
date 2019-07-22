import {ModelEntity} from '../../providers/orm/db/model-entity';
import {AdmParametrageDB} from '../../providers/db/adm-parametrage-db';
import { AdmParametrageModel } from '../adm-parametrage-model';

export class AdmParametrageModelBase extends ModelEntity<AdmParametrageModel> {

    public db: AdmParametrageDB = new AdmParametrageDB();
    public nom: string;
    public valeur: any;


    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);
        this.nom = this.createFromArrayExtractValue(data.nom);
        this.valeur = this.createFromArrayParseJsonObject(data.valeur);
    }

    toArray(): any {
        let array = {
            nom: this.nom,
            valeur: this.toArrayStringifyJsonObject(this.valeur)
        };

        return this.toArrayAddDefaultAttribut(array);
    }


}
