import { App, NavController, Toast, ToastController, Events, AlertController } from 'ionic-angular';
import { Insomnia } from '@ionic-native/insomnia';
import { Component } from '@angular/core';

import { UserDB } from '../../providers/db/user-db';
import { WrkMouvementDB } from '../../providers/db/wrk-mouvement-db';
import { WrkInventaireDB } from '../../providers/db/wrk-inventaire-db';
import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';


import { LoginService } from '../../providers/login-service';
import { LoggerService } from '../../providers/orm/logger-service';

import { LoginPage } from '../login/login';
import { SyncDataService } from '../../providers/orm/sync/sync-data-service';


import { ParametrePage } from '../parametre/parametre';

import { EmplacementPage } from '../emplacement/emplacement';
import { ColisPrisePage } from '../colis/prise/colis-prise';



import { SyncEventsService } from '../../providers/orm/sync/sync-events-service';

@Component({
  templateUrl: 'main.html'
})
export class MainPage {

  private static firstLoading = true;

  private userDB: UserDB;
  private wrkMouvementDB: WrkMouvementDB;
  private wrkInventaireDB: WrkInventaireDB;
  private admParametrageDB: AdmParametrageDB;

  public syncInProgress: boolean = false;

  public pageLoaded = false;

  public idUser = null;

  public userName;

  public user;
  private toast: Toast = null;


  private subscriptionMouvement;
  private subscriptionParametrage = null;

  private nbColisPrise = 0;
  private nbColisDepose = 0;
  private nbColisEnPrise = 0;
  private nbPassage = 0;
  private nbGroupe = 0;
  private progressDepose = 100;
  private nbInventaire = 0;

  private logoutPossiblePrise = true;

  constructor(private nav: NavController, private app: App, private events: Events, private sync: SyncDataService, private loginService: LoginService, private toastCtrl: ToastController, private alertCtrl: AlertController, private insomnia: Insomnia) {

    this.userDB = new UserDB();
    this.wrkMouvementDB = new WrkMouvementDB();
    this.wrkInventaireDB = new WrkInventaireDB();
    this.admParametrageDB = new AdmParametrageDB();
  }
  ionViewDidLoad() {

    this.enableMenu();

    this.loginService.getLoggedUser().then((id) => {

      if (id == null) {
        LoggerService.info("User not logged in");
        this.app.getRootNav().setRoot(LoginPage);
      } else {
        LoggerService.info("User logged in");
        this.idUser = id;




        this.initUser();
        this.insomnia.keepAwake();

        if (!this.sync.isLastFullSyncInLast(5, "minutes")) {
          this.refresh();
        }

        this.sync.runAutoSync().subscribe(value => LoggerService.info("Auto sync"));
        this.loadStats();
        this.subscriptionMouvement = SyncEventsService.getObservableDataUpdated(this.wrkMouvementDB.getName()).subscribe(() => {
          this.loadStats();
        });

        this.loadParametrage();
        this.subscriptionParametrage = SyncEventsService.getObservableDataUpdated(this.admParametrageDB.getName()).subscribe((data) => {
          this.loadParametrage();
        });
        this.pageLoaded = true;
      }


    }).catch(function (error) {
      LoggerService.error(error);
    });
  }



  ionViewWillUnload() {
    if (this.subscriptionMouvement) {
      this.subscriptionMouvement.unsubscribe();
    }
    if (this.subscriptionParametrage) {
      this.subscriptionParametrage.unsubscribe();
    }

  }
  loadParametrage() {
    this.admParametrageDB.isLogoutPossiblePrise().then((res) => {
      this.logoutPossiblePrise = res;
    });
  }
  loadStats() {
    this.wrkMouvementDB.getNbProduitPrise(this.idUser).then((nb) => {
      this.nbColisPrise = nb;
      this.wrkMouvementDB.getNbProduitEnPrise(this.idUser).then((nb) => {
        this.nbColisEnPrise = nb;
        if (this.nbColisPrise > 0) {
          this.progressDepose = (this.nbColisPrise - this.nbColisEnPrise) / this.nbColisPrise * 100;
        } else {
          this.progressDepose = 100;
        }
      }, (error) => {
        LoggerService.error(error);
      });
    }, (error) => {
      LoggerService.error(error);
    });
    this.wrkMouvementDB.getNbProduitDepose(this.idUser).then((nb) => {
      this.nbColisDepose = nb;
    }, (error) => {
      LoggerService.error(error);
    });

    this.wrkMouvementDB.getNbPassage(this.idUser).then((nb) => {
      this.nbPassage = nb;
    }, (error) => {
      LoggerService.error(error);
    });

    this.wrkInventaireDB.getNbInventaire(this.idUser).then((nb) => {
      this.nbInventaire = nb;
    }, (error) => {
      LoggerService.error(error);
    });
  }

  initUser() {
    this.userDB.findOne(this.idUser).then((user) => {
      if (user) {
        this.user = user;
        this.userName = user.username;
      } else {
        this.app.getRootNav().setRoot(LoginPage);
      }
    }).catch(function (error) {
      LoggerService.error(error);
    });
  }


  disableMenu() {
    this.events.publish('menu:disable');
  }

  enableMenu() {
    this.events.publish('menu:enable');
  }

  refresh() {
    if (!this.syncInProgress) {
      this.syncInProgress = true;
      if (this.toast != null) {
        this.toast.dismiss();
      }
      this.toast = this.toastCtrl.create({
        message: 'Synchronisation en cours',
        position: 'bottom',
        dismissOnPageChange: true,
        duration: 10000
      });
      this.toast.present();


      this.sync.syncAllData().then(() => {
        this.syncInProgress = false;
        this.dismissToastSync("Synchronisation terminée");
      }).catch((error) => {
        LoggerService.error(error);
        this.syncInProgress = false;
        this.dismissToastSync("Echec de la synchronisation");
      });
    }
  }

  dismissToastSync(message: string) {
    if (this.toast) {
      this.toast.setMessage(message);
      setTimeout(() => {
        if (this.toast) {
          this.toast.dismiss();
          this.toast = null;
        }
      }, 2000);
    }
  }



  isAllColisDepose(): Promise<Boolean> {
    let parent = this;
    return new Promise<Boolean>(function (resolve, reject) {

      resolve(true);


    });
  }



  goToParametre() {
    this.nav.push(ParametrePage);
  }

  afficherEcranPrise() {
    this.nav.setRoot(EmplacementPage, { type: "prise" });
  }
  afficherEcranDepose() {
    this.nav.setRoot(EmplacementPage, { type: "depose" });
  }
  afficherEcranGroupe() {
    this.nav.setRoot(EmplacementPage, { type: "groupe" });
  }
  afficherEcranPassage() {
    this.nav.setRoot(EmplacementPage, { type: "passage" });
  }
  afficherEcranInventaire() {
    this.nav.setRoot(EmplacementPage, { type: "inventaire" });
  }

  afficherEcranEnPrise() {
    this.nav.setRoot(ColisPrisePage);
  }

  logout() {
    this.isLogoutPossible().then((possible) => {
      if (possible) {
        this.loginService.logout(this.sync).then(() => {
          this.sync.stopAutoSync();
          this.events.publish('user:logout');

        }).catch((error) => {
          LoggerService.error(error);
        });
      }
    }).catch((error) => {
      LoggerService.error(error);
    });

  }

  isLogoutPossible() {
    return new Promise<Boolean>((resolve, reject) => {
      if (this.logoutPossiblePrise) {
        resolve(true);
      } else {
        if (this.nbColisEnPrise > 0) {
          let toast = this.toastCtrl.create({
            message: 'Il reste ' + this.nbColisEnPrise + ' produit(s) a déposer',
            position: 'bottom',
            duration: 3000
          });
          toast.present();
          resolve(false);
        } else {
          resolve(true);
        }
      }
    });
  }

}
