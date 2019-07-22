import { Component, ViewChild } from '@angular/core';
import { Platform, MenuController, Nav, ToastController, AlertController, Events, App, IonicApp } from 'ionic-angular';
import { MainPage } from '../main/main';
import { LoginService } from '../../providers/login-service';

import { ParametrePage } from '../parametre/parametre';
import { AboutPage } from '../about/about';
import { EmplacementPage } from '../emplacement/emplacement';
import { ColisPrisePage } from '../colis/prise/colis-prise';


import { UserDB } from '../../providers/db/user-db';


import { LoggerService } from '../../providers/orm/logger-service';
import { SyncDataService } from '../../providers/orm/sync/sync-data-service';

import { SyncEventsService } from '../../providers/orm/sync/sync-events-service';
/*
  Generated class for the TabPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  templateUrl: 'tab.html',
})
export class TabPage {
  @ViewChild(Nav) nav: Nav;

  // make HelloIonicPage the root (or first) page
  rootPage: any = MainPage;
  pages: Array<{ title: string, component: any, params: any, icon: string }>;

  private backButtonUnregisterCB;

  private confirmGeolocation = null;

  private watchLocationModeSubscription = null;

  public menuEnabled = false;



  constructor(private platform: Platform, private app: App, private ionicApp: IonicApp,
    private menu: MenuController, private loginService: LoginService, private events: Events, private sync: SyncDataService, private toastCtrl: ToastController, private alertCtrl: AlertController) {

    this.createMenu();
    this.enableMenu();

    let ready = true;
    this.backButtonUnregisterCB = this.platform.registerBackButtonAction(() => {
      let activePortal = this.ionicApp._loadingPortal.getActive() ||
        this.ionicApp._modalPortal.getActive() ||
        this.ionicApp._toastPortal.getActive() ||
        this.ionicApp._overlayPortal.getActive();

      if (menu.isOpen()) {
        menu.close();
        return;
      }

      if (activePortal && (activePortal.data.enableBackdropDismiss == true || activePortal.data.enableBackdropDismiss == undefined)) {//si l'alert est une demande de transport ou une alert geolocalisation on ne peut pas la fermer avec le bouton retour
        ready = false;

        activePortal.dismiss().then(() => { }, (error) => { });
        activePortal.onDidDismiss(() => { ready = true; });
        return;
      }

      if (!this.nav.canGoBack()) {
        this.nav.setRoot(MainPage);
        return;
      }
      this.app.navPop();

    }, 500);

    let parent = this;

    events.subscribe('menu:enable', (data) => {
      parent.enableMenu();
    });

    events.subscribe('menu:disable', (data) => {
      parent.disableMenu();
    });

  }
  ionViewWillLeave() {

    this.backButtonUnregisterCB();

  }
  ionViewWillUnload() {

  }


  enableMenu() {
    this.menuEnabled = true;
  }
  disableMenu() {
    this.menuEnabled = false;
  }

  createMenu() {
    this.pages = [
      { title: 'Prise', component: EmplacementPage, params: { type: "prise" }, icon: "cloud-upload" },
      { title: 'Dépose', component: EmplacementPage, params: { type: "depose" }, icon: "cloud-download" },
      { title: 'Passage', component: EmplacementPage, params: { type: "passage" }, icon: "redo" },
      { title: 'Groupe', component: EmplacementPage, params: { type: "groupe" }, icon: "cube" },
      { title: 'Inventaire', component: EmplacementPage, params: { type: "inventaire" }, icon: "barcode" },
      { title: 'Produit en prise', component: ColisPrisePage, params: {}, icon: "cloud-upload" }
    ];
  }


  openPage(page) {
    // close the menu when clicking a link from the menu
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(page.component, page.params);

  }

  goToHomePage() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(MainPage);
  }
  goToParametre() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(ParametrePage, { showMenuButton: true });
  }

  goToAbout() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

  goToPrise() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

  goToDepose() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

  goToPassage() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

  goToGroupe() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

  goToInventaire() {
    this.menu.close();

    // navigate to the new page if it is not the current page
    this.nav.setRoot(AboutPage);
  }

}
