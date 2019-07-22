import { Component, ViewChild, NgZone } from '@angular/core';
import { Platform, Events, LoadingController, Loading, Content } from 'ionic-angular';
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import { AppVersion } from '@ionic-native/app-version';

import { Storage } from '@ionic/storage';

import { LoginPage } from '../pages/login/login';
import { TabPage } from '../pages/tab/tab';
import { SyncDataService } from '../providers/orm/sync/sync-data-service'
import { LoginService } from '../providers/login-service';

import { NetworkService } from '../providers/network-service';

import { UpdateService } from '../providers/update-service';
import { LoggerService } from '../providers/orm/logger-service';
import { Http } from '@angular/http';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  rootPage = null;
  private loginService: LoginService
  @ViewChild(Content) content: Content;


  constructor(private platform: Platform, private http: Http, private zone: NgZone, private storage: Storage, private splashScreen: SplashScreen, private statusBar: StatusBar, private appVersion: AppVersion, private events: Events, private updateService: UpdateService, private loadingCtrl: LoadingController, private networkService: NetworkService) {
    this.events.subscribe('user:login', (data) => {
      this.zone.run(() => {
        this.rootPage = TabPage;
      });

    });

    this.events.subscribe('user:logout', (data) => {
      this.zone.run(() => {
        this.rootPage = LoginPage;
      });
    });

    this.initializeApp();

  }


  initializeApp() {
    this.platform.ready().then(() => {
      this.networkService.checkNetwork();
      this.splashScreen.hide();
     

      this.statusBar.backgroundColorByHexString("#00347A");

      this.checkUpdate().then((updated) => {
        if (!updated) {
          this.loginService = new LoginService(this.http, this.storage);
          let syncDataService = new SyncDataService(this.http, this.storage, this.networkService);
          syncDataService.init().then(() => {
           
            this.checkLogin();
          }, (error) => {
            LoggerService.error(error);
          });
        }
      });
    });
  }

  checkUpdate() {
    return new Promise<boolean>((resolve, reject) => {
      this.updateService.checkVersion().then((update) => {
        if (update) {
          let loading = this.presentLoadingUpdate();
          this.updateService.updateApp().then(() => {
            let loginService = new LoginService(this.http, this.storage);
            loginService.logout().then(() => {
              this.dismissLoadingUpdate(loading, true);
              resolve(true);
              document.location.href = 'index.html';
            }).catch((error) => {
              this.dismissLoadingUpdate(loading, false);
              LoggerService.error(error);
              resolve(false);
            });
          }, (error) => {
            this.dismissLoadingUpdate(loading, false);
            LoggerService.error(error);
            resolve(false);
          });

        } else {
          resolve(false);
        }

      }).catch((error) => {
        LoggerService.error(error);
        resolve(false);
      });
    });
  }

  checkLogin() {
    this.loginService.logout().then(() => { //pas de maintien de la connexion à la fermeture de l'app GT
      this.loginService.isLogged().then((value) => {
        if (value == false || value == "false" || value == null) {
          this.rootPage = LoginPage;
        } else {
          this.rootPage = TabPage;
        }
      }, (error) => {
        this.rootPage = LoginPage;
      });
    }, (error) => {
      this.rootPage = LoginPage;
    });
  }

  presentLoadingUpdate(): Loading {
    let loading = this.loadingCtrl.create({
      content: "Mise à jour de l'application...",
      dismissOnPageChange: true,
      showBackdrop: true
    });
    loading.present();

    return loading;
  }

  dismissLoadingUpdate(loading: Loading, success: boolean) {
    if (loading) {
      if (success) {
        loading.dismiss();
      } else {
        loading.setContent("Une erreur est survenu lorsde la mise à jour de l'application");
        loading.setDuration(2000);
      }
    }
  }
}
