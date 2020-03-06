import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Events, ModalController, NavController} from '@ionic/angular';
import {FeedbackService} from '../../providers/api/feedback-service';
import {FeedbackModel} from '../../models/db/api/feedback-model';
import {AuthService} from '../../services/auth-service';
import {DownloadService} from '../../services/download-service';
import {StreamingMedia} from '@ionic-native/streaming-media/ngx';
import {PhotoViewer} from '@ionic-native/photo-viewer/ngx';
import {ActivatedRoute, NavigationExtras, Router} from '@angular/router';

@Component({
  selector: 'feedback-page',
  templateUrl: 'feedback.page.html',
  styleUrls: ['feedback.page.scss']
})
export class FeedbackPage implements OnInit {
    public backDefaultHref: string;
    public reference_id: number = null;
    public reference_model: string = null;
    public reference_model_alias: string = null;
    public feedbackList: FeedbackModel[] = [];
    public isComponentLikeModal = false;

    constructor(private feedbackService: FeedbackService,
                private modalController: ModalController,
                public events: Events,
                public authService: AuthService,
                public changeDetectorRef: ChangeDetectorRef,
                private downloadService: DownloadService,
                private activatedRoute: ActivatedRoute,
                private streamingMedia: StreamingMedia,
                private photoViewer: PhotoViewer,
                private navCtrl: NavController,
                private router: Router) {
    }

    public async setModels()  {
        const user = await this.authService.getLastUser();
        if (!user) {
            return;
        }
        const feedbackSearchCondition = [['user_id', user.userId], 'deleted_at IS NULL', 'local_deleted_at IS NULL'];
        if (this.reference_id && this.reference_model) {
            feedbackSearchCondition.push(['reference_model', this.reference_model]);
            feedbackSearchCondition.push(['reference_id', this.reference_id]);
        }
        this.feedbackList = await this.feedbackService.dbModelApi.findAllWhere(
            feedbackSearchCondition,
            'local_created_at DESC, created_at DESC, ' + this.feedbackService.dbModelApi.COL_ID + ' DESC'
        );
    }

    public openFile(basePath: string, modelName: string, title?: string) {
        const filePath = basePath;
        if (filePath.indexOf('.MOV') > -1 || filePath.indexOf('.mp4') > -1) {
            this.streamingMedia.playVideo(
                this.downloadService.getNativeFilePath(basePath, modelName),
            );
        } else if (filePath.indexOf('.jpg') > -1 || filePath.indexOf('.png') > -1) {
            let photoTitle = 'Feedback';
            if (title) {
                photoTitle = title;
            }
            this.photoViewer.show(this.downloadService.getNativeFilePath(basePath, modelName), photoTitle);
        }
    }

    dismiss() {
        if (this.reference_model_alias && this.reference_id) {
            this.navCtrl.navigateRoot(this.reference_model_alias + '/' + this.reference_id);
        }
    }

    detectChanges() {
        if (!this.changeDetectorRef['destroyed']) {
            this.changeDetectorRef.detectChanges();
        }
    }

    itemHeightFn(item, index) {
        return 79;
    }

    trackByFn(index, item) {
        return item.id;
    }

    openAddEditPage(feedbackId?: number) {
        const feedbackNavigationExtras: NavigationExtras = {
            queryParams: {
                feedbackId,
                // backUrl: this.router.url,
                referenceModelAlias: this.reference_model_alias,
                referenceId: this.reference_id
            }
        };
        this.router.navigate(['/feedback/save/' + feedbackId], feedbackNavigationExtras);
    }

    ngOnInit() {
        this.activatedRoute.queryParams.subscribe(params => {
            const feedbackData = params;
            this.reference_id = +feedbackData.referenceId;
            this.reference_model_alias = feedbackData.referenceModelAlias;
            this.reference_model = this.feedbackService.dbModelApi.getReferenceModelByAlias(this.reference_model_alias);
            if (this.reference_model) {
                this.isComponentLikeModal = true;
            }
            this.backDefaultHref = feedbackData.backUrl;
            this.setModels();
        });

        this.events.subscribe(this.feedbackService.dbModelApi.TAG + ':create', (model) => {
            this.setModels();
            this.detectChanges();
        });
        this.events.subscribe(this.feedbackService.dbModelApi.TAG + ':update', (model) => {
            this.setModels();
            this.detectChanges();
        });
    }
}
