import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ColisDeposePage } from './colis-depose';
import { MouvementFilterModule } from '../../../pipes/mouvement-filter.module';
@NgModule({
  declarations: [
    ColisDeposePage,
  ],
  imports: [
    IonicPageModule.forChild(ColisDeposePage),
    MouvementFilterModule
  ],
  exports: [
    ColisDeposePage
  ]
})
export class ColisDeposePageModule { }
