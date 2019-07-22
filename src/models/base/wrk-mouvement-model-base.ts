import { ModelEntity } from '../../providers/orm/db/model-entity';
import { WrkMouvementDB } from '../../providers/db/wrk-mouvement-db';
import { WrkMouvementModel } from '../wrk-mouvement-model';


import { UserModel } from '../user-model'

import { UserDB } from '../../providers/db/user-db'

export class WrkMouvementModelBase extends ModelEntity<WrkMouvementModel> {

    public db: WrkMouvementDB = new WrkMouvementDB();

    public id_utilisateur: number;
    public heure_prise: string;
    public ref_produit: string;
    public code_emplacement: string;
    public type: string;
    public groupe: string;
    public commentaire: string;
    public quantite: number;
    public signature: any;
    public photos: any;


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
        this.type = this.createFromArrayExtractValue(data.type);
        this.groupe = this.createFromArrayExtractValue(data.groupe);
        this.commentaire = this.createFromArrayExtractValue(data.commentaire);
        this.quantite = this.createFromArrayExtractValue(data.quantite);
        this.signature = this.createFromArrayParseJsonObject(data.signature);
        this.photos = this.createFromArrayParseJsonObject(data.photos);
    }

    toArray(): any {
        let array = {
            id_utilisateur: this.id_utilisateur,
            heure_prise: this.heure_prise,
            ref_produit: this.ref_produit,
            code_emplacement: this.code_emplacement,
            type: this.type,
            groupe: this.groupe,
            commentaire: this.commentaire,
            quantite: this.quantite,
            signature: this.toArrayStringifyJsonObject(this.signature),
            photos: this.toArrayStringifyJsonObject(this.photos),
        };

        return this.toArrayAddDefaultAttribut(array);
    }

    getRefUser(): Promise<UserModel> {
        let attr = "id_utilisateur";
        return this.getRelation(this.relations[attr]);
    }


}
