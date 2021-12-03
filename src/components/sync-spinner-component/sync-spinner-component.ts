import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { ApiSync } from '../../providers/api-sync';
import { Network } from '@ionic-native/network/ngx';
import { SyncModalComponent } from '../sync-modal-component/sync-modal-component';
import { debounceTime } from 'rxjs/operators';
import { UserDb } from '../../models/db/user-db';
import { AppSetting } from '../../services/app-setting';
import { MiscService } from '../../services/misc-service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sync-spinner-component',
    templateUrl: 'sync-spinner-component.html',
})
export class SyncSpinnerComponent implements OnInit {
    @Input() shouldOpenPopup = true;

    public userDb: UserDb;
    public isStartSync = false;
    public isNetwork = false;
    public iconStatus: string = 'unsynced';
    public isAvailableForSyncData: boolean = false;
    public isAvailableForPushData: boolean = false;
    public isLoggedUser: boolean = false;
    eventSubscription: Subscription;

    constructor(
        private apiSync: ApiSync,
        private modalController: ModalController,
        private changeDetectorRef: ChangeDetectorRef,
        private network: Network,
        public appSetting: AppSetting,
        private miscService: MiscService,

    ) {
        this.isNetwork = (this.network.type !== 'none');
    }

    detectChanges() {
        if (!this.changeDetectorRef['destroyed']) {
            this.changeDetectorRef.detectChanges();
        }
    }

    async openSyncModal() {
        if (!this.shouldOpenPopup) {
            return false;
        }
        const modal = await this.modalController.create({
            component: SyncModalComponent,
            cssClass: "modal-fullscreen"
        });
        return await modal.present();
    }

    protected initUserDB() {
        if (this.userDb) {
            return new Promise(resolve => {
                resolve(true);
            });
        }

        return new Promise(resolve => {
            new UserDb().getCurrent().then((userDb) => {
                if (userDb) {
                    this.userDb = userDb;

                    resolve(true);
                }

                resolve(false);
            });
        });
    }

    ngOnInit() {
        this.initUserDB().then((isLogged) => {
            if (isLogged) {
                this.isLoggedUser = true;
                this.detectChanges();
            }
        });
        this.apiSync.isStartSyncBehaviorSubject.subscribe(isSync => {
            this.isStartSync = isSync;
            this.detectChanges();
        });
        // this.events.subscribe('user:login', (isNetwork) => {
        //     this.isLoggedUser = true;
        //     this.detectChanges();
        // });
        // this.events.subscribe('user:logout', (isNetwork) => {
        //     this.isLoggedUser = false;
        //     this.detectChanges();
        // });
        // this.events.subscribe('network:offline', (isNetwork) => {
        //     this.isNetwork = false;
        //     this.detectChanges();
        // });
        // this.events.subscribe('network:online', (isNetwork) => {
        //     this.isNetwork = true;
        //     this.detectChanges();
        // });

        this.eventSubscription = this.miscService.events.subscribe(async (event) => {
            switch (event.TAG) {
                case 'user:login':
                    this.isLoggedUser = true;
                    this.detectChanges();
                    break;
                case 'user:logout':
                    this.isLoggedUser = false;
                    this.detectChanges();
                    break;
                case 'network:offline':
                    this.isNetwork = false;
                    this.detectChanges();
                    break;
                case 'network:online':
                    this.isNetwork = true;
                    this.detectChanges();
                    break;
                default:
            }
        });

        this.apiSync.isAvailableForSyncData.subscribe(isAvailableForSyncData => {
            this.isAvailableForSyncData = isAvailableForSyncData;
        });
        this.apiSync.isAvailableForPushData.subscribe(isAvailableForPushData => {
            this.isAvailableForPushData = isAvailableForPushData;
        });

        this.apiSync.syncProgressStatus
            .pipe(debounceTime(500))
            .subscribe(syncProgressStatus => {
                switch (syncProgressStatus) {
                    case ('initial'):
                        this.iconStatus = 'unsynced';
                        break;
                    case ('success'):
                        this.iconStatus = 'synced';
                        break;
                    case ('resume'):
                    case ('progress'):
                        this.iconStatus = 'progress';
                        break;
                    case ('pause'):
                        this.iconStatus = 'pause';
                        break;
                    case ('failed'):
                        this.iconStatus = 'failed';
                        break;
                    default:
                        this.iconStatus = null;
                }
                this.detectChanges();
            });
    }
}
