import {Component, OnInit} from '@angular/core';

import {Events, Platform} from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import {ApiSync} from '../providers/api-sync';
import {AuthService} from '../services/auth-service';
import {AuthDb} from '../models/db/auth-db';
import {Network} from '@ionic-native/network/ngx';
import {HttpClient} from '../services/http-client';
import {SyncService} from '../services/sync-service';
import {Observable} from 'rxjs';
import 'rxjs/add/observable/interval';

export enum ConnectionStatusEnum {
  Online,
  Offline,
  BeforeSet
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public appPages = [
    {title: 'Home', url: '/home', icon: 'home'}
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public events: Events,
    public apiSync: ApiSync,
    private authService: AuthService,
    private network: Network,
    private http: HttpClient,
    private syncService: SyncService
  ) {
    this.initializeApp();
  }

  previousStatus = ConnectionStatusEnum.BeforeSet;
  periodicSync: any;

  initializeApp() {
    this.platform.ready().then(() => {
      this.initNetwork();
      this.registerEvents();
      this.statusBar.styleDefault();
      // Do the user login (fake user or previously logged in user)
      this.login().then((result) => {
        this.splashScreen.hide();
        this.setPages();
      });
    });
  }

  protected registerEvents() {
    this.events.subscribe('user:login', (userId) => {
      this.setPages();
    });
    this.events.subscribe('user:logout', () => {
      this.setPages();
    });
  }

  protected initNetwork() {
    if (this.network.type === 'none') {
      this.previousStatus = ConnectionStatusEnum.Offline;
    } else {
      this.previousStatus = ConnectionStatusEnum.Online;
    }

    this.initializeNetworkEvents();
  }

  protected initializeNetworkEvents(): void {
    this.network.onDisconnect().subscribe(() => {
      if (this.previousStatus === ConnectionStatusEnum.Online) {
        this.events.publish('network:offline');
        this.previousStatus = ConnectionStatusEnum.Offline;
        this.http.showToast('Application now offline!');
        if (this.authService.isLoggedin && this.syncService.syncMode.getValue() === 1) {
          this.apiSync.unsetSyncProgressData().then(() => {});
        }
      }
    });
    this.network.onConnect().subscribe(() => {
      if (this.previousStatus === ConnectionStatusEnum.Offline) {
        this.events.publish('network:online');
        this.previousStatus = ConnectionStatusEnum.Online;
        this.http.showToast('Application now online!');
        if (this.authService.isLoggedin && this.syncService.syncMode.getValue() === 1) {
          this.apiSync.startSync();
        }
      }
    });
  }

  protected setPages() {
    this.appPages = [{title: 'Home', url: '/home', icon: 'home'}];

    if (!this.authService.isLoggedin) {
      this.appPages.push({title: 'Login', url: '/login', icon: 'list'});
    } else {
      this.appPages.push(
          {title: 'Guides', url: '/guides', icon: 'list'},
          {title: 'Profile', url: '/profile', icon: 'person'},
          {title: 'Logout', url: '/logout', icon: 'exit'},
      );
    }
  }

  private login(): Promise<any> {
    return new Promise((resolve) => {
      // First get last successful user to log in
      this.authService.getLastUser().then((res) => {
        resolve(true);
        let lastUser: AuthDb = null;
        if (res) {
          lastUser = res;
        }
        // First create a dummy user to call the APIs while not yet authenticated.
        if (!lastUser) {
          this.authService.createDummyUser().then(() => {});
        }
      });
    });
  }

  ngOnInit(): void {
    this.syncService.syncMode.subscribe((result) => {
      console.log('syncService', result);
      if (result !== 2 && this.periodicSync) {
        this.periodicSync.unsubscribe();
        this.periodicSync = null;
      }
      if (result === 2) {
        this.periodicSync = Observable.interval(15000)
            .subscribe(() => {
              this.apiSync.runPull().then((res) => {});
            });
      }
    });
  }
}
