import { Component, ViewChild, HostListener, NgZone } from '@angular/core';

import { IonicPage, NavController, TextInput, ToastController, ViewController, Content } from 'ionic-angular';

import { Media } from '@ionic-native/media';
import { BarcodeScanner } from '@ionic-native/barcode-scanner';

import { ColisEditPage } from '../edit/colis-edit';

import { WrkMouvementDB } from '../../../providers/db/wrk-mouvement-db';
import { WrkMouvementModel } from '../../../models/wrk-mouvement-model';
import { UserDB } from '../../../providers/db/user-db';
import { UserModel } from '../../../models/user-model';

import { LoginService } from '../../../providers/login-service';
import { LoggerService } from '../../../providers/orm/logger-service';
import { SyncEventsService } from '../../../providers/orm/sync/sync-events-service';
import { ScannerService } from '../../../providers/scanner-service';
import * as moment from 'moment';

/**
 * Generated class for the ColisPage page.
 *
 * See http://ionicframework.com/docs/components/#navigation for more info
 * on Ionic pages and navigation.
 */
@IonicPage()
@Component({
  selector: 'page-colis-prise',
  templateUrl: 'colis-prise.html',
})
export class ColisPrisePage {

  private user: UserModel = null;

  private mouvementArray: WrkMouvementModel[] = [];

  private typeIcon: string = "cloud-upload";

  private wrkMouvementDB: WrkMouvementDB;

  private subscriptionColis;
  private subscriptionScanner;

  @ViewChild('search') searchInput: TextInput;
  private filterString = "";

  private scanValues = "";
  public moment = moment;
  @ViewChild(Content) content: Content;


  constructor(public navCtrl: NavController, public viewCtrl: ViewController, private loginService: LoginService, private scannerService: ScannerService, private media: Media, private toastCtrl: ToastController, private barcodeScanner: BarcodeScanner, private zone: NgZone) {
    this.wrkMouvementDB = new WrkMouvementDB();
  }

  ionViewDidLoad() {
    this.loginService.getLoggedUser().then((id) => {
      let userDb = new UserDB();
      userDb.findOne(id).then((user) => {
        this.user = user;
        this.loadMouvement();
        this.subscriptionColis = SyncEventsService.getObservableDataUpdated(this.wrkMouvementDB.getName()).subscribe((data) => {
          this.loadMouvement();
        });
      });
    });
  }

  ionViewWillUnload() {
    if (this.subscriptionColis) {
      this.subscriptionColis.unsubscribe();
    }
  }

  ionViewDidEnter() {
    setTimeout(() => {
      if (this.content) {
        this.content.resize();
      }
    }, 20);
    this.scannerService.disableKeyDown();
    this.subscriptionScanner = this.scannerService.getObservable().subscribe((barcode) => {
      LoggerService.debug("Barcode res : " + barcode);
      this.zone.run(() => {
        this.filterString = barcode;
      });
    });
  }
  ionViewWillLeave() {
    this.scannerService.enableKeyDown();
    if (this.subscriptionScanner) {
      this.subscriptionScanner.unsubscribe();
      this.subscriptionScanner = null;
    }
  }

  loadMouvement() {
    this.wrkMouvementDB.getProduitEnPrise(this.user.id).then((allColis) => {
      allColis.sort(this.sortColisPrise);
      this.zone.run(() => {
        this.mouvementArray = allColis;
      });
    }, (error) => {
      LoggerService.error(error);
    });
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


  selectMouvement(mouvement) {
    this.navCtrl.push(ColisEditPage, { type: WrkMouvementDB.TYPE_PRISE, mouvement: mouvement, readonly: true, noDelete: true });
  }

  clearSearch() {
    this.zone.run(() => {
      this.filterString = "";
    });
  }


  scan() {
    this.barcodeScanner.scan().then((barcodeData) => {
      if (!barcodeData.cancelled) {
        this.filterString = barcodeData.text;
      }
    })
      .catch(error => {
        console.log(error); // Error message
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
}