import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';
import { SyncEventsService } from '../../providers/orm/sync/sync-events-service';
import { SyncDataService } from '../../providers/orm/sync/sync-data-service';
import { AppVersion } from '@ionic-native/app-version';

/**
 * Generated class for the About page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
  selector: 'page-about',
  templateUrl: 'about.html',
})
export class AboutPage {

  private items = [];
  private subscription;
  private admParametrageDB: AdmParametrageDB;
  constructor(public navCtrl: NavController, public navParams: NavParams, private appVersion: AppVersion) {
    this.admParametrageDB = new AdmParametrageDB();
  }

  ionViewDidLoad() {

    this.loadParametres();

  }
  ionViewWillUnload() {
  }

  loadParametres() {
    let items = [];
    let promises = [];
    let promise = this.appVersion.getVersionNumber().then((version) => {
      items.push({ ordre: 0, title: "Version", value: version });
    });
    promises.push(promise);

    items.push({ ordre: 1, title: "Serveur", value: SyncDataService.serverHost });
    items.push({ ordre: 2, title: "Port", value: SyncDataService.serverPort });

    promise = this.admParametrageDB.findOneBy("nom", "domaine_connexion").then((value) => {
      if (value) {
        items.push({ ordre: 3, title: "Domaine", value: value.valeur ? value.valeur : "N/C" });
      }

    })
    promises.push(promise);
    Promise.all(promises).then(() => {
      items.sort((a, b) => { return a.ordre > b.ordre ? 1 : (a.ordre < b.ordre ? -1 : 0) });
      this.items = items;
    })

  }
}
