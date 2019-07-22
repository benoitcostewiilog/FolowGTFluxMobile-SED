import { Injectable } from '@angular/core';
import { WrkMouvementDBBase } from './base/wrk-mouvement-db-base';
import { WrkMouvementModel } from '../../models/wrk-mouvement-model';
import * as moment from 'moment';

@Injectable()
export class WrkMouvementDB extends WrkMouvementDBBase {

    public static TYPE_PRISE = "prise";
    public static TYPE_DEPOSE = "depose";
    public static TYPE_GROUPE = "groupe";
    public static TYPE_INVENTAIRE = "inventaire";
    public static TYPE_PASSAGE = "passage"

    constructor() {
        super();
    }


    addPassage(emplacement, idUser) {
        let passage = new WrkMouvementModel();

        passage.code_emplacement = emplacement;
        passage.type = "passage";
        passage.heure_prise = moment().format();
        passage.id_utilisateur = idUser;

        return passage.save();
    }


    getNbProduitDepose(idUser) {
        return this.getNbProduitType(idUser, WrkMouvementDB.TYPE_DEPOSE);
    }
    getNbProduitPrise(idUser) {
        return this.getNbProduitType(idUser, WrkMouvementDB.TYPE_PRISE);
    }
    getNbPassage(idUser) {
        return this.getNbProduitType(idUser, WrkMouvementDB.TYPE_PASSAGE);
    }
    getNbProduitType(idUser, type) {
        return new Promise<number>((resolve, reject) => {
            let day=moment().format("YYYY-MM-DD")+" 00:00:00";
            let query = "SELECT COUNT(*) as nb FROM " + this.getName() + " WHERE id_utilisateur=? AND type=?  AND heure_prise >= ? AND deletedFlag=0";
            let params = [idUser, type,day];

            this.db.executeQuery(query, params).then((data) => {
                resolve(data.rows.item(0).nb);
            }).catch(function (error) {
                reject(error);
            });
        });
    }
    getNbProduitEnPrise(idUser) {
        return new Promise<number>((resolve, reject) => {
            let day=moment().format("YYYY-MM-DD")+" 00:00:00";
            let query = "SELECT COUNT(*) as nb FROM " + this.getName() + " m LEFT JOIN " + this.getName() + " m2 ON m.ref_produit=m2.ref_produit AND m2.heure_prise > m.heure_prise  WHERE m.id_utilisateur=? AND m.type=?  AND m.heure_prise >= ? AND m2.id IS NULL  AND m.deletedFlag=0";
            let params = [idUser, WrkMouvementDB.TYPE_PRISE,day];

            this.db.executeQuery(query, params).then((data) => {
                resolve(data.rows.item(0).nb);
            }).catch(function (error) {
                reject(error);
            });
        });
    }
    getProduitEnPrise(idUser): Promise<WrkMouvementModel[]> {
        return new Promise<WrkMouvementModel[]>((resolve, reject) => {
            let day=moment().format("YYYY-MM-DD")+" 00:00:00";
            let query = "SELECT m.* FROM " + this.getName() + " m LEFT JOIN " + this.getName() + " m2 ON m.ref_produit=m2.ref_produit AND m2.heure_prise > m.heure_prise  WHERE m.id_utilisateur=? AND m.type=?  AND m.heure_prise >= ? AND m2.id IS NULL  AND m.deletedFlag=0";
            let params = [idUser, WrkMouvementDB.TYPE_PRISE,day];

            this.db.executeQuery(query, params).then((data) => {
                let objects: WrkMouvementModel[] = [];
                objects = this.queryResultToArray(data);
                resolve(objects);

            }).catch(function (error) {
                reject(error);
            });
        });
    }

    getProduitEnDepose(emplacement): Promise<WrkMouvementModel[]> {
        return new Promise<WrkMouvementModel[]>((resolve, reject) => {
           let query = "SELECT m.* FROM " + this.getName() + " m LEFT JOIN " + this.getName() + " m2 ON m.ref_produit=m2.ref_produit AND m2.heure_prise > m.heure_prise  WHERE m.code_emplacement=? AND m.type=? AND m2.id IS NULL  AND m.deletedFlag=0";
            
            let params = [emplacement,WrkMouvementDB.TYPE_DEPOSE];

            this.db.executeQuery(query, params).then((data) => {
                let objects: WrkMouvementModel[] = [];
                objects = this.queryResultToArray(data);
                resolve(objects);

            }).catch(function (error) {
                reject(error);
            });
        });
    }
}
