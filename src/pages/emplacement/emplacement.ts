import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Content, LoadingController } from 'ionic-angular';
import { Media } from '@ionic-native/media';
import { ColisListPage } from '../colis/list/colis-list';
import { PassagePage } from '../passage/passage';
import { ColisDeposePage } from '../colis/depose/colis-depose';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';

import { WrkMouvementDB } from '../../providers/db/wrk-mouvement-db';

import { AdmParametrageDB } from '../../providers/db/adm-parametrage-db';

import { RefEmplacementDB } from '../../providers/db/ref-emplacement-db';
import { RefEmplacementModel } from '../../models/ref-emplacement-model';
import { LoggerService } from '../../providers/orm/logger-service';
import { LoginService } from '../../providers/login-service';

import { SyncDataService } from '../../providers/orm/sync/sync-data-service';
import { ScannerService } from '../../providers/scanner-service';
import { SyncEventsService } from '../../providers/orm/sync/sync-events-service';

/**
 * Generated class for the emplacement page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
  selector: 'page-emplacement',
  templateUrl: 'emplacement.html',
})
export class EmplacementPage {

  private inputMethod = "";

  private inputMethodScan = true;
  private inputMethodInput = true;
  private inputMethodList = true;

  private filterString = "";


  private title = "Gare de prise";

  private type = "prise";

  private TYPE_PRISE = WrkMouvementDB.TYPE_PRISE;
  private TYPE_DEPOSE = WrkMouvementDB.TYPE_DEPOSE;
  private TYPE_GROUPE = WrkMouvementDB.TYPE_GROUPE;
  private TYPE_INVENTAIRE = WrkMouvementDB.TYPE_INVENTAIRE;
  private TYPE_PASSAGE = WrkMouvementDB.TYPE_PASSAGE;
  private wrkMouvementDb: WrkMouvementDB;
  private refEmplacementDB: RefEmplacementDB;
  private admParametrageDB: AdmParametrageDB;

  @ViewChild('valueInput') valueInput: ElementRef;
  @ViewChild(Content) content: Content;

  private emplacements: RefEmplacementModel[] = [];

  private value = "";
  private subscriptionScanner;

  private gestionEmplacement = false;
  private autoCreateEmplacement = false;
  private subscriptionParametrage = null;

  private subscriptionEmplacement = null;

  private validationInProgress = false;


  constructor(public navCtrl: NavController, public navParams: NavParams, public toastCtrl: ToastController, private scannerService: ScannerService, private barcodeScanner: BarcodeScanner, private sync: SyncDataService, private loginService: LoginService, private media: Media, public loadingCtrl: LoadingController) {

    this.wrkMouvementDb = new WrkMouvementDB();
    this.refEmplacementDB = new RefEmplacementDB();
    this.admParametrageDB = new AdmParametrageDB();
    this.type = this.navParams.get("type") ? this.navParams.get("type") : "prise";
    this.setType();

  }

  ionViewDidLoad() {
    this.admParametrageDB.firstInputMethodEmplacement().then((res) => {
      LoggerService.debug("firstInputMethodEmplacement : " + res);
      if (res == "scan") {
        this.showScan();
      } else if (res == "list") {
        this.showList();
      } else if (res == "input") {
        this.showInput();
      }
    });

    this.loadParametrage();
    this.subscriptionParametrage = SyncEventsService.getObservableDataUpdated(this.admParametrageDB.getName()).subscribe((data) => {
      this.loadParametrage();
    });


  }

  loadEmplacements() {
    return this.refEmplacementDB.getEmplacementTriees().then((emplacements) => {
      this.emplacements = emplacements;
    });

  }
  loadParametrage() {
    this.admParametrageDB.isGestionEmplacement().then((res) => {
      LoggerService.debug("isGestionEmplacement : " + res);
      this.gestionEmplacement = res;
    });
    this.admParametrageDB.isAutoCreateEmplacement().then((res) => {
      LoggerService.debug("isAutoCreateEmplacement : " + res);
      this.autoCreateEmplacement = res;
    });
    this.admParametrageDB.isTypeInputMethodEmplacementList().then((res) => {
      LoggerService.debug("isTypeInputMethodEmplacementList : " + res);
      if (this.type != this.TYPE_GROUPE) {
        this.inputMethodList = res;
      } else {
        this.inputMethodList = false;
      }
    });

    this.admParametrageDB.isTypeInputMethodEmplacementInput().then((res) => {
      LoggerService.debug("isTypeInputMethodEmplacementInput : " + res);
      this.inputMethodInput = res;
    });

    this.admParametrageDB.isTypeInputMethodEmplacementScan().then((res) => {
      LoggerService.debug("isTypeInputMethodEmplacementScan : " + res);
      this.inputMethodScan = res;
    });
  }

  ionViewDidEnter() {
    this.value = "";
    setTimeout(() => {
      if (this.content) {
        this.content.resize();
      }
    }, 20);

    this.scannerService.disableKeyDown();
    this.subscriptionScanner = this.scannerService.getObservable().subscribe((barcode) => {
      this.value = barcode;
      this.validateInput();

    });
  }
  ionViewWillLeave() {
    this.scannerService.enableKeyDown();
    if (this.subscriptionScanner) {
      this.subscriptionScanner.unsubscribe();
      this.subscriptionScanner = null;
    }
  }
  ionViewWillUnload() {
    if (this.subscriptionParametrage) {
      this.subscriptionParametrage.unsubscribe();
    }

  }

  scan() {
    this.barcodeScanner.scan().then((barcodeData) => {
      if (!barcodeData.cancelled) {
        this.value = barcodeData.text
        this.validateInput();
      }
    })
      .catch(error => {
        console.log(error); // Error message
      });
  }
  setType() {
    switch (this.type) {
      case this.TYPE_PRISE:
        this.title = "Gare de prise";
        break;
      case this.TYPE_DEPOSE:
        this.title = "Gare de dépose";
        break;
      case this.TYPE_GROUPE:
        this.title = "Groupe";
        break;
      case this.TYPE_PASSAGE:
        this.title = "Gare de passage";
        break;
      case this.TYPE_INVENTAIRE:
        this.title = "Gare à inventorier";
        break;
    }

  }
  validateInput() {
    if (this.validationInProgress) {
      return false;
    }
    this.validationInProgress = true;

    if (this.value && this.value.trim() != "") {
      let promiseEmplacement = null;
      if (this.type == this.TYPE_PRISE || this.type == this.TYPE_DEPOSE || this.type == this.TYPE_INVENTAIRE) {
        promiseEmplacement = this.checkEmplacement();
        promiseEmplacement.then((res) => {
          if (res) {
            this.loginService.getLoggedUser().then((id) => {
              this.wrkMouvementDb.addPassage(this.value, id).then(() => {
                this.sync.syncUpOneTable(this.wrkMouvementDb.getName());
              },(error)=>{
                LoggerService.error(error);
              });

            });
          }
        })

      } else {
        promiseEmplacement = Promise.resolve(true);
      }

      promiseEmplacement.then((res) => {
        if (res) {
          if (this.type == this.TYPE_PASSAGE) {
            this.navCtrl.push(PassagePage, { emplacement: this.value });
          } else if (this.type == this.TYPE_INVENTAIRE) {
            this.navCtrl.push(ColisDeposePage, { emplacement: this.value });
          } else {
            this.navCtrl.push(ColisListPage, { emplacement: this.value, type: this.type });
          }
        } else {
          this.errorScan("La gare saisie est inconnue");
        }

        this.validationInProgress = false;
      }, (error) => {
        this.validationInProgress = false;
      });
    } else {
      this.validationInProgress = false;
      if (this.type == this.TYPE_GROUPE) {
        this.errorScan("La saisie d'un groupe est obligatoire");
      } else {
        this.errorScan("La saisie d'une gare est obligatoire");
      }
    }
  }

  checkEmplacement() {
    return new Promise<boolean>((resolve, reject) => {
      if (this.gestionEmplacement) {
        this.refEmplacementDB.findBy("code_emplacement", this.value).then((emplacement) => {
          if (emplacement && emplacement.length > 0) {
            resolve(true);
          } else {
            if (this.autoCreateEmplacement) {
              let emplacement = new RefEmplacementModel();
              emplacement.code_emplacement = this.value;
              emplacement.libelle = this.value;
              emplacement.save().then(() => {
                this.sync.syncUpOneTable(this.refEmplacementDB.getName());
              });
              resolve(true);
            } else {
              resolve(false);
            }

          }
        }, (error) => resolve(false));

      } else {
        resolve(true);
      }
    });
  }

  showScan() {
    this.inputMethod = "scan";
    this.value = "";
    setTimeout(() => {
      if (this.content) {
        this.content.resize();
      }
    }, 20);
  }
  showInput() {
    this.inputMethod = "input";
    this.value = "";
    setTimeout(() => {
      if (this.content) {
        this.content.resize();
      }
    }, 20);
  }
  showList() {

    this.value = "";
    let loading = this.loadingCtrl.create({
      content: 'Chargement des emplacements'
    });
    loading.present();

    this.loadEmplacements().then(() => {
      setTimeout(() => {
        this.inputMethod = "list";
      }, this.emplacements.length / 10);
      setTimeout(() => {
        loading.dismiss();

        if (this.content) {
          this.content.resize();
        }

      }, this.emplacements.length);
    }, (error) => {
      loading.dismiss();
    });






  }
  clearSearch() {
    this.filterString = "";
  }

  selectEmplacement(emplacement: RefEmplacementModel) {
    this.value = emplacement.code_emplacement;
    this.validateInput();
  }
  errorScan(message) {
    let file = this.media.create("/android_asset/www/sound/0342.mp3");
    file.setVolume(0.8);


    // play the file
    file.play({ numberOfLoops: 1 });

    setTimeout(function () {
      // stop playing the file
      file.stop();
      file.release();
    }, 3000);

    let toast = this.toastCtrl.create({
      message: message,
      position: 'bottom',
      duration: 3000
    });
    toast.present();
  }

}
