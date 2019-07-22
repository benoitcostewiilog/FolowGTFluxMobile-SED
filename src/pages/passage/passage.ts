import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams,ToastController } from 'ionic-angular';
import { LoginService } from '../../providers/login-service';
import { SyncDataService } from '../../providers/orm/sync/sync-data-service';
import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';

import { WrkMouvementModel } from '../../models/wrk-mouvement-model';
import * as moment from 'moment';

/**
 * Generated class for the PassagePage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@IonicPage()
@Component({
  selector: 'page-passage',
  templateUrl: 'passage.html',
})
export class PassagePage {
  private emplacement = "";

  private typePassage = [
    { id: 1, text: "Gare vide", icon: "ios-cube-outline", value: "Gare vide" },
    { id: 2, text: "Navette pleine", icon: "ios-cube", value: "Navette pleine" }
  ];

  private admParametrage: AdmParametrageDB;

  constructor(public navCtrl: NavController, public navParams: NavParams, private loginService: LoginService, private sync: SyncDataService, private toastCtrl: ToastController) {
    this.emplacement = navParams.get("emplacement");
    this.admParametrage = new AdmParametrageDB();
  }

  ionViewDidLoad() {
    this.admParametrage.findAll().then((params) => {
      console.debug(params);
    })
    this.admParametrage.getTypePassage().then((types) => {
      this.typePassage = types;
    });
  }

  typePassageClick(idItem) {
    this.loginService.getLoggedUser().then((id) => {
      let passage = new WrkMouvementModel();

      passage.code_emplacement = this.emplacement;
      passage.type = "passage";
      passage.heure_prise = moment().format();
      passage.id_utilisateur = id;
      passage.commentaire = this.getTextPassage(idItem);
      passage.save().then(() => {
        this.sync.syncUpOneTable(passage.db.getName());
        let toast = this.toastCtrl.create({
          message: "Passage enregistré !",
          position: 'bottom',
          duration: 2000,
          dismissOnPageChange:false
        });
        toast.present();
        this.navCtrl.pop();
      });
    });
  }

  getTextPassage(id) {
    for (let type of this.typePassage) {
      if (type.id == id) {
        return type.value;
      }
    }
  }

}
