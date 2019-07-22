import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, App, MenuController, ToastController } from 'ionic-angular';

import { SyncEventsService } from '../../../../providers/orm/sync/sync-events-service';
import { SyncDataService } from '../../../../providers/orm/sync/sync-data-service';
import { LoginService } from '../../../../providers/login-service';
import { SignatureComponent } from '../../../../components/signature/signature-component';


/*
  Generated class for the Tournee page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-tournee-signature',
  templateUrl: 'colis-edit-signature.html'
})
export class ColisEditSignaturePage {

  @ViewChild(SignatureComponent)
  public signatureCmp: SignatureComponent;

  public serverAddress = "";

  private onSavedCB;
  private isSignatureAvailable = false;

  private signature = null;

  constructor(public navCtrl: NavController, public navParams: NavParams, private app: App, private loginService: LoginService, private sync: SyncDataService, private menu: MenuController, private toastCtrl: ToastController) {
    this.signature = navParams.get("signature");
    this.isSignatureAvailable = navParams.get("readonly") ? false : true;
    this.onSavedCB = navParams.get("onSavedCB");


    this.serverAddress = SyncDataService.getServerURL();

  }

  ionViewDidEnter() {
    this.menu.swipeEnable(false);

  }

  ionViewWillLeave() {

    this.menu.swipeEnable(true);
  }

  ionViewDidLoad() {

    if (this.signature) {
      this.signatureCmp.setSignature(this.signature);
    } else if (this.isSignatureAvailable) {
      this.signatureCmp.zoom();
    }

  }

  saveSignature() {
    let signature = this.signatureCmp.getSignature();
    if (!signature || signature.name == null || signature.name == "") {
      let toast = this.toastCtrl.create({
        message: 'Veuillez saisir le nom du signataire',
        duration: 3000
      });
      toast.present();
    } else {
      if (this.onSavedCB) {
        this.onSavedCB(signature);
      }
      this.app.navPop();
    }
  }

  clear() {
    this.signatureCmp.clear();
  }

  goBack() {
    this.app.navPop();
  }


}
