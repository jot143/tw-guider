import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import {HttpClient} from '../services/http-client';
import {AppSetting} from '../services/app-setting';
import {UserDb} from '../models/db/user-db';
import {DbProvider} from './db-provider';
import {Platform, Events} from '@ionic/angular';
import {BehaviorSubject} from 'rxjs';
import {ApiService} from './api/base/api-service';

import {GuiderService} from './api/guider-service';
import {DownloadService} from '../services/download-service';
import 'rxjs/add/observable/forkJoin';
import {GuideCategoryService} from './api/guide-category-service';
import {GuideCategoryBindingService} from './api/guide-category-binding-service';
import {GuideStepService} from './api/guide-step-service';
import {Network} from '@ionic-native/network/ngx';
import {GuideAssetService} from './api/guide-asset-service';
import {GuideAssetPivotService} from './api/guide-asset-pivot-service';
import {FeedbackService} from './api/feedback-service';
import {UserService} from '../services/user-service';
import {ProtocolTemplateService} from './api/protocol-template-service';
import {DbApiModel} from '../models/base/db-api-model';
import {ProtocolService} from './api/protocol-service';
import {ProtocolDefaultService} from './api/protocol-default-service';
import {WorkflowService} from './api/workflow-service';
import {WorkflowStepService} from './api/workflow-step-service';

@Injectable()
/**
 * This Service provides a sync of all registered API Services under apiService.
 * Make sure to add this Instance to the constructor of your page, that should first call this ApiSync.
 */
export class ApiSync {
    private isBusy: boolean = false;
    public syncData: any;

    userDb: UserDb;

    /**
     * Contains all services to sync.
     * Use for each service a key that matches the received key from the API in 'models'.
     * @type {{reason: ReasonService}}
     */
    apiServices: any = {
        guide: this.guideService,
        guide_category: this.guideCategoryService,
        guide_category_binding: this.guideCategoryBindingService,
        guide_step: this.guideStepService,
        guide_asset: this.guideAssetService,
        guide_asset_pivot: this.guideAssetPivotService,
        feedback: this.feedbackService,
        protocol_template: this.protocolTemplateService,
        protocol: this.protocolService,
        protocol_default: this.protocolDefaultService,
        workflow: this.workflowService,
        workflow_step: this.workflowStepService
    };

    isStartSyncBehaviorSubject: BehaviorSubject<boolean>;
    syncedItemsCount: BehaviorSubject<number>;
    syncProgressStatus: BehaviorSubject<string>;
    syncedItemsPercent: BehaviorSubject<number>;
    syncAllItemsCount: BehaviorSubject<number>;
    isPrepareSynData: BehaviorSubject<boolean>;
    noDataForSync: BehaviorSubject<boolean>;
    isAvailableForSyncData: BehaviorSubject<boolean>;

    /// push
    private isBusyPush: boolean = false;
    isStartPushBehaviorSubject: BehaviorSubject<boolean>;
    isStartPushDataBehaviorSubject: BehaviorSubject<boolean>;
    pushedItemsCount: BehaviorSubject<number>;
    pushedItemsPercent: BehaviorSubject<number>;
    pushProgressStatus: BehaviorSubject<string>;
    isAvailableForPushData: BehaviorSubject<boolean>;
    pushedItemsCountNumber = 0;
    countOfAllChangedItems = 0;

    apiPushServices: any = {
        feedback: this.feedbackService,
        protocol: this.protocolService,
        protocol_default: this.protocolDefaultService
    };

    /**
     * ApiSync Constructor
     */
    constructor(
        public http: HttpClient,
        private platform: Platform,
        private db: DbProvider,
        private events: Events,
        private downloadService: DownloadService,
        private network: Network,
        private appSetting: AppSetting,
        private userService: UserService,
        /// sync services injection
        private guideService: GuiderService,
        private guideCategoryService: GuideCategoryService,
        private guideCategoryBindingService: GuideCategoryBindingService,
        private guideStepService: GuideStepService,
        private guideAssetService: GuideAssetService,
        private guideAssetPivotService: GuideAssetPivotService,
        private feedbackService: FeedbackService,
        private workflowService: WorkflowService,
        private workflowStepService: WorkflowStepService,
        private protocolTemplateService: ProtocolTemplateService,
        private protocolService: ProtocolService,
        private protocolDefaultService: ProtocolDefaultService
    ) {
        this.isStartSyncBehaviorSubject = new BehaviorSubject<boolean>(false);
        this.syncedItemsCount = new BehaviorSubject<number>(0);
        this.syncAllItemsCount = new BehaviorSubject<number>(0);
        this.syncedItemsPercent = new BehaviorSubject<number>(0);
        this.syncProgressStatus = new BehaviorSubject<string>('initial');
        this.isPrepareSynData = new BehaviorSubject<boolean>(false);
        this.noDataForSync = new BehaviorSubject<boolean>(false);
        this.isAvailableForSyncData = new BehaviorSubject<boolean>(false);

        ///push
        this.isStartPushBehaviorSubject = new BehaviorSubject<boolean>(false);
        this.isStartPushDataBehaviorSubject = new BehaviorSubject<boolean>(false);
        this.isAvailableForPushData = new BehaviorSubject<boolean>(false);
        this.pushedItemsCount = new BehaviorSubject<number>(0);
        this.pushedItemsPercent = new BehaviorSubject<number>(0);
        this.pushProgressStatus = new BehaviorSubject<string>('initial');

        this.init();
        this.initializeEvents();
    }

    initializeEvents() {
        this.events.subscribe('UserDb:create', (userDb) => {
            this.userService.userDb = userDb;
        });
        this.events.subscribe('UserDb:update', (userDb) => {
            this.userService.userDb = userDb;
        });
    }

    /**
     * Loads the current logged in user.
     */
    private init(): Promise<any> {
        return new Promise(resolve => {
            this.userService.getUser().then(userDb => {
                if (userDb) {
                    this.userService.userDb = userDb;
                    if (
                        this.userService.userDb.userSetting.syncStatus &&
                        (
                          this.syncProgressStatus.getValue() !== 'progress' &&
                          this.syncProgressStatus.getValue() !== 'resume' &&
                          this.syncProgressStatus.getValue() !== 'not_sync'
                        )
                    ) {
                      this.syncProgressStatus.next(this.userService.userDb.userSetting.syncStatus);
                    }
                    if (this.userService.userDb.userSetting.syncPercent) {
                      this.syncedItemsPercent.next(this.userService.userDb.userSetting.syncPercent);
                    }
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    private getUTCDate(date: Date) {
        date.setTime(date.getTime());

        return date;
    }

    private willMakeCancel(): boolean {
      return this.syncProgressStatus.getValue() === 'not_sync';
    }

    public syncMustBeEnd(): boolean {
        if (this.isOffNetwork()) {
            return true;
        }
        if (this.willMakeCancel()) {
            this.isStartSyncBehaviorSubject.next(false);
            this.isPrepareSynData.next(false);
            this.isBusy = false;

            return true;
        }
        if (this.syncProgressStatus.getValue() === 'pause') {
            this.isStartSyncBehaviorSubject.next(false);
            this.isPrepareSynData.next(false);
            this.isBusy = false;

            return true;
        }

        return false;
    }

    /**
     * Pulls records from remote API and stores into local db.
     *
     * @returns {Promise<T>}
     */
    public pull(status = 'progress'): Promise<any> {
        return new Promise(async (resolve) => {
            if (!this.appSetting.isMigratedDatabase()) {
                resolve(false);
                return;
            }
            if (this.isOffNetwork() || this.isBusy) {
                resolve(false);
                return;
            }
            this.isBusy = true;
            this.syncProgressStatus.next(status);
            this.isPrepareSynData.next(true);
            if (this.syncMustBeEnd()) {
                resolve(false);
                return;
            }
            try {
                const data = await this.http.get(this.getSyncUrl()).toPromise();
                if (!data.syncProcessId) {
                    this.failSync('There was no property syncProcessId in the response');
                    resolve(false);
                    return;
                }
                this.userService.userDb.userSetting.lastSyncProcessId = data.syncProcessId;
                await this.userService.userDb.save();
                this.syncData = await this.prepareDataForSavingSyncData(data);
                if (!this.syncData) {
                    this.isAvailableForSyncData.next(false);
                    resolve(false);
                }
                const isSavedSyncData = this.saveModels(this.syncData);
                if (isSavedSyncData) {
                    this.userService.userDb.userSetting.appDataVersion = data.version;
                    await this.userService.userDb.save();
                }
                resolve(isSavedSyncData);
            } catch (err) {
                this.failSync(err);
                resolve(false);
                return;
            }
        });
    }

    protected async prepareDataForSavingSyncData(dataFromApi) {
        console.log('prepareDataForSavingSyncDataprepareDataForSavingSyncData', dataFromApi);
        const data = dataFromApi.models;
        let countOfSyncedData = 0;
        for (const key of Object.keys(data)) {
            countOfSyncedData += data[key].length;
        }
        if (this.syncProgressStatus.getValue() === 'resume') {
            if (!countOfSyncedData || countOfSyncedData < this.userService.userDb.userSetting.syncLastElementNumber) {
                this.unsetSyncProgressData().then(() => {
                    this.userService.userDb.userSetting.lastSyncedAt = new Date();
                    this.userService.userDb.save();
                });
                this.isBusy = false;

                return false;
            }
            if (countOfSyncedData !== this.userService.userDb.userSetting.syncAllItemsCount) {
                this.userService.userDb.userSetting.syncPercent = Math.round(
                    (this.userService.userDb.userSetting.syncLastElementNumber / countOfSyncedData) * 100
                );
            }
        }
        if (countOfSyncedData === 0) {
            this.isStartSyncBehaviorSubject.next(false);
            this.syncProgressStatus.next('success');
            this.userService.userDb.userSetting.syncStatus = 'success';
            this.userService.userDb.userSetting.lastSyncedAt = new Date();
            this.userService.userDb.save();
            this.isBusy = false;
            this.noDataForSync.next(true);

            return false;
        }
        this.noDataForSync.next(false);
        this.userService.userDb.userSetting.syncAllItemsCount = countOfSyncedData;
        await this.userService.userDb.save();
        this.syncAllItemsCount.next(this.userService.userDb.userSetting.syncAllItemsCount);

        if (this.syncProgressStatus.getValue() === 'progress') {
            this.userService.userDb.userSetting.syncPercent = 0;
            this.userService.userDb.userSetting.syncLastElementNumber = 0;
            this.syncedItemsCount.next(this.userService.userDb.userSetting.syncLastElementNumber);
            this.syncAllItemsCount.next(this.userService.userDb.userSetting.syncAllItemsCount);
            this.syncedItemsPercent.next(this.userService.userDb.userSetting.syncPercent);
        }
        this.isStartSyncBehaviorSubject.next(true);

        return data;
    }

    private async saveModels(data) {
        let savedDataCount = 0;
        for (const key of Object.keys(data)) {
            if (this.syncMustBeEnd()) {
                return false;
            }
            const apiService = this.apiServices[key];
            if (!apiService) {
                continue;
            }
            for (const model of data[key]) {
                if (this.isPrepareSynData.getValue() === true && this.syncProgressStatus.getValue() !== 'resume') {
                    this.isPrepareSynData.next(false);
                }
                if (this.syncMustBeEnd()) {
                    return false;
                }
                await this.saveModel(apiService, model);
                if (this.syncMustBeEnd()) {
                    return false;
                }
                if (this.userService.userDb.userSetting.syncAllItemsCount === 0) {
                    this.failSync('this.userService.userDb.userSetting.syncAllItemsCount is 0');
                    return false;
                }
                savedDataCount++;
                if (this.syncProgressStatus.getValue() === 'resume' &&
                    savedDataCount <= this.userService.userDb.userSetting.syncLastElementNumber) {
                    continue;
                }
                if (this.isPrepareSynData.getValue() === true &&
                    this.syncProgressStatus.getValue() === 'resume' &&
                    savedDataCount > this.userService.userDb.userSetting.syncLastElementNumber
                ) {
                    this.isPrepareSynData.next(false);
                }
                await this.saveSyncProgress().then(() => {
                    return true;
                });
            }
        }
    }

    private saveSyncProgress(): Promise<boolean> {
        this.userService.userDb.userSetting.syncLastElementNumber++;
        this.syncedItemsCount.next(this.userService.userDb.userSetting.syncLastElementNumber);
        this.userService.userDb.userSetting.syncPercent = Math.round(
            (this.userService.userDb.userSetting.syncLastElementNumber / this.userService.userDb.userSetting.syncAllItemsCount) * 100
        );
        this.syncedItemsPercent.next(this.userService.userDb.userSetting.syncPercent);

        if (this.isAllItemsSynced()) {
            this.syncProgressStatus.next('success');
            this.isStartSyncBehaviorSubject.next(false);
            this.isAvailableForSyncData.next(false);
            this.userService.userDb.userSetting.lastSyncedAt = new Date();
            this.userService.userDb.userSetting.syncStatus = 'success';
            this.userService.userDb.userSetting.isSyncAvailableData = false;
            console.log('is all items synced');
        }

        return this.userService.userDb.save().then(() => {
            this.sendSyncProgress();
            if (this.isAllItemsSynced()) {
                this.isBusy = false;

                return true;
            }
        });
    }

    public checkAvailableChanges() {
        return new Promise(async resolve => {
            await this.init();
            if (this.isAvailableForSyncData.getValue()) {
                resolve(true);
                return;
            }
            if (this.network.type === 'none') {
                resolve(false);
                return;
            }
            this.http.get(this.getSyncUrl(true)).subscribe(async (response) => {
                const isAvailableData = !!response.result;
                this.isAvailableForSyncData.next(isAvailableData);
                this.userService.userDb.userSetting.isSyncAvailableData = isAvailableData;
                this.userService.userDb.save();
                resolve(isAvailableData);
                return;
            }, (err) => {
                this.isAvailableForSyncData.next(false);
                resolve(false);
                return;
            });
        });
    }

    public isAllItemsSynced(): boolean {
        return this.syncAllItemsCount.getValue() !== 0 && this.syncedItemsCount.getValue() !== 0 &&
            this.syncAllItemsCount.getValue() === this.syncedItemsCount.getValue();
    }

    private async failSync(error?: string) {
        this.syncProgressStatus.next('failed');
        this.userService.userDb.userSetting.syncStatus = 'failed';
        this.userService.userDb.userSetting.lastSyncProcessId = null;
        await this.userService.userDb.save();
        this.sendSyncProgress(error);
        this.isStartSyncBehaviorSubject.next(false);
        this.isBusy = false;
    }

    public sendSyncProgress(description?: string, isCancel = false) {
        return new Promise(resolve => {
            if (!this.userService.userDb.userSetting.lastSyncProcessId || this.network.type === 'none') {
                resolve(false);
                return;
            }
            let url = this.appSetting.getApiUrl() + '/sync/save-progress';
            url += '?syncProcessId=' + this.userService.userDb.userSetting.lastSyncProcessId;

            let data = null;
            if (isCancel) {
                data = {
                    id: this.userService.userDb.userSetting.lastSyncProcessId,
                    uuid: this.http.deviceInfo.uuid,
                    status: 'cancel'
                };
            } else {
                data = this.getSyncProcessInfo();
                if (description) {
                    data.description = description;
                }
            }

            this.http.post(url, data).subscribe((response) => {
                resolve(true);
                return;
            }, (err) => {
                resolve(false);
                return;
            });
        });
    }

    public getSyncProcessInfo() {
        return {
            id: this.userService.userDb.userSetting.lastSyncProcessId,
            uuid: this.http.deviceInfo.uuid,
            progress: this.userService.userDb.userSetting.syncPercent,
            all_items_count: this.userService.userDb.userSetting.syncAllItemsCount,
            synced_items_count: this.userService.userDb.userSetting.syncLastElementNumber,
            status: this.userService.userDb.userSetting.syncStatus,
            description: null
        };
    }

    private getSyncUrl(isCheckAvailableData = false): string {
        let url = this.appSetting.getApiUrl() + '/sync';

        if (isCheckAvailableData) {
            url += '/check-available-data';
            if (this.userService.userDb.userSetting.appDataVersion) {
                url += '?appDataVersion=' + this.userService.userDb.userSetting.appDataVersion;
            }

            return url;
        }

        if (this.userService.userDb.userSetting.lastSyncedAt) {
            // Need to recast the saved date to get the ISOString, which will give us the correct offset to sync with the ser
            const lastUpdatedAt = this.getUTCDate(new Date(this.userService.userDb.userSetting.lastSyncedAt));
            url += '?lastUpdatedAt=' + lastUpdatedAt.toISOString();
        }
        if (!isCheckAvailableData && this.userService.userDb.userSetting.lastSyncProcessId) {
            url += !this.userService.userDb.userSetting.lastSyncedAt ? '?' : '&';
            url += 'syncProcessId=' + this.userService.userDb.userSetting.lastSyncProcessId;
        }

        return url;
    }

    async saveModel(apiService, newModel) {
        return apiService.saveSyncedModel(newModel);
    }

    public isOffNetwork(): boolean {
        if (this.network.type === 'none') {
            this.makeSyncPause().then(() => {
                this.isBusy = false;
            });

            return true;
        }

        return false;
    }

    public makeSyncPause() {
        return new Promise((resolve) => {
            this.isStartSyncBehaviorSubject.next(false);
            this.syncProgressStatus.next('pause');
            this.userService.userDb.userSetting.syncStatus = 'pause';
            this.isPrepareSynData.next(false);
            this.userService.userDb.save().then(() => {
                this.sendSyncProgress();
                resolve(true);
            });
        });
    }

    public makeSyncProcess(syncStatus = 'progress') {
        return new Promise(async resolve => {
            const data = await this.init();
            if (!data) {
                this.isStartSyncBehaviorSubject.next(false);
                resolve(false);
                return;
            }
            if (this.isOffNetwork() || this.isBusy) {
                resolve(false);
                return;
            }
            if (!this.userService.userDb.userSetting.isSyncAvailableData) {
                this.noDataForSync.next(true);
            } else {
                this.userService.userDb.userSetting.syncStatus = syncStatus;
                await this.userService.userDb.save();
                try {
                    await this.pull(syncStatus);
                } catch (err) {
                    this.isStartSyncBehaviorSubject.next(false);
                    resolve(false);
                }
            }
            await this.pushOneAtTime();
        });
    }

    public unsetSyncProgressData(): Promise<true> {
      return new Promise(resolve => {
        this.init().then((data) => {
          if (data && this.userService.userDb) {
            this.syncProgressStatus.next('not_sync');
            this.userService.userDb.userSetting.syncStatus = 'not_sync';
            this.syncedItemsPercent.next(0);
            this.userService.userDb.userSetting.syncPercent = 0;
            this.userService.userDb.userSetting.syncLastElementNumber = 0;
            this.userService.userDb.userSetting.syncAllItemsCount = 0;
            this.userService.userDb.userSetting.lastSyncProcessId = null;
            this.userService.userDb.save().then(() => {
                this.syncedItemsCount.next(this.userService.userDb.userSetting.syncLastElementNumber);
                this.syncAllItemsCount.next(this.userService.userDb.userSetting.syncAllItemsCount);
                resolve(true);
                return;
            });
          }
        });
      });
    }

    resetSyncedData(): Promise<any> {
        const apiSyncServicesPromises = [];
        Object.keys(this.apiServices).forEach((modelKey) => {
            const service: ApiService = this.apiServices[modelKey];
            const condition = [];
            if (service.dbModelApi.hasOwnProperty('user_id')) {
                condition.push(['user_id', this.userService.userDb.userId]);
            }
            apiSyncServicesPromises.push(service.dbModelApi.removeAll(condition));
        });

        return Promise.all(apiSyncServicesPromises);
    }

    /// push

    public setIsPushAvailableData(isAvailable: boolean) {
        this.userService.userDb.userSetting.isPushAvailableData = isAvailable;
        this.userService.userDb.save().then(() => {
            this.isAvailableForPushData.next(isAvailable);
        });
    }

    /**
     * Pushes not synced local records to remote api
     * and updates received primary keys in local db.
     *
     * @returns {Promise<any>}
     */
    public pushOneAtTime(): Promise<any> {
        this.isStartPushBehaviorSubject.next(true);
        return new Promise(async resolve => {
            if (this.isOffNetwork()) {
                resolve(false);

                return;
            }
            if (this.isBusyPush) {
                resolve(false);

                return;
            }

            this.isBusyPush = true;

            // iterate over all services
            let allServicesBodies = {};
            const bodiesBatchAllPromises = [];
            for (const key of Object.keys(this.apiPushServices)) {
                // get registered api service for the current model
                const service: ApiService = this.apiPushServices[key];
                const bodies = await service.prepareBatchPost();
                if (bodies && bodies.length > 0) {
                    const modelBody = {};
                    modelBody[key] = bodies;
                    allServicesBodies = {...allServicesBodies, ...modelBody};
                    this.countOfAllChangedItems += modelBody[key].length;
                }
            }

            this.pushedItemsCountNumber = 0;
            this.countOfAllChangedItems = 0;

            console.log('allServicesBodies');
            if (Object.keys(allServicesBodies).length === 0) {
                this.isStartPushBehaviorSubject.next(false);
                this.pushProgressStatus.next('no_push_data');
                this.setIsPushAvailableData(false);
                this.isBusyPush = false;
                resolve(false);
                return;
            }
            this.isStartPushBehaviorSubject.next(false);
            this.pushProgressStatus.next('progress');
            this.isBusyPush = true;
            console.log('allServicesBodies', allServicesBodies);
            for (const modelKey of Object.keys(allServicesBodies)) {
                console.log('modelKeymodelKey', modelKey);
                const service: ApiService = this.apiPushServices[modelKey];
                const url = this.appSetting.getApiUrl() + service.loadUrl + '/batch';

                for (const model of allServicesBodies[modelKey]) {
                    if (!model) {
                        continue;
                    }
                    const isPushedData = await this.pushDataToServer(url, model, service);
                    if (!isPushedData) {
                        this.isStartPushBehaviorSubject.next(false);
                        this.pushProgressStatus.next('failed');
                        this.isBusyPush = false;

                        resolve(false);
                    }
                }
            }
            console.log('end push');
            this.isStartPushBehaviorSubject.next(false);
            this.pushProgressStatus.next('success');
            this.isBusyPush = false;
            this.setIsPushAvailableData(false);
            resolve(true);

            this.isBusyPush = false;
            resolve(true);
            console.log('resolver');
            return;
        });
    }

    private pushDataToServer(url, model, service) {
        return new Promise(async resolve => {
            if (this.pushProgressStatus.getValue() === 'failed') {
                this.isBusyPush = false;
                resolve(false);
                return;
            }

            const isInsert = !!!model.idApi;
            await model.beforePushDataToServer(isInsert);

            const jsonBody = JSON.stringify(model.getBodyJson());

            return this.http.post(url, jsonBody)
                .toPromise()
                .then(async (data) => {
                    console.log('push data to server');
                    if (this.pushProgressStatus.getValue() === 'failed') {
                        this.isBusyPush = false;
                        resolve(false);
                        return;
                    }
                    // search error
                    let isError = false;
                    Object.keys(data).forEach((key) => {
                        const recordResponse = data[key];
                        if (recordResponse.errors) {
                            console.log('recordResponse.errors', recordResponse.errors);
                            isError = true;
                        }
                    });
                    console.log('is errorrr', isError);
                    if (isError) {
                        this.isStartPushBehaviorSubject.next(false);
                        this.isBusyPush = false;
                        resolve(false);
                        return;
                    }
                    const record = data[0];
                    // get model by local id and update received primary key from api
                    try {
                        const dbModel = await service.dbModelApi.findById(record._id, true);
                        if (!dbModel) {
                            resolve(false);
                            return;
                        }
                        if (dbModel.deleted_at || dbModel.local_deleted_at) {
                            dbModel.remove().then(async () => {
                                this.userService.userDb.userSetting.appDataVersion++;
                                await this.userService.userDb.save();
                            });
                            this.pushedItemsCountNumber++;
                            const savedDataPercent = Math.round((this.pushedItemsCountNumber / this.countOfAllChangedItems) * 100);
                            this.pushedItemsCount.next(this.pushedItemsCountNumber);
                            this.pushedItemsPercent.next(savedDataPercent);
                            resolve(true);
                            return;
                        }
                        const dbModelApi = dbModel as DbApiModel;
                        dbModelApi.idApi = record[dbModelApi.apiPk];
                        dbModelApi.updateCondition = [[dbModelApi.COL_ID, record._id]];
                        console.log('before save in push');
                        await dbModelApi.save(
                            false,
                            true,
                            dbModelApi.COL_ID + '=' + record._id,
                            false
                        );
                        console.log('after save in push');
                        this.userService.userDb.userSetting.appDataVersion++;
                        await this.userService.userDb.save();
                        console.log('push files');
                        await service.pushFiles(dbModel, this.userService.userDb);
                        console.log('after push files');
                        this.pushedItemsCountNumber++;
                        const savedDataPercent = Math.round((this.pushedItemsCountNumber / this.countOfAllChangedItems) * 100);
                        this.pushedItemsCount.next(this.pushedItemsCountNumber);
                        this.pushedItemsPercent.next(savedDataPercent);

                        console.log('push model', dbModelApi);
                        const additionalModelsForPushDataToServer = await dbModelApi.afterPushDataToServer(isInsert);

                        console.log('additionalModelsForPushDataToServer', additionalModelsForPushDataToServer);

                        for (let i = 0; i < additionalModelsForPushDataToServer.length; i++) {
                            const additionalModel = additionalModelsForPushDataToServer[i];
                            const urlForAddtinoalPush = this.appSetting.getApiUrl() + additionalModel.loadUrl + '/batch';
                            const isPushedData = await this.pushDataToServer(
                                urlForAddtinoalPush,
                                additionalModelsForPushDataToServer[i],
                                service
                            );
                            if (!isPushedData) {
                                this.isStartPushBehaviorSubject.next(false);
                                this.pushProgressStatus.next('failed');
                                this.isBusyPush = false;

                                resolve(false);
                                return;
                            }
                        }

                        resolve(true);
                    } catch (e) {
                        this.isStartPushBehaviorSubject.next(false);
                        this.pushProgressStatus.next('failed');
                        this.isBusyPush = false;
                        resolve(false);
                    }
                });
        });
    }
}

