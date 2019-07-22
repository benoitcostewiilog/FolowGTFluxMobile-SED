import { Component, ViewChild, NgZone } from '@angular/core';

import { IonicPage, Content, App, NavController, NavParams, AlertController, ToastController, TextInput, ViewController, LoadingController } from 'ionic-angular';

import { ScreenOrientation } from '@ionic-native/screen-orientation';
import { Media } from '@ionic-native/media';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';


import { ColisEditPage } from '../edit/colis-edit';
import { ColisPrisePage } from '../prise/colis-prise';


import { WrkMouvementDB } from '../../../providers/db/wrk-mouvement-db';
import { WrkMouvementModel } from '../../../models/wrk-mouvement-model';
import { UserDB } from '../../../providers/db/user-db';
import { UserModel } from '../../../models/user-model';

import { WrkGroupeDB } from '../../../providers/db/wrk-groupe-db';
import { WrkGroupeModel } from '../../../models/wrk-groupe-model';

import { WrkInventaireDB } from '../../../providers/db/wrk-inventaire-db';
import { WrkInventaireModel } from '../../../models/wrk-inventaire-model';

import { AdmParametrageDB } from '../../../providers/db/adm-parametrage-db';

import { SyncDataService } from '../../../providers/orm/sync/sync-data-service';
import { LoggerService } from '../../../providers/orm/logger-service';
import { LoginService } from '../../../providers/login-service';
import { ScannerService } from '../../../providers/scanner-service';
import { SyncEventsService } from '../../../providers/orm/sync/sync-events-service';


import * as moment from 'moment';

/**
 * Generated class for the ColisPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
  selector: 'page-colis-list',
  templateUrl: 'colis-list.html',
})
export class ColisListPage {

  private mouvementArray: any[] = [];

  private produitEnPrise: any[] = [];
  private nbProduitEnPrise = 0;
  private mouvementArrayDeleted: any[] = [];

  private user: UserModel = null;


  private title = "";
  private typeIcon: string = "";

  private type = "";
  private TYPE_PRISE = WrkMouvementDB.TYPE_PRISE;
  private TYPE_DEPOSE = WrkMouvementDB.TYPE_DEPOSE;
  private TYPE_GROUPE = WrkMouvementDB.TYPE_GROUPE;
  private TYPE_INVENTAIRE = WrkMouvementDB.TYPE_INVENTAIRE;

  private emplacement = "";

  private searchEnabled = false;

  private filterString = "";

  private barcode = "";

  private inputBarCodeHidden = false;

  public moment = moment;


  private wrkMouvementDB: WrkMouvementDB;
  private wrkGroupeDB: WrkGroupeDB;
  private wrkInventaireDB: WrkInventaireDB;
  private admParametrageDB: AdmParametrageDB;


  private readonly = false;
  private addBack = false;

  private subscriptionColis;

  private subscriptionScanner;
  private subscriptionGroupe = null;
  private subscriptionParametrage = null;

  private showColisEnPrise = true;
  private vidageUMPriseProduit = true;
  private vidageUMDeposeUM = true;
  private scanDeposeObligatoire = true;

  private deposeProduitNonPris = false;


  private validationProgress = false;


  @ViewChild('search') searchInput: TextInput;
  @ViewChild('codeBarre') codeBarreInput: TextInput;
  @ViewChild(Content) content: Content;


  constructor(public navCtrl: NavController, public navParams: NavParams, private zone: NgZone, private scannerService: ScannerService, private app: App, public viewCtrl: ViewController, public alertCtrl: AlertController, private toastCtrl: ToastController, private loginService: LoginService, private sync: SyncDataService, private screenOrientation: ScreenOrientation, private media: Media, private barcodeScanner: BarcodeScanner, private loadingCtrl: LoadingController) {
    this.type = this.navParams.get("type");
    this.emplacement = navParams.get("emplacement");
    this.readonly = navParams.get("readonly") ? true : false;
    this.addBack = navParams.get("addBack") ? true : false;

    this.wrkMouvementDB = new WrkMouvementDB();
    this.wrkGroupeDB = new WrkGroupeDB();
    this.wrkInventaireDB = new WrkInventaireDB();
    this.admParametrageDB = new AdmParametrageDB();
    this.setType();

    this.loginService.getLoggedUser().then((id) => {
      let userDb = new UserDB();
      userDb.findOne(id).then((user) => {
        this.user = user;
        this.loadEnPrise();
      });
    });
  }

  ionViewDidLoad() {
    this.loadGroupe();
    this.subscriptionGroupe = SyncEventsService.getObservableDataUpdated(this.wrkGroupeDB.getName()).subscribe((data) => {
      this.updateGroupe();
    });
    this.loadParametrage();
    this.subscriptionParametrage = SyncEventsService.getObservableDataUpdated(this.admParametrageDB.getName()).subscribe((data) => {
      this.loadParametrage();
    });


  }

  ionViewWillUnload() {
    if (this.subscriptionColis) {
      this.subscriptionColis.unsubscribe();
    }
    if (this.subscriptionGroupe) {
      this.subscriptionGroupe.unsubscribe();
    }

    if (this.subscriptionScanner) {
      this.subscriptionScanner.unsubscribe();
      this.subscriptionScanner = null;
    }
    if (this.subscriptionParametrage) {
      this.subscriptionParametrage.unsubscribe();
    }
  }

  ionViewDidEnter() {
    setTimeout(() => {
      if (this.content) {
        this.content.resize();
      }
    }, 20);

    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT_PRIMARY);
    this.scannerService.disableKeyDown();
    this.subscriptionScanner = this.scannerService.getObservable().subscribe((barcode) => {
      if (this.searchEnabled) {
        this.zone.run(() => {
          this.filterString = barcode;
        });
      } else {
        this.add(barcode); // Scanned code
      }

    });
  }
  ionViewWillLeave() {
    this.screenOrientation.unlock();
    this.scannerService.enableKeyDown();
    if (this.subscriptionScanner) {
      this.subscriptionScanner.unsubscribe();
      this.subscriptionScanner = null;
    }
  }


  loadGroupe() {
    if (this.type == this.TYPE_GROUPE) {
      this.wrkGroupeDB.findBy("libelle", this.emplacement).then((groupes) => {
        groupes.sort(this.sortColisGroupe);
        this.zone.run(() => {
          this.mouvementArray = groupes;
        });

      });
    }
  }
  loadParametrage() {
    this.admParametrageDB.isShowColisEnPrise().then((res) => {
      this.showColisEnPrise = res;
    });
    this.admParametrageDB.isVidageUMDeposeUM().then((res) => {
      this.vidageUMDeposeUM = res;
    });
    this.admParametrageDB.isVidageUMPriseProduit().then((res) => {
      this.vidageUMPriseProduit = res;
    });
    this.admParametrageDB.isScanDeposeObligatoire().then((res) => {
      this.scanDeposeObligatoire = res;
    });
    this.admParametrageDB.isDeposeProduitNonPris().then((res) => {
      this.deposeProduitNonPris = res;
    });
  }
  loadEnPrise() {
    if (this.type == this.TYPE_PRISE || this.type == this.TYPE_DEPOSE) {
      this.wrkMouvementDB.getProduitEnPrise(this.user.id).then((allColis) => {
        allColis.sort(this.sortColisPrise);
        this.zone.run(() => {
          this.produitEnPrise = allColis;
          this.calcNbProduitEnPrise();
        });

      }, (error) => {
        LoggerService.error(error);
      });

    }
  }
  setProduitEnPrise(barcode, deleted) {
    if (this.showColisEnPrise && this.type == this.TYPE_DEPOSE) {

      this.wrkGroupeDB.findBy("libelle", barcode).then((groupes) => {
        if (groupes && groupes.length > 0) {
          for (let groupe of groupes) {
            let produit = this.searchProduitEnPrise(groupe.ref_produit);
            if (produit) {
              produit.deleted = deleted;
            }
          }
          this.zone.run(() => {
            this.calcNbProduitEnPrise();
          });
        } else {
          let produit = this.searchProduitEnPrise(barcode);
          if (produit) {
            this.zone.run(() => {
              produit.deleted = deleted;
              this.calcNbProduitEnPrise();
            });
          }
        }
      });

    }
  }


  searchProduitEnPrise(barcode, includeDeleted = true) {
    for (let produit of this.produitEnPrise) {
      if (!produit.deleted || includeDeleted) {
        if (produit.ref_produit == barcode) {
          return produit
        }
        if (produit.groupe == barcode) {
          return produit;
        }
      }
    }
    return null;
  }

  calcNbProduitEnPrise() {
    let nb = 0;
    for (let produit of this.produitEnPrise) {
      if (!produit.deleted) {
        nb++;
      }
    }
    this.nbProduitEnPrise = nb;
  }
  updateGroupe() {
    if (this.type == this.TYPE_GROUPE) {
      this.wrkGroupeDB.findBy("libelle", this.emplacement).then((groupes) => {
        for (let groupe of groupes) {
          let found = false;
          for (let m of this.mouvementArray) {
            if (m.id == groupe.id) {
              found = true;
              break;
            }
          }

          for (let m of this.mouvementArrayDeleted) {
            if (m.id == groupe.id) {
              found = true;
              break;
            }
          }
          if (!found) {
            this.mouvementArray.push(groupe);
          }
        }
        let toDelete = [];
        for (let m of this.mouvementArray) {
          if (m.id) {
            let found = false;
            for (let groupe of groupes) {
              if (m.id == groupe.id) {
                found = true;
                break;
              }
            }
            if (!found) {
              toDelete.push(m);
            }
          }
        }
        for (let m of toDelete) {
          let index = this.getIndexMouvement(m);
          if (index != -1) {
            this.mouvementArray.splice(index, 1);
          }

        }
        this.zone.run(() => {
          this.mouvementArray.sort(this.sortColisGroupe);
        });
      });
    }
  }
  setType() {
    switch (this.type) {
      case "prise":
        this.title = "Gare de prise";
        this.typeIcon = "cloud-upload";
        break;
      case "depose":
        this.title = "Gare de dépose";
        this.typeIcon = "cloud-download";
        break;
      case "groupe":
        this.title = "Groupe";
        this.typeIcon = "cube";
        break;
      case "passage":
        this.title = "Gare de passage";
        this.typeIcon = "redo";
        break;
      case "inventaire":
        this.title = "Gare à inventorier";
        this.typeIcon = "barcode";
        break;
    }

  }
  sortColisGroupe(colisA: WrkGroupeModel, colisB: WrkGroupeModel) {
    if (colisA.date == colisB.date) {
      return 0;
    }
    if (!colisA.date) {
      return -1;
    }
    if (!colisB.date) {
      return 1;
    }
    let momentColisA = moment(colisA.date);
    let momentColisB = moment(colisB.date);

    if (momentColisA.isBefore(momentColisB)) {
      return 1;
    }
    if (momentColisA.isAfter(momentColisB)) {
      return -1;
    }
    return 0;
  }
  sortColisPrise(colisA: WrkMouvementModel, colisB: WrkMouvementModel) {
    let momentColisA = moment(colisA.heure_prise);
    let momentColisB = moment(colisB.heure_prise);

    if (momentColisA.isBefore(momentColisB)) {
      return 1;
    }
    if (momentColisA.isAfter(momentColisB)) {
      return -1;
    }
    return 0;
  }


  selectMouvement(mouvement, readonly) {

    new Promise<any>((resolve, reject) => {
      this.navCtrl.push(ColisEditPage, { type: this.type, mouvement: mouvement, readonly: (this.readonly || readonly), callback: resolve });
    }).then((data) => {
      if (data == "delete") {
        this.deleteMouvement(mouvement);
      }
    });
  }

  deleteMouvement(mouvement: any) {
    let index = this.getIndexMouvement(mouvement);
    if (index != -1) {
      this.zone.run(() => {
        this.mouvementArray.splice(index, 1);
        if (mouvement.id) {
          this.mouvementArrayDeleted.push(mouvement);
        }
      });
      this.setProduitEnPrise(mouvement.ref_produit, false);
    }
  }

  getIndexMouvement(mouvement: WrkMouvementModel) {
    let index = -1;
    let i = 0;
    for (let m of this.mouvementArray) {
      if (m.ref_produit == mouvement.ref_produit) {
        index = i;
        break;
      }
      i++;
    }

    return index;
  }




  scan() {
    this.barcodeScanner.scan().then((barcodeData) => {
      if (!barcodeData.cancelled) {
        this.add(barcodeData.text); // Scanned code
      }
    })
      .catch(error => {
        console.log(error); // Error message
      });
  }
  submitCB() {
    this.add(this.barcode);
    this.barcode = "";
  }

  add(barcode) {
    if (barcode && barcode.trim() != "") {
      let mouvement = null;
      if (this.type == this.TYPE_DEPOSE || this.type == this.TYPE_PRISE) {
        mouvement = new WrkMouvementModel();
        mouvement.ref_produit = barcode;
        mouvement.code_emplacement = this.emplacement;
        mouvement.type = this.type;
        mouvement.heure_prise = moment().format();
        mouvement.id_utilisateur = this.user.id;
        mouvement.quantite = 1;
        mouvement["vidage"] = true;
      } else if (this.type == this.TYPE_GROUPE) {
        mouvement = new WrkGroupeModel();
        mouvement.ref_produit = barcode;
        mouvement.date = moment().format();
        mouvement.id_utilisateur = this.user.id;
        mouvement.libelle = this.emplacement;
        mouvement.quantite = 1;
      } else if (this.type == this.TYPE_INVENTAIRE) {
        mouvement = new WrkInventaireModel();
        mouvement.ref_produit = barcode;
        mouvement.heure_prise = moment().format();
        mouvement.id_utilisateur = this.user.id;
        mouvement.code_emplacement = this.emplacement;
        mouvement.quantite = 1;
      }


      let index = this.getIndexMouvement(mouvement);
      if (index == -1) {
        if (mouvement.ref_produit == this.emplacement) {
          if (this.type == this.TYPE_GROUPE) {
            this.errorScan("Le code du groupe ne peut pas être scanné");
          } else {
            this.errorScan("Le code emplacement ne peut pas être scanné");
          }
        } else {
          if (this.type == this.TYPE_PRISE && this.searchProduitEnPrise(mouvement.ref_produit)) {
            this.errorScan("Le produit est déja en prise");
          } else {
            if (!this.deposeProduitNonPris && this.type == this.TYPE_DEPOSE && !this.searchProduitEnPrise(mouvement.ref_produit, false)) {
              this.errorScan("Le produit n'est pas en prise");
            } else {
              this.searchGroupe(mouvement);
              this.zone.run(() => {
                this.mouvementArray.unshift(mouvement);
              });
              this.setProduitEnPrise(barcode, true);
            }
          }
        }
      } else {
        let mouvement = this.mouvementArray[index];
        let confirm = this.alertCtrl.create({
          title: "Augmenter la quantité",
          message: "Augmenter la quantité du produit " + mouvement.ref_produit + " de :",
          inputs: [
            {
              name: 'qte',
              type: "number",
              value: "1",
              placeholder: "1"
            },
          ],
          buttons: [
            {
              text: 'Annuler',
              handler: () => {

              }
            },
            {
              text: 'Valider',
              handler: data => {
                let qte = parseInt(data.qte);
                if (qte <= 0 || isNaN(qte) || qte > 1000000000) {
                  qte = 1;
                }
                mouvement.quantite += qte;
              }
            }
          ]
        });
        confirm.present();
        this.scannerService.enableKeyDown();
        confirm.onDidDismiss(() => this.scannerService.disableKeyDown());
      }
    } else {
      this.errorScan("La saisie d'un produit est obligatoire");
    }

  }


  changeSearchMode() {
    this.zone.run(() => {
      this.searchEnabled = !this.searchEnabled;
      this.filterString = "";
      if (this.searchEnabled) {
        this.inputBarCodeHidden = true;
      } else {
        this.inputBarCodeHidden = false;
      }
    });

  }

  clearSearch() {
    this.filterString = "";
  }

  deleteAll() {
    let title = "";
    let message = "";
    if (this.type == this.TYPE_GROUPE) {
      title = "Retirer tous les produits ?";
      message = "Voulez vous vraiment retirer tous les produits du groupe ?";
    } else {
      title = "Supprimer tous les mouvements ?";
      message = "Voulez vous vraiment supprimer tous les mouvements ?";
    }
    let confirm = this.alertCtrl.create({
      title: title,
      message: message,
      buttons: [
        {
          text: 'NON',
          handler: () => {

          }
        },
        {
          text: 'OUI',
          handler: () => {
            for (let mouvement of this.mouvementArray) {
              if (mouvement.id) {
                this.mouvementArrayDeleted.push(mouvement);
              }
            }
            this.zone.run(() => {
              this.mouvementArray = [];
            });

          }
        }
      ]
    });
    confirm.present();
  }



  validate() {

    if (this.validationProgress) {
      return false
    }
    this.validationProgress = true;

    let loader = this.loadingCtrl.create({
      content: "Enregistrement en cours",
      dismissOnPageChange: true,
      enableBackdropDismiss: true
    });
    loader.present();
    let mouvementArrayToSave = [];
    let promises = [];
    if (this.type == this.TYPE_DEPOSE || this.type == this.TYPE_PRISE) { //gestion des groupes
      for (let m of this.mouvementArray) {
        let promise = new Promise<any>((resolve, reject) => {
          this.wrkGroupeDB.findBy("libelle", m.ref_produit).then((groupes) => {
            if (groupes && groupes.length > 0) {
              for (let groupe of groupes) {
                let mouvement = new WrkMouvementModel();
                mouvement.ref_produit = groupe.ref_produit;
                mouvement.code_emplacement = m.code_emplacement;
                mouvement.type = m.type;
                mouvement.heure_prise = m.heure_prise;
                mouvement.id_utilisateur = m.id_utilisateur;
                mouvement.commentaire = m.commentaire;
                mouvement.groupe = m.ref_produit;
                mouvement.quantite = m.quantite;
                mouvement.signature = m.signature;
                mouvement.photos = m.photos;
                mouvement["vidage"] = m.vidage;
                mouvementArrayToSave.push(mouvement);
              }
            } else {
              mouvementArrayToSave.push(m);
            }
            resolve();
          })
        });
        promises.push(promise);

      }
    } else {
      mouvementArrayToSave = this.mouvementArray;
    }

    let dateHeure = moment().format();
    Promise.all(promises).then(() => {
      promises = [];
      let mouvementArrayInsert = [];
      for (let m of mouvementArrayToSave) {
        if (this.type == this.TYPE_INVENTAIRE) { //les mouvement d'un inventaire doivent avoir la meme date date/heure
          m.heure_prise = dateHeure;
        }
        if (m.id != undefined) {  //les update sont effectué directement
          let promise = m.save();
          promises.push(promise);
        } else { //stockage des insert dans un tableau pour insertion batch
          mouvementArrayInsert.push(m);
        }
      }

      //insert batch pour optimiser les perf
      if (mouvementArrayInsert && mouvementArrayInsert.length > 0) {
        let promise = mouvementArrayInsert[0].db.insertBatch(mouvementArrayInsert);
        promises.push(promise);
      }

      for (let m of this.mouvementArrayDeleted) {
        let promise = m.destroy();
        promises.push(promise);
      }

      if (this.type == this.TYPE_DEPOSE) { //Vidage des UM lors de la dépose
        for (let m of mouvementArrayToSave) {
          if (m.vidage) {
            promises.push(this.wrkGroupeDB.destroyBy("ref_produit", m.ref_produit))
          }
        }
      }

      if (this.vidageUMPriseProduit) {
        if (this.type == this.TYPE_PRISE) { //Vidage des UM lors de la prise d'un colis de l'UM
          for (let m of mouvementArrayToSave) {
            if (!m.groupe) {
              promises.push(this.wrkGroupeDB.destroyBy("ref_produit", m.ref_produit));
            }
          }
        }
      }

      Promise.all(promises).then(() => {
        this.sync.syncUpOneTable(this.wrkMouvementDB.getName());
        this.sync.syncUpOneTable(this.wrkGroupeDB.getName());
        this.sync.syncUpOneTable(this.wrkInventaireDB.getName());
        loader.dismiss();
        let toast = this.toastCtrl.create({
          message: "Mouvements enregistrés !",
          position: 'bottom',
          duration: 2000,
          dismissOnPageChange: false
        });
        toast.present();
        this.navCtrl.pop();
      }, (error) => {
        this.validationProgress = false;
        let toast = this.toastCtrl.create({
          message: 'Une erreur est survenu lors de l\'enregistrement des mouvements',
          duration: 3000
        });
        toast.present();
      })
    }, (error) => {
      this.validationProgress = false;
      loader.dismiss().catch((error) => { LoggerService.error(error) });;
      let toast = this.toastCtrl.create({
        message: 'Une erreur est survenu lors de l\'enregistrement des mouvements',
        duration: 3000
      });
      toast.present();
    });




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

  goBack() {
    this.app.navPop();
  }

  afficherEcranEnPrise() {
    this.navCtrl.push(ColisPrisePage, {});
  }

  searchGroupe(mouvement) {
    this.wrkGroupeDB.findBy("libelle", mouvement.ref_produit).then((groupes) => {
      if (groupes && groupes.length > 0) {
        this.zone.run(() => {
          mouvement.quantiteGroupe = groupes.length;
          mouvement.groupe = true;
          mouvement["vidage"] = this.vidageUMDeposeUM;
        });
      }
    });

  }
}