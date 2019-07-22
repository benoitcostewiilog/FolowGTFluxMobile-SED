import { Component, ViewChild, Input } from '@angular/core';
import { ModalController, TextInput } from 'ionic-angular';
import { Keyboard } from '@ionic-native/keyboard';

import * as moment from 'moment';

import { LoggerService } from '../../providers/orm/logger-service';

import { SignatureZoomComponentModal } from './zoom/signature-zoom-component'

@Component({
  selector: 'signature-component',
  templateUrl: 'signature-component.html',
})
export class SignatureComponent {


  private signature: any = {
    fileURL: "",
    date: null,
    name: "",
    mail: ""
  };

  private editSignature = true;

  @Input("serverAddress") serverAddress = "";
  @Input("editEnabled") editEnabled: boolean = true;

  @Input("showDetail") showDetail: boolean = true;

  @Input("showDetailNom") showDetailNom: boolean = true;
  @Input("showDetailEmail") showDetailEmail: boolean = true;

  @ViewChild('inputName') inputName: TextInput;
  @ViewChild('inputMail') inputMail: TextInput;

  constructor(public modalCtrl: ModalController, private keyboard: Keyboard) {

  }

  ngAfterViewInit() {

  }

  setSignature(signature: any) {
    if (signature) {
      this.signature.fileURL = signature.fileURL ? signature.fileURL : "";
      this.signature.date = signature.date ? signature.date : null;
      this.signature.name = signature.name ? signature.name : "";
      this.signature.mail = signature.mail ? signature.mail : "";
      this.signature.local = signature.local ? true : false;

      if (this.signature.fileURL == "") {
        this.editSignature = true;
      } else {
        this.editSignature = false;
      }
    }
  }
  clear() {
    this.editSignature = true;
    this.signature.fileURL = "";
    this.signature.date = null;
  }

  edit() {

    this.zoom();
  }

  getSignature(): any {

    return this.signature

  }

  zoom() {
    let modal = null;
    new Promise<any>((resolve, reject) => {
      modal = this.modalCtrl.create(SignatureZoomComponentModal, { onValidate: resolve });
      modal.present();
    }).then((path) => {
      modal.dismiss().then(() => {
        if (path) {
          setTimeout(() => {
            this.inputName.setFocus();
          }, 150);
        }
      });
      if (path) {
        LoggerService.info("Saved image to gallery " + path);
        this.signature.fileURL = "file:" + path;
        this.signature.local = true;
        this.signature.date = moment().format("YYYY-MM-DD HH:mm:ss");
        this.editSignature = false;

      }
    });

  }


  onKeyPressName(keyCode) {
    if (keyCode == 13) {
      this.inputMail.initFocus();
    }
  }
  onKeyPressMail(keyCode) {
    if (keyCode == 13) {
      this.keyboard.close();
    }
  }


}