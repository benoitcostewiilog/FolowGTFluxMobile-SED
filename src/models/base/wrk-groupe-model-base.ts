import { ModelEntity } from '../../providers/orm/db/model-entity';
import { WrkGroupeDB } from '../../providers/db/wrk-groupe-db';
import { WrkGroupeModel } from '../wrk-groupe-model';


import { UserModel } from '../user-model'

import { UserDB } from '../../providers/db/user-db'

export class WrkGroupeModelBase extends ModelEntity<WrkGroupeModel> {

    public db: WrkGroupeDB = new WrkGroupeDB();

    public id_utilisateur: number;
    public libelle: string;
    public ref_produit: string;
    public date: string;
    public quantite: number;
    public userDB: UserDB = new UserDB();
    public user: UserModel;

    public relations = {
        id_utilisateur: { db: this.userDB, object: this.user, attrId: "id_utilisateur", attrName: "id_utilisateur" },
    };



    createFromArray(data) {
        this.createFromArrayDefaultAttribut(data);
        this.id_utilisateur = this.createFromArrayExtractValue(data.id_utilisateur);
        this.libelle = this.createFromArrayExtractValue(data.libelle);
        this.ref_produit = this.createFromArrayExtractValue(data.ref_produit);
        this.date = this.createFromArrayExtractValue(data.date);
        this.quantite = this.createFromArrayExtractValue(data.quantite);
    }

    toArray(): any {
        let array = {
            id_utilisateur: this.id_utilisateur,
            libelle: this.libelle,
            ref_produit: this.ref_produit,
            date: this.date,
            quantite: this.quantite,
        };

        return this.toArrayAddDefaultAttribut(array);
    }

    getRefUser(): Promise<UserModel> {
        let attr = "id_utilisateur";
        return this.getRelation(this.relations[attr]);
    }


}
