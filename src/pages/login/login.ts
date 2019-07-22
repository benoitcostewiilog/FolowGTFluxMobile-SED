import { Component, ViewChild } from '@angular/core';
import { NavController, Loading, LoadingController, Platform, ToastController, Events, TextInput } from 'ionic-angular';
import { LoginService } from '../../providers/login-service';
import { ParametrePage } from '../parametre/parametre';
import { SyncDataService } from '../../providers/orm/sync/sync-data-service'
import { LoggerService } from '../../providers/orm/logger-service';
import { AppVersion } from '@ionic-native/app-version';
import { ScannerService } from '../../providers/scanner-service';
import { SyncDB } from '../../providers/orm/sync/db/sync-db';
import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';
import { Keyboard } from '@ionic-native/keyboard';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';

/*
  Generated class for the LoginPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  templateUrl: 'login.html',
})
export class LoginPage {

  public user: any = { password_nomade: "" };
  private loading: Loading;
  private version = "";
  private domaine = "";
  private subscriptionScanner;

  @ViewChild('username') usernameInput: TextInput;
  @ViewChild('password') passwordInput: TextInput;

  private showBtnBarcode = false;

  private subscriptionShowKeyboard;
  private subscriptionHideKeyboard;

  constructor(private nav: NavController, private events: Events, private sync: SyncDataService, private scannerService: ScannerService, private platform: Platform, private loginService: LoginService, private loadingCtrl: LoadingController, private toastCtrl: ToastController, private appVersion: AppVersion, private keyboard: Keyboard, private barcodeScanner: BarcodeScanner) {

    this.platform.ready().then(() => {

      this.appVersion.getVersionNumber().then((version) => {
        this.version = version;
      });

      this.loginService.isLogged().then((value) => {
        if (value == false || value == "false" || value == null) {
          this.presentLoading();

          this.sync.syncDownOneTable("user").then((res) => {
            this.loading.dismiss();
          }).catch((error) => {
            this.loading.dismiss();
            this.userLoadingError();
            LoggerService.error("syncAllData : " + error);
          });
          this.loadParametrage();

        } else {
          this.events.publish('user:login');
        }
      })
    });



  }

  ionViewDidLoad() {
    this.subscriptionShowKeyboard = this.keyboard.onKeyboardShow().subscribe(() => {
      this.showBtnBarcode = true;
    });
    this.subscriptionHideKeyboard = this.keyboard.onKeyboardHide().subscribe(() => {
      this.showBtnBarcode = false;
    });
  }
  ionViewDidEnter() {
    this.subscriptionScanner = this.scannerService.getObservable().subscribe((barcode) => {
      this.user.password_nomade = barcode;
      this.login();

    });
  }
  ionViewWillLeave() {
    if (this.subscriptionScanner) {
      this.subscriptionScanner.unsubscribe();
      this.subscriptionScanner = null;
    }
  }


  ionViewWillUnload() {
    if (this.subscriptionShowKeyboard) {
      this.subscriptionShowKeyboard.unsubscribe();
    }
    if (this.subscriptionHideKeyboard) {
      this.subscriptionHideKeyboard.unsubscribe();
    }

  }
  loadParametrage() {
    this.sync.syncDownOneTable("adm_supervision_parametrage").then((res) => {
      let admParametrageDB = new AdmParametrageDB();

      admParametrageDB.findOneBy("nom", "domaine_connexion").then((value) => {
        if (value) {
          this.domaine = value.valeur;
        }
      })
    });
  }

  presentLoading() {
    this.loading = this.loadingCtrl.create({
      content: "Chargement des utilisateurs...",
      dismissOnPageChange: true,
      showBackdrop: true,
      enableBackdropDismiss :true
    });
    this.loading.present();
  }

  afterLogin() {
    return new Promise<any>((resolve, reject) => {
      this.sync.resetLastFullSync();
      let syncDB = new SyncDB();
      syncDB.findOneBy("name", "wrk_mouvement").then((dbsync) => {
        if (dbsync) {
          dbsync.syncAt = null;
          dbsync.save().then(() => resolve(), (error) => resolve());
        } else {
          resolve();
        }
      }, (error) => resolve());
    })

  }
  scan() {
    this.barcodeScanner.scan().then((barcodeData) => {
      if (!barcodeData.cancelled) {
        this.user.password_nomade = barcodeData.text;
        this.login();
      }
    })
      .catch(error => {
        console.log(error); // Error message
      });
  }
  login() {

    if (this.user.password_nomade == "") {
      let toast = this.toastCtrl.create({
        message: 'Les identifiants sont invalides',
        position: 'bottom',
        duration: 2000
      });
      toast.present();
    } else {
      this.user.password_nomade = this.user.password_nomade.trim();
      this.loginService.login(this.user, this.sync).then((user) => {
       // this.afterLogin().then(() => {
          this.events.publish('user:login');
      //  });

      }).catch((error) => {
        let toast = this.toastCtrl.create({
          message: 'Les identifiants sont invalides',
          position: 'bottom',
          duration: 2000
        });
        toast.present();
      });


    }
  }
  goToParametre() {
    this.nav.push(ParametrePage);
  }

  doRefresh(refresher) {
    let parent = this;
    parent.sync.syncDownOneTable("user").then((res) => {
      refresher.complete();
      this.loadParametrage();
    }).catch((error) => {
      refresher.complete();
      parent.userLoadingError();
      LoggerService.error("syncAllData : " + error.message);
    });


  }

  userLoadingError() {
    let toast = this.toastCtrl.create({
      message: 'Une erreur est survenu lors de la récupération des utilisateurs',
      position: 'bottom',
      duration: 2000
    });
    toast.present();
  }
}
