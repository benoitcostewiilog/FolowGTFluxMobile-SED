import { ModelEntity } from '../../providers/orm/db/model-entity';
import { WrkInventaireDB } from '../../providers/db/wrk-inventaire-db';
import { WrkInventaireModel } from '../wrk-inventaire-model';


import { UserModel } from '../user-model'

import { UserDB } from '../../providers/db/user-db'

export class WrkInventaireModelBase extends ModelEntity<WrkInventaireModel> {

    public db: WrkInventaireDB = new WrkInventaireDB();

    public id_utilisateur: number;
    public heure_prise: string;
    public ref_produit: string;
    public code_emplacement: string;
    public quantite: number;

    public userDB: UserDB = new UserDB();
    public user: UserModel;

    public relations = {
        id_utilisateur: { db: this.userDB, object: this.user, attrId: "id_utilisateur", attrName: "id_utilisateur" },
    };



    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);
        this.id_utilisateur = this.createFromArrayExtractValue(data.id_utilisateur);
        this.heure_prise = this.createFromArrayExtractValue(data.heure_prise);
        this.ref_produit = this.createFromArrayExtractValue(data.ref_produit);
        this.code_emplacement = this.createFromArrayExtractValue(data.code_emplacement);
        this.quantite = this.createFromArrayExtractValue(data.quantite);
    }

    toArray(): any {
        let array = {
            id_utilisateur: this.id_utilisateur,
            heure_prise: this.heure_prise,
            ref_produit: this.ref_produit,
            code_emplacement: this.code_emplacement,
            quantite: this.quantite,
        };

        return this.toArrayAddDefaultAttribut(array);
    }

    getRefUser(): Promise<UserModel> {
        let attr = "id_utilisateur";
        return this.getRelation(this.relations[attr]);
    }


}
