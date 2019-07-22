import { Component } from '@angular/core';
import { ToastController, AlertController, NavParams } from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';

import { SyncDataService } from '../../providers/orm/sync/sync-data-service'
import { LoggerService } from '../../providers/orm/logger-service';
import { LoginService } from '../../providers/login-service';
import { DBPurgeService } from '../../providers/orm/db/db-purge-service'

import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';
import { SyncEventsService } from '../../providers/orm/sync/sync-events-service';


/*
  Generated class for the ParametrePage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  templateUrl: 'parametre.html',
})
export class ParametrePage {

  public adresse = "";
  public port = 1337;
  public delaisSync = 10;
  public delaisGeoloc = 1;

  public showServerConf = false;

  private dbPurgeService: DBPurgeService;

  public nbDataToSync = 0;
  private syncInProgress: boolean = false;

  public geolocalisationFormat = "minutes";
  public synchronisationFormat = "minutes";

  private timeOutNumber = null;
  private showMenuButton = false;

  private admParametrageDB: AdmParametrageDB;
  private subscriptionParametrage = null;

  private updateAvailable = false;


  constructor(private syncDataService: SyncDataService, private navParams: NavParams, private appVersion: AppVersion, private loginService: LoginService, private toastCtrl: ToastController, private alertCtrl: AlertController) {
    this.showMenuButton = this.navParams.get("showMenuButton") ? true : false;

    this.adresse = SyncDataService.serverHost;
    this.port = SyncDataService.serverPort;

    if (SyncDataService.syncInterval > 60000) {
      this.delaisSync = SyncDataService.syncInterval / 60000;
    } else {
      this.delaisSync = SyncDataService.syncInterval / 1000;
      this.synchronisationFormat = "secondes";
    }


    this.dbPurgeService = new DBPurgeService();
    this.admParametrageDB = new AdmParametrageDB();

    this.refreshNbDataToSync();
    this.timeOutNumber = setInterval(() => {
      this.refreshNbDataToSync();
    }, 10000);

  }

  ionViewDidLoad() {
    this.loadParametrage();
    this.subscriptionParametrage = SyncEventsService.getObservableDataUpdated(this.admParametrageDB.getName()).subscribe((data) => {
      this.loadParametrage();
    });
  }

  loadParametrage() {
    this.admParametrageDB.getVersionNomade().then((version) => {
      this.appVersion.getVersionCode().then((versionCode) => {
        if (version != versionCode) {
          this.updateAvailable = true;
        } else {
          this.updateAvailable = false;
        }
      });
    });

  }
  ionViewWillUnload() {
    clearInterval(this.timeOutNumber);
    if (this.subscriptionParametrage) {
      this.subscriptionParametrage.unsubscribe();
    }
  }

  refreshNbDataToSync() {
    let parent = this;
    this.syncDataService.syncUpDataService.getNbDataNoSync().then(function (nb) {
      parent.nbDataToSync = nb;
    });
  }
  deleteAllDB() {
    let parent = this;
    let confirm = parent.alertCtrl.create({
      title: 'Voulez vous vraiment supprimer la base de données?',
      message: 'Les données non synchronisées avec le serveur seront perdues',
      buttons: [
        {
          text: 'Annuler',
          handler: () => {

          }
        },
        {
          text: 'Supprimer',
          handler: () => {
            parent.doDeleteAllDB();
          }
        }
      ]
    });

    confirm.present();
  }
  doDeleteAllDB() {

    let parent = this;

    parent.syncDataService.stopAutoSync();
    parent.loginService.logout(parent.syncDataService).then(function () {
      parent.dbPurgeService.dropAll().then(function () {
        let toast = parent.toastCtrl.create({
          message: 'La base de donnée a été supprimée',
          position: 'bottom',
          duration: 2000
        });
        toast.present();

        document.location.href = 'index.html';
      }).catch(function (error) {
        LoggerService.error(error);
      });

    }).catch(function (error) {
      LoggerService.error(error);
      let toast = parent.toastCtrl.create({
        message: 'Une erreur est survenu lors de la suppression de la base de donnée',
        position: 'bottom',
        duration: 2000
      });
      toast.present();
    });
  }

  save() {
    if (this.adresse != SyncDataService.serverHost || this.port != SyncDataService.serverPort) {
      let parent = this;
      let confirm = parent.alertCtrl.create({
        title: 'La base de données va être supprimée !',
        message: 'Les données non synchronisées avec le serveur seront perdues',
        buttons: [
          {
            text: 'Annuler',
            handler: () => {

            }
          },
          {
            text: 'Supprimer',
            handler: () => {
              parent.doSave().then(function () {
                parent.doDeleteAllDB();
              }).catch(function () {

              });

            }
          }
        ]
      });

      confirm.present();
    } else {
      this.doSave();
    }


  }

  doSave() {
    let promises = [];
    let promise = this.syncDataService.changeServerURL(this.adresse, this.port);

    promises.push(promise);

    let delaisSync = this.delaisSync;
    if (this.synchronisationFormat == "secondes") {
      delaisSync = delaisSync * 1000;
    } else {
      delaisSync = delaisSync * 60000;
    }

    promise = this.syncDataService.changeSyncInterval(delaisSync);

    promises.push(promise);

    let delaisGeo = this.delaisGeoloc;
    if (this.geolocalisationFormat == "secondes") {
      delaisGeo = delaisGeo * 1000;
    } else {
      delaisGeo = delaisGeo * 60000;
    }

    let parent = this;
    Promise.all(promises).then(function () {
      let toast = parent.toastCtrl.create({
        message: 'Les paramètres ont été sauvegardés',
        position: 'bottom',
        duration: 2000
      });
      toast.present();
    }).catch(function (error) {
      let toast = parent.toastCtrl.create({
        message: 'Une erreur est survenu lors de la modification des paramètres',
        position: 'bottom',
        duration: 2000
      });
      toast.present();
    });

    return Promise.all(promises);
  }

  private nbClick = 0;
  enableServerConf() {
    if (!this.showServerConf) {
      this.nbClick++;

      if (this.nbClick >= 10) {
        this.showServerConf = true;
      } else {

        let currentNB = this.nbClick;
        let parent = this;
        setTimeout(function () {
          if (currentNB == parent.nbClick)
            parent.nbClick = 0;
        }, 1000);
      }
    }
  }

  refresh() {
    if (!this.syncInProgress) {
      let parent = this;
      parent.loginService.isLogged().then(function (value) {
        if (value == false || value == "false" || value == null) {
          parent.partialRefresh();
        } else {
          parent.fullRefresh();
        }
      });
    }
  }

  update() {
    this.syncDataService.downloadApk();
  }

  fullRefresh() {
    let toast = this.toastCtrl.create({
      message: 'Lancement de la synchronisation des données',
      position: 'bottom',
      duration: 2000
    });
    toast.present();

    let parent = this;
    parent.syncInProgress = true;
    this.syncDataService.syncAllData().then(function () {
      parent.refreshNbDataToSync();
      parent.syncInProgress = false;

    }).catch(function (error) {
      LoggerService.error(error);
      parent.syncInProgress = false;
    });
  }

  partialRefresh() {
    let toast = this.toastCtrl.create({
      message: 'Chargement des utilisateurs...',
      position: 'bottom',
      duration: 2000
    });
    toast.present();
    let parent = this;
    parent.syncInProgress = true;
    this.syncDataService.syncDownOneTable("user").then(function (res) {
      parent.refreshNbDataToSync();
      parent.syncInProgress = false;
    }).catch(function (error) {
      LoggerService.error(error);
      parent.syncInProgress = false;
    });
  }


}
