import { NgModule } from '@angular/core';
import {SynchronizationComponent} from './synchronization-component';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';

@NgModule({
  declarations: [
    SynchronizationComponent,
  ],
  imports: [
    CommonModule,
    IonicModule,
  ],
  exports: [
    SynchronizationComponent
  ]
})
export class SynchronizationComponentModule {}
