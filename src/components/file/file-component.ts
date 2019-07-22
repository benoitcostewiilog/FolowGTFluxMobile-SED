import { Component, Input, Output, EventEmitter, NgZone, ElementRef, ViewChild } from '@angular/core';
import { Platform, ActionSheetController, AlertController } from 'ionic-angular';
import { Camera, CameraOptions } from '@ionic-native/camera';
import { PhotoViewer } from '@ionic-native/photo-viewer';

import * as moment from 'moment';
import { LoggerService } from '../../providers/orm/logger-service';


@Component({
  selector: 'file-component',
  templateUrl: 'file-component.html',
})
export class FileComponent {

  @Input("files") files: any[] = [];
  @Input("editEnabled") editEnabled: boolean = true;
  @Input("showTitle") showTitle: boolean = true;
  @Input("type") type: string = "file"; //file or picture
  @Input("maxFile") maxFile: number = 3;
  @Input("nbFileRow") nbFileRow: number = 3;
  @Input("blankAddFile") blankAddFile: boolean = false;
  @Input("serverAddress") serverAddress = "";
  @Output() eventFileAdded = new EventEmitter<any>();
  @Output() eventFileChanged = new EventEmitter<any>();

  @ViewChild('fileGrid') grid: ElementRef;

  private addedFiles: any[] = [];
  private deletedFiles: any[] = [];
  private updatedFiles: any[] = [];

  public textNoFile = "";

  public titleEditFile = "";
  public titleDeleteFile = "";
  public textDeleteFile = "";

  public titleEditFilename = "";
  public textEditFilename = "";


  public defaultTitleFile = "";


  gridWidth = 0;

  constructor(public platform: Platform, private actionSheetCtrl: ActionSheetController, public alertCtrl: AlertController, private zone: NgZone, private camera: Camera, private photoViewer: PhotoViewer) {

  }

  ngAfterViewInit() {
    this.updateText();
    this.gridWidth = this.grid.nativeElement.offsetWidth;

  }

  onResize(event) {
    this.zone.run(() => {
      this.gridWidth = this.grid.nativeElement.offsetWidth;
      setTimeout(() => { this.gridWidth = this.grid.nativeElement.offsetWidth; }, 500);
      setTimeout(() => { this.gridWidth = this.grid.nativeElement.offsetWidth; }, 1000); //on essaye apres 1 seconde pour etre sur que offsetWidth est mise à jour

    });
  }

  updateFiles(files: any[]) {
    for (let i = 0; i < this.files.length; i++) {
      let found = false;
      let currentFile = this.files[i];
      for (let j = 0; j < files.length; j++) {

        let file = files[j];
        if (currentFile.id && currentFile.id == file.id) {
          if (this.updatedFiles.indexOf(file.id) == -1) {
            this.files[i] = file;
          }
          files.splice(j, 1);
          found = true;
          break;
        }
      }
      if (!found && !currentFile.local) { //deleted
        if (this.addedFiles.indexOf(currentFile.id) == -1) {
          this.files.splice(i, 1);
          i--;
        }

      }

    }

    for (let file of files) {
      if (this.deletedFiles.indexOf(file.id) == -1) {
        this.files.push(file);
      }
    }


  }

  getFiles() {
    return this.files;
  }

  fileClick(index) {
    if (index == -1 || this.files.length <= index) {
      if (this.editEnabled) {
        this.takeFileFromCamera(this.files.length);
      }
    } else {
      this.editFile(index);
    }
  }

  editFile(index) {
    let parent = this;

    let buttons = [];
    buttons.push({
      text: 'Afficher',
      icon: !parent.platform.is('ios') ? 'eye' : null,
      handler: () => {
        parent.showFile(index);
      }
    });
    if (this.editEnabled) {
      buttons.push({
        text: 'Supprimer',
        role: 'destructive',
        icon: !parent.platform.is('ios') ? 'trash' : null,
        handler: () => {
          parent.deleteFile(index);
        }
      });
      if (this.showTitle) {
        buttons.push({
          text: 'Modifier le titre',
          icon: !parent.platform.is('ios') ? 'create' : null,
          handler: () => {
            parent.editFileName(index)
          }
        });
      }
    }
    buttons.push({
      text: 'Annuler',
      role: 'cancel',
      icon: !parent.platform.is('ios') ? 'close' : null,
      handler: () => {
      }
    });


    let actionSheet = parent.actionSheetCtrl.create({
      title: this.titleEditFile,
      buttons: buttons,
      enableBackdropDismiss: true
    });
    actionSheet.present();
  }

  deleteFile(index) {
    let alert = this.alertCtrl.create({
      title: this.titleDeleteFile,
      message: this.textDeleteFile,
      buttons: [
        {
          text: 'Annuler',
          handler: () => {

          }
        },
        {
          text: 'Supprimer',
          handler: data => {
            this.deletedFiles.push(this.files[index].id);
            this.files.splice(index, 1);
            this.eventFileChanged.emit();
          }
        }
      ]
    });
    alert.present();

  }
  editFileName(index) {
    let currentName = this.files[index].name ? this.files[index].name : "";
    let prompt = this.alertCtrl.create({
      title: this.titleEditFilename,
      message: this.textEditFilename,
      inputs: [
        {
          name: 'title',
          placeholder: this.titleEditFilename,
          value: currentName
        },
      ],
      buttons: [
        {
          text: 'Annuler',
          handler: data => {

          }
        },
        {
          text: 'Valider',
          handler: data => {
            this.updatedFiles.push(this.files[index].id);
            this.files[index].name = data.title;
            this.eventFileChanged.emit();
          }
        }
      ]
    });
    prompt.present();
  }


  takeFileFromGallery(index): boolean {
    return this.takeFileFromCamera(index, true);
  }

  takeFileFromExplorer(index): boolean {
    if (index == undefined || index == null || index < 0) {
      index = this.files.length;
    }

    if (!this.canTakeNewFile() || index >= this.maxFile) {
      return false;
    }
  }

  takeFileFromCamera(index, gallery = false): boolean {
    if (index == undefined || index == null || index < 0) {
      index = this.files.length;
    }

    if (!this.canTakeNewFile() || index >= this.maxFile) {
      return false;
    }

    let options = this.getCameraOptions(gallery);

    this.camera.getPicture(options).then((imageData) => {
      // imageData is either a base64 encoded string or a file URI
      let fileURL = imageData;



      if (index >= this.files.length) {
        this.files.push({});
        index = this.files.length - 1;
      }

      fileURL = fileURL.split('?').shift();
      let filename = gallery ? fileURL.split('/').pop() : (this.defaultTitleFile + (index + 1));

      this.files[index].id = moment().format("YYYYMMDDHHmmssSSS");
      this.files[index].fileURL = fileURL;
      this.files[index].date = moment().format("YYYY-MM-DD HH:mm:ss");
      this.files[index].name = filename;
      this.files[index].local = true;
      this.addedFiles.push(this.files[index].id);
      this.eventFileAdded.emit(this.files[index]);
      this.eventFileChanged.emit();

    }, (err) => {
      LoggerService.error(err);
    });

    return true;
  }

  showFile(index) {
    let url: string = this.files[index].fileURL;

    if (!this.files[index].local) {
      url = this.serverAddress + this.files[index].fileURL;
    }
    if (this.isImage(url)) {
      this.photoViewer.show(url, 'Photo ' + (index + 1), { share: false });
    } else {
      window.open(url);
    }
  }

  isImage(url) {
    if (!url) {
      return false;
    }
    return url.match(/.(jpg|jpeg|png|gif)/i)
  }

  getFileImageUrl(url: string) {
    let urlImage = "img/icon_file_other.png";

    if (url.endsWith(".pdf")) {
      urlImage = "img/icon_file_pdf.png";
    } else if (url.endsWith(".doc") || url.endsWith(".docx")) {
      urlImage = "img/icon_file_word.png";
    } else if (url.endsWith(".csv")) {
      urlImage = "img/icon_file_csv.png";
    } else if (url.endsWith(".xls") || url.endsWith(".xlsx")) {
      urlImage = "img/icon_file_excel.png";
    } else if (url.endsWith(".txt")) {
      urlImage = "img/icon_file_text.png";
    }

    return urlImage;
  }

  canTakeNewFile() {
    if (this.files.length >= this.maxFile) {
      return false;
    }
    return true;
  }


  get getColHeight() {
    let value = Math.ceil(((this.gridWidth - (30 * this.nbFileRow)) / this.nbFileRow) * 1.2);
    return value;
  }


  getCameraOptions(gallery: boolean): CameraOptions {
    switch (this.type) {
      case "picture":
        return {
          quality: 70,
          sourceType: gallery ? this.camera.PictureSourceType.PHOTOLIBRARY : this.camera.PictureSourceType.CAMERA,
          destinationType: this.camera.DestinationType.FILE_URI,
          targetHeight: 700,
          targetWidth: 700
        };
      default:
        return {
          quality: 100,
          sourceType: gallery ? this.camera.PictureSourceType.PHOTOLIBRARY : this.camera.PictureSourceType.CAMERA,
          destinationType: this.camera.DestinationType.FILE_URI,
          mediaType: this.camera.MediaType.ALLMEDIA
        };
    }
  }
  updateText() {
    switch (this.type) {
      case "picture":
        this.textNoFile = "Aucune photo";

        this.titleEditFile = "Modification de la photo";

        this.titleDeleteFile = "Suppression d'une photo";
        this.textDeleteFile = "Voulez-vous vraiment supprimer cette photo ?";

        this.titleEditFilename = "Titre de la photo";
        this.textEditFilename = "Saisir le titre de la photo";
        this.defaultTitleFile = "Photo N°";
        break;
      default:
        this.textNoFile = "Aucun fichier";

        this.titleEditFile = "Modification du fichier";

        this.titleDeleteFile = "Suppression du fichier";
        this.textDeleteFile = "Voulez-vous vraiment supprimer ce fichier ?";

        this.titleEditFilename = "Titre du fichier";
        this.textEditFilename = "Saisir le titre du fichier";

        this.defaultTitleFile = "Document N°";
    }
  }

}
