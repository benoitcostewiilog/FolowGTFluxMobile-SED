import { Component, ViewChild } from '@angular/core';
import { Platform, NavParams, ToastController } from 'ionic-angular';
import { Base64ToGallery } from '@ionic-native/base64-to-gallery';
import { SignaturePad } from 'angular2-signaturepad/signature-pad';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LoggerService } from '../../../providers/orm/logger-service';


@Component({
  selector: 'signature-zoom-component',
  templateUrl: 'signature-zoom-component.html',
})
export class SignatureZoomComponentModal {

  @ViewChild(SignaturePad) signaturePad: SignaturePad;
  private onValidate: any;
  private size = 500;
  private backgroundColor = "rgb(255,255,255)";


  public signaturePadOptions: Object = { // passed through to szimek/signature_pad constructor
    'minWidth': 2,
    'canvasWidth': 500,
    'canvasHeight': 500,
    "backgroundColor": "rgb(255,255,255)"
  };



  constructor(private platform: Platform, params: NavParams, private base64ToGallery: Base64ToGallery, private toastCtrl: ToastController, private diagnostic: Diagnostic) {
    this.onValidate = params.get('onValidate');
  }

  setSize(platform: Platform) {
    let width = platform.width();
    let height = platform.height();

    if (width > height) {
      this.size = width;
    } else {
      this.size = height;
    }

    if (this.signaturePad) {

      this.signaturePad.set("canvasWidth", this.size);
      this.signaturePad.set("canvasHeight", this.size);
      this.signaturePad.set("backgroundColor", this.backgroundColor);
      this.signaturePad.clear();

    }
  }
  ngAfterViewInit() {
    this.platform.ready().then((readySource) => {
      this.setSize(this.platform);

    });
    // this.signaturePad is now available
    this.signaturePad.set('minWidth', 2); // set szimek/signature_pad options at runtime
    this.signaturePad.set("canvasWidth", this.size);
    this.signaturePad.set("canvasHeight", this.size);
    this.signaturePad.set("backgroundColor", this.backgroundColor);
    this.signaturePad.clear(); // invoke functions from szimek/signature_pad API
  }

  validate() {
    let base64Data = this.signaturePad.toDataURL();
    this.diagnostic.requestRuntimePermissions(["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]).then(() => {
      this.saveImage(base64Data);
    });
  }

  saveImage(base64Data) {
    this.base64ToGallery.base64ToGallery(base64Data, { prefix: 'img_', mediaScanner: true }).then((path) => {
      LoggerService.info("Saved image to gallery " + path);
      this.onValidate(path);
    }, (error) => {
      let toast = this.toastCtrl.create({
        message: 'Une erreur est survenu lors de l\'enregistrement de la signature !',
        duration: 3000
      });
      toast.present();
    });
  }

  clear() {
    this.signaturePad.clear();
  }

  goBack() {
    this.onValidate(null);
  }
}